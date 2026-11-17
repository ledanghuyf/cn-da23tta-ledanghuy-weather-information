const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const fixture=require('./weather-fixture.cjs');
const context=vm.createContext({Intl,Date});
for(const file of ['weather-config.js','weather-theme.js','recommendations.js','dashboard.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/js',file),'utf8'),context);
const {MayAdvice:advice,MayTheme:theme}=context;
const ids=data=>Array.from(advice.currentAdvice(data),item=>item.id);
test('Bảng giờ: 24 giờ tới, qua ngày theo địa phương, chọn ngày cuối đúng 24 mốc',()=>{
  const d=fixture();let rows=context.MayDashboardData.hours(d);assert.equal(rows.length,24);assert.equal(rows[0].time,'2026-10-09T15:00');assert.equal(rows[23].time,'2026-10-10T14:00');
  rows=context.MayDashboardData.hours(d,'2026-10-15');assert.equal(rows.length,24);assert.ok(rows.every(row=>row.time.startsWith('2026-10-15')));
  assert.equal(context.MayDashboardData.hours(d,'2026-02-30').length,0);
});
test('Bảng giờ không biến null/sai đơn vị/mảng lệch thành số liệu',()=>{
  const d=fixture();d.hourly.temperature_2m=Array(168).fill(30);d.hourly_units.temperature_2m='°C';
  assert.equal(context.MayDashboardData.hours(d)[0].temperature_2m,30);
  d.hourly.temperature_2m[15]=null;assert.equal(context.MayDashboardData.hours(d)[0].temperature_2m,null);
  d.hourly_units.temperature_2m='°F';assert.equal(context.MayDashboardData.hours(d)[1].temperature_2m,null);
  d.hourly.wind_speed_10m.pop();assert.equal(context.MayDashboardData.hours(d)[0].wind_speed_10m,null);
});
test('Mặt trời lấy ngày/giờ API, hỗ trợ đêm cực và dữ liệu thiếu',()=>{
  const d=fixture();d.daily={time:['2026-10-09'],sunrise:['2026-10-09T05:42'],sunset:['2026-10-09T17:41'],daylight_duration:[43140]};d.daily_units={sunrise:'iso8601',sunset:'iso8601',daylight_duration:'s'};
  const s=context.MayDashboardData.sun(d,'2026-10-09');assert.equal(s.rise,'2026-10-09T05:42');assert.equal(s.seconds,43140);
  d.daily.sunrise[0]=null;d.daily.sunset[0]='2026-10-10T17:41';d.daily.daylight_duration[0]=0;
  const missing=context.MayDashboardData.sun(d,'2026-10-09');assert.equal(missing.rise,null);assert.equal(missing.set,null);assert.equal(missing.seconds,0);
});
test('Chỉ số bổ sung đúng miền và hướng gió khớp góc',()=>{
  const d=fixture();d.current_units.visibility='m';d.current.visibility=10000;assert.equal(context.MayDashboardData.value(d,'current','visibility'),10000);
  d.current.visibility=-1;assert.equal(context.MayDashboardData.value(d,'current','visibility'),null);
  for(const [angle,name] of [[0,'Bắc'],[90,'Đông'],[180,'Nam'],[270,'Tây'],[360,'Bắc']])assert.equal(context.MayDashboardData.direction(angle),name);
  assert.equal(context.MayDashboardData.direction(null),null);
});
test('Điểm cần chú ý: mưa, cảm nhận lệch, UV, gió giật; yên khi không có gì; không kết luận khi thiếu dữ liệu',()=>{
  const h=d=>Array.from(context.MayDashboardData.highlights(d),i=>i.title);
  let d=fixture();assert.deepEqual(h(d),['12 giờ tới khá yên']);
  d.hourly.precipitation_probability[17]=70;d.current.apparent_temperature=33;d.hourly.uv_index[16]=8.4;
  d.current_units.wind_gusts_10m='km/h';d.current.wind_gusts_10m=45;
  assert.deepEqual(h(d),['Có thể mưa lúc 17:00','Cảm giác nóng hơn 8°','UV rất cao (8,4)']);
  d.current.precipitation=1.2;assert.equal(h(d)[0],'Đang có mưa');
  d=fixture();d.hourly_units.precipitation_probability='mm';assert.deepEqual(h(d),[]);
  d=fixture();d.current.weather_code=61;assert.equal(h(d)[0],'Đang có mưa');d.current.weather_code=95;assert.equal(h(d)[0],'Đang có giông');
  // Không khí: >100 thì cảnh báo và không còn "khá yên"; <=100 hoặc chưa có thì bỏ qua.
  const ha=(d,air)=>Array.from(context.MayDashboardData.highlights(d,air),i=>i.title);
  d=fixture();assert.deepEqual(ha(d,{aqi:162,label:'Không tốt'}),['Không khí không tốt (AQI 162)']);
  assert.deepEqual(ha(d,{aqi:100,label:'Trung bình'}),['12 giờ tới khá yên']);assert.deepEqual(ha(d,{aqi:null,label:'Chưa có chỉ số'}),['12 giờ tới khá yên']);
  assert.equal(context.MayDashboardData.feelsGap(27.4,34.5),8);assert.equal(context.MayDashboardData.feelsGap(29.6,31),0);assert.equal(context.MayDashboardData.feelsGap(20,16.6),-3);
  assert.equal(context.MayDashboardData.uvLevel(5.9),'Trung bình');assert.equal(context.MayDashboardData.uvLevel(11),'Cực cao');
});
test('Chọn ngày khác lấy đúng ngày ngoài 24h và hỗ trợ ngày cuối dự báo',()=>{
  const d=fixture();
  for(const day of ['2026-10-10','2026-10-12','2026-10-15']){
    const r=advice.chooseSlots(d,'walk',day);assert.equal(r.slots.length,3);
    for(const slot of r.slots){assert.equal(slot.start.slice(0,10),day);assert.equal(slot.end.slice(0,10),day);}
  }
  assert.equal(advice.chooseSlots(d,'walk','2026-10-16').status,'missing');
});
test('Chọn hôm nay bỏ giờ đã qua; ngày lỗi hoặc quá khứ không sinh gợi ý',()=>{
  const d=fixture();const r=advice.chooseSlots(d,'walk','2026-10-09');
  assert.ok(r.slots.length>0);for(const slot of r.slots)assert.ok(slot.start>=d.current.time);
  for(const day of ['2026-02-30','2026-10-08','not-a-date'])assert.equal(advice.chooseSlots(d,'walk',day).slots.length,0);
});
test('Lý do không chọn giờ bám dữ liệu ban ngày, không quy mưa đêm sang ban ngày',()=>{
  const d=fixture();d.hourly.apparent_temperature.fill(34);
  d.hourly.weather_code=d.hourly.is_day.map(day=>day?0:95);
  const r=advice.chooseSlots(d);assert.equal(r.status,'ok');assert.equal(r.slots[0].level,'caution');assert.match(r.reasons.join(' '),/34°C/);assert.doesNotMatch(r.reasons.join(' '),/giông/);
  d.hourly.weather_code.fill(61);assert.match(advice.chooseSlots(d).reasons.join(' '),/Dự báo có mưa/);
});
test('Không có ban ngày hoặc thiếu dữ liệu được giải thích riêng, không đổ lỗi thời tiết',()=>{
  const d=fixture();d.hourly.is_day.fill(0);assert.match(advice.chooseSlots(d).reasons.join(' '),/Chưa có khung đủ một giờ ban ngày/);
  delete d.hourly;assert.equal(advice.chooseSlots(d).reasons.length,0);assert.equal(advice.chooseSlots(d).status,'missing');
});
test('Nóng/lạnh dựa trên nhiệt độ cảm nhận, ngưỡng bao gồm biên',()=>{
  const d=fixture();d.current.apparent_temperature=32;assert.ok(ids(d).includes('heat'));
  d.current.apparent_temperature=18;assert.ok(ids(d).includes('cold'));assert.ok(!ids(d).includes('heat'));
});
test('Mưa, xác suất cao, giông 95/96/97/99, gió và UV',()=>{
  const d=fixture();d.current.precipitation_probability=60;assert.ok(ids(d).includes('rain-risk'));
  for(const code of [51,61,65,82]){d.current.weather_code=code;assert.ok(ids(d).includes('rain'));}
  for(const code of [95,96,97,99]){d.current.weather_code=code;assert.ok(ids(d).includes('storm'));}
  d.current.wind_speed_10m=30;d.current.uv_index=6;assert.ok(ids(d).includes('wind'));assert.ok(ids(d).includes('uv'));
});
test('Thiếu dữ liệu/đơn vị sai không sinh số liệu hoặc gợi ý vô căn cứ',()=>{
  const d=fixture();d.current={};assert.equal(ids(d).length,0);
  d.current={apparent_temperature:40,wind_speed_10m:null,precipitation_probability:101};d.current_units.apparent_temperature='°F';assert.equal(ids(d).length,0);
  d.current.weather_code=61;assert.deepEqual(ids(d),['rain']);
});
test('Tối đa 3 khung một giờ, trong 24h, ban ngày ở cả hai đầu, không lấy giờ đã qua',()=>{
  const d=fixture();const result=advice.chooseSlots(d);assert.equal(result.slots.length,3);
  const now=advice.localStamp(d.current.time);let end=now;
  for(const slot of result.slots){assert.ok(slot.stamp>=now&&slot.stamp>=end);end=advice.localStamp(slot.end);assert.equal(end-slot.stamp,3600000);assert.ok(end<=now+86400000);}
  assert.equal(result.slots[0].start,'2026-10-09T15:00');assert.equal(result.incomplete,false);
});
test('Loại toàn bộ giờ giông, mưa lớn, gió mạnh, mã lạ, sương mù và tuyết',()=>{
  for(const code of [65,67,82,95,96,97,99,45,71,123]){const d=fixture();d.hourly.weather_code.fill(code);assert.equal(advice.chooseSlots(d).slots.length,0);}
  const d=fixture();d.hourly.wind_speed_10m.fill(30);assert.equal(advice.chooseSlots(d).status,'none');
});
test('Kiểm tra cả cuối giờ để không đề xuất khung bắt đầu tốt nhưng kết thúc giông',()=>{
  const d=fixture();d.hourly.weather_code=d.hourly.weather_code.map((_,i)=>i%2?0:95);assert.equal(advice.chooseSlots(d).slots.length,0);
});
test('Mức ưu tiên riêng từng hoạt động; vượt mức thoải mái được ghi cần cân nhắc',()=>{
  let d=fixture();d.hourly.apparent_temperature.fill(29);assert.equal(advice.chooseSlots(d,'run').slots[0].level,'caution');assert.equal(advice.chooseSlots(d,'walk').slots[0].level,'favorable');
  for(const [key,value] of [['apparent_temperature',5],['apparent_temperature',35],['wind_speed_10m',25],['precipitation_probability',41],['uv_index',6]]){d=fixture();d.hourly[key].fill(value);const r=advice.chooseSlots(d);assert.equal(r.slots.length,3,key);assert.equal(r.slots[0].level,'caution',key);assert.ok(r.slots[0].notes.length);}
});
test('Cùng một khung giờ có kết quả riêng theo nhiệt, gió và mưa của từng hoạt động',()=>{
  const d=fixture();
  const levels=()=>['walk','run','cycle'].map(activity=>advice.chooseSlots(d,activity,'2026-10-12').allSlots[0].level);
  d.hourly.apparent_temperature.fill(24);
  assert.deepEqual(levels(),['favorable','favorable','favorable']);
  d.hourly.apparent_temperature.fill(35);
  assert.deepEqual(levels(),['caution','blocked','caution']);
  d.hourly.apparent_temperature.fill(24);d.hourly.wind_speed_10m.fill(25);
  assert.deepEqual(levels(),['caution','caution','blocked']);
  d.hourly.wind_speed_10m.fill(10);d.hourly.weather_code.fill(63);
  assert.deepEqual(levels(),['caution','caution','blocked']);
  d.hourly.weather_code.fill(95);
  assert.deepEqual(levels(),['blocked','blocked','blocked']);
});
test('Giới hạn loại trừ kiểm tra cả hai đầu; giờ bị loại vẫn có dữ liệu và lý do để xem',()=>{
  for(const [key,value] of [['apparent_temperature',38],['apparent_temperature',4.9],['wind_speed_10m',30],['uv_index',8],['weather_code',95],['weather_code',65],['weather_code',56]]){
    const d=fixture();d.hourly[key]=d.hourly[key].map((old,i)=>i%2?old:value);
    const r=advice.chooseSlots(d);assert.equal(r.slots.length,0,key);assert.ok(r.allSlots.length);for(const s of r.allSlots){assert.equal(s.level,'blocked');assert.ok(s.blockers.length);}
  }
});
test('Ưu tiên giờ thuận lợi trước giờ cần cân nhắc dù điểm số cao hơn',()=>{
  const d=fixture();d.hourly.precipitation_probability.fill(30);d.hourly.apparent_temperature.fill(30);
  for(let i=0;i<24;i++){d.hourly.weather_code[i]=61;d.hourly.precipitation_probability[i]=0;d.hourly.apparent_temperature[i]=23;}
  const r=advice.chooseSlots(d);assert.equal(r.slots.length,3);for(const slot of r.slots){assert.equal(slot.level,'favorable');assert.match(slot.start,/2026-10-10/);}
});
test('Không có dữ liệu giờ, mảng lệch, sai đơn vị, null không được hiểu là 0',()=>{
  let d=fixture();delete d.hourly;assert.equal(advice.chooseSlots(d).status,'missing');
  d=fixture();d.hourly.precipitation_probability.fill(null);assert.equal(advice.chooseSlots(d).status,'missing');
  d=fixture();d.hourly.wind_speed_10m.pop();assert.equal(advice.chooseSlots(d).status,'missing');
  d=fixture();d.hourly_units.wind_speed_10m='m/s';assert.equal(advice.chooseSlots(d).status,'missing');
});
test('UV thiếu vẫn minh bạch và không che bỏ UV cao ở đầu còn lại',()=>{
  const d=fixture();d.hourly.uv_index.fill(null);const result=advice.chooseSlots(d);assert.equal(result.slots.length,3);assert.equal(result.slots[0].uv,null);
  d.hourly.uv_index=d.hourly.uv_index.map((_,i)=>i%2?null:8);assert.equal(advice.chooseSlots(d).slots.length,0);
});
test('Không suy đoán ban ngày bằng giờ thiết bị; đêm cực hoặc thiếu is_day không có khung',()=>{
  const d=fixture();d.hourly.is_day.fill(0);assert.equal(advice.chooseSlots(d).status,'none');
  d.hourly.is_day.fill(null);assert.equal(advice.chooseSlots(d).status,'missing');
});
test('Thời gian lỗi, trùng hoặc thiếu giờ không ghép sai khung',()=>{
  const d=fixture();d.current.time='2026-02-30T12:00';assert.equal(advice.chooseSlots(d).status,'missing');
  d.current.time='2026-10-09T14:15';d.hourly.time.fill('2026-10-09T15:00');assert.equal(advice.chooseSlots(d).slots.length,0);
});
test('Ngày/đêm tách khỏi mưa/mây/giông; mã không biết có giao diện mặc định',()=>{
  // [mã, chủ đề ban đêm, chủ đề ban ngày]: mã 2 ban ngày là "Nhiều nắng" (nền xanh), ban đêm vẫn là mây.
  for(const [code,night,day1] of [[0,'sunny','sunny'],[1,'sunny','sunny'],[2,'cloudy','sunny'],[3,'cloudy','cloudy'],[61,'rain','rain'],[95,'storm','storm'],[97,'storm','storm']]){
    for(const day of [0,1]){const t=theme.select({weather_code:code,is_day:day});assert.equal(t.weather,day?day1:night);assert.equal(t.phase,day?'day':'night');}
  }
  // Ban ngày mã 3 dùng thời gian nắng: ≥50% nắng, 20–50% nắng xen mây, <20% (hoặc không có dữ liệu) nhiều mây; ban đêm và mưa không đổi.
  for(const [code,day,sec,weather] of [[3,1,800,'sunny'],[3,1,450,'sunny'],[3,1,300,'partly'],[3,1,100,'cloudy'],[3,1,undefined,'cloudy'],[3,1,1200,'cloudy'],[3,0,800,'cloudy'],[61,1,800,'rain'],[95,1,800,'storm']])
    assert.equal(theme.select({weather_code:code,is_day:day,sunshine_duration:sec,interval:900}).weather,weather,`mã ${code} ngày ${day} nắng ${sec}`);
  assert.equal(theme.select(null).scene,'default');assert.equal(theme.select({weather_code:999,is_day:1}).weather,'default');
});
test('Ranh giới Việt Nam: nhận cả miền Bắc, biên giới, đảo; loại Lào, Campuchia, Thái Lan, Trung Quốc',()=>{
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/js/vietnam-border.js'),'utf8'),context);
  const vn=context.MayVietnam;
  for(const [name,lat,lon] of [['Hà Nội',21.0245,105.84],['Sa Pa',22.34,103.84],['Lũng Cú',23.36,105.32],['A Pa Chải',22.4,102.15],['Móng Cái',21.53,107.97],['Vinh',18.67,105.69],['Mũi Cà Mau',8.6,104.72],['Phú Quốc',10.22,103.96],['Côn Đảo',8.68,106.61],['Lao Bảo',16.62,106.6],['Mộc Bài',11.07,106.18],['Châu Đốc',10.7,105.12],['Hà Tiên',10.38,104.48],['Bạch Long Vĩ',20.13,107.72],['Thổ Chu',9.29,103.47],['Lý Sơn',15.38,109.12],['Hoàng Sa',16.5,112],['Trường Sa',8.65,111.92]])
    assert.equal(vn.contains(lat,lon),true,`${name} phải thuộc Việt Nam`);
  for(const [name,lat,lon] of [['Viêng Chăn',17.97,102.6],['Luang Prabang',19.89,102.13],['Savannakhet',16.55,104.75],['Phonsavan',19.45,103.2],['Phnôm Pênh',11.56,104.92],['Kampot',10.61,104.18],['Bangkok',13.75,100.5],['Nam Ninh',22.82,108.32],['Côn Minh',25.04,102.7],['Hải Nam',19.2,109.7],['Paris',48.85,2.35]])
    assert.equal(vn.contains(lat,lon),false,`${name} phải ngoài Việt Nam`);
  assert.equal(vn.contains(NaN,106),false);
  // Tên tỉnh (có/không dấu, có tiền tố, tên gọi khác) → tỉnh lỵ; tên thành phố thường để dịch vụ tìm.
  for(const [query,town] of [['Nghệ An','Vinh'],['nghe an','Vinh'],['Tỉnh Gia Lai','Pleiku'],['Quảng Nam','Tam Kỳ'],['dak lak','Buôn Ma Thuột'],['Bà Rịa - Vũng Tàu','Vũng Tàu'],['TP HCM','TP. Hồ Chí Minh'],['Sài Gòn','TP. Hồ Chí Minh'],['Thừa Thiên Huế','Huế']])
    assert.equal(vn.province(query)?.name,town,query);
  for(const query of ['Paris','Vinh','An',''])assert.equal(vn.province(query),null,query);
});
test('Gợi ý trang phục: nóng/UV, đêm không chống nắng, mưa, dông, lạnh, dễ chịu, gió; thiếu nhiệt độ thì không kết luận',()=>{
  const o=(patch)=>{const d=fixture();d.current_units.uv_index='';Object.assign(d.current,{weather_code:1,is_day:1,temperature_2m:27,precipitation_probability:10,wind_speed_10m:5,uv_index:2},patch);return Array.from(advice.outfitAdvice(d),g=>g.id);};
  assert.deepEqual(o({}),['mild']);
  assert.deepEqual(o({temperature_2m:31}),['sun']);
  assert.deepEqual(o({uv_index:6}),['sun']);
  assert.deepEqual(o({temperature_2m:33,is_day:0,uv_index:0}),['sun']);
  const d=fixture();Object.assign(d.current,{temperature_2m:33,is_day:0,weather_code:1,precipitation_probability:0});
  assert.ok(!JSON.stringify(advice.outfitAdvice(d)).includes('kem chống nắng'),'ban đêm không gợi ý kem chống nắng');
  assert.deepEqual(o({precipitation_probability:50}),['rain']);
  assert.deepEqual(o({weather_code:95,precipitation_probability:0}),['rain']);
  assert.deepEqual(o({temperature_2m:18}),['cold']);
  assert.deepEqual(o({temperature_2m:18,weather_code:61}),['rain','cold']);
  assert.deepEqual(o({wind_speed_10m:60}),['mild','wind']);
  assert.deepEqual(o({temperature_2m:null}),[]);
});
test('Nominatim: chuẩn hóa viết tắt, đổi kết quả sang địa điểm, tên tỉnh lỵ gần nhất khi không tra được',()=>{
  const vn=context.MayVietnam;
  for(const [raw,want] of [['X. đông hải','Xã đông hải'],['x.đông hải','Xã đông hải'],['P.1, Q.3','Phường 1, Quận 3'],['TT. Cái Nhum','Thị trấn Cái Nhum'],['H. Đầm Dơi','Huyện Đầm Dơi'],['TP. Huế','Thành phố Huế'],['tx.Bình Minh','Thị xã Bình Minh'],['xa dong hai','xa dong hai'],['Hồ Chí Minh','Hồ Chí Minh']])
    assert.equal(vn.expand(raw),want,raw);
  const commune={lat:'8.97',lon:'105.38',name:'Xã Đông Hải',address:{village:'Xã Đông Hải',county:'Huyện Đầm Dơi',state:'Tỉnh Cà Mau',country_code:'vn'}};
  assert.deepEqual({...vn.fromOSM(commune)},{name:'Xã Đông Hải',admin1:'Huyện Đầm Dơi, Tỉnh Cà Mau',country:'',country_code:'VN',latitude:8.97,longitude:105.38});
  assert.equal(vn.fromOSM({...commune,address:{...commune.address,country_code:'la'}}),null);
  assert.equal(vn.fromOSM({...commune,lat:'x'}),null);
  // Định vị: tiêu đề lấy cấp xã/phường, không lấy tên đường; thiếu xã thì lấy huyện
  const rev={name:'Đường 1',address:{road:'Đường 1',quarter:'Phường 4',city:'Thành phố Vĩnh Long',state:'Tỉnh Vĩnh Long',country_code:'vn'},lat:10.25,lon:105.97};
  assert.equal(vn.fromOSM(rev,true).name,'Phường 4');assert.equal(vn.fromOSM(rev,true).admin1,'Thành phố Vĩnh Long, Tỉnh Vĩnh Long');
  assert.equal(vn.fromOSM({...rev,address:{county:'Huyện Đầm Dơi',state:'Tỉnh Cà Mau',country_code:'vn'}},true).name,'Huyện Đầm Dơi');
  assert.equal(vn.fromOSM({lat:1,lon:1,address:{country_code:'vn'}},true),null);
  assert.equal(vn.nearest(10.2538,105.9722).name,'Gần Vĩnh Long');assert.equal(vn.nearest(21.03,105.85).name,'Gần Hà Nội');
  assert.equal(vn.nearest(8.97,105.38).latitude,8.97);
});
