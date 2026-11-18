const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const fixture=require('./weather-fixture.cjs');
const context=vm.createContext({Intl,Date});
for(const file of ['weather-config.js','weather-theme.js','recommendations.js','dashboard.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/js',file),'utf8'),context);
const {MayAdvice:advice,MayTheme:theme}=context;
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
test('Điểm cần chú ý: mưa, UV, gió giật (không còn mục cảm nhận lệch); không có gì thì ẩn hẳn; không kết luận khi thiếu dữ liệu',()=>{
  const h=d=>Array.from(context.MayDashboardData.highlights(d),i=>i.title);
  let d=fixture();assert.deepEqual(h(d),[]);
  d.hourly.precipitation_probability[17]=70;d.current.apparent_temperature=33;d.hourly.uv_index[16]=8.4;
  d.current_units.wind_gusts_10m='km/h';d.current.wind_gusts_10m=45;
  assert.deepEqual(h(d),['Có thể mưa lúc 17:00','UV rất cao (8,4)','Gió giật 45 km/h']);
  d.current.precipitation=1.2;assert.equal(h(d)[0],'Đang có mưa');
  d=fixture();d.hourly_units.precipitation_probability='mm';assert.deepEqual(h(d),[]);
  d=fixture();d.current.weather_code=61;assert.equal(h(d)[0],'Đang có mưa');d.current.weather_code=95;assert.equal(h(d)[0],'Đang có giông');
  // Không khí: >100 thì cảnh báo; <=100 hoặc chưa có thì bỏ qua.
  const ha=(d,air)=>Array.from(context.MayDashboardData.highlights(d,air),i=>i.title);
  d=fixture();assert.deepEqual(ha(d,{aqi:162,label:'Không tốt'}),['Không khí không tốt (AQI 162)']);
  assert.deepEqual(ha(d,{aqi:100,label:'Trung bình'}),[]);assert.deepEqual(ha(d,{aqi:null,label:'Chưa có chỉ số'}),[]);
  assert.equal(context.MayDashboardData.feelsGap(27.4,34.5),8);assert.equal(context.MayDashboardData.feelsGap(29.6,31),0);assert.equal(context.MayDashboardData.feelsGap(20,16.6),-3);
  assert.equal(context.MayDashboardData.uvLevel(5.9),'Trung bình');assert.equal(context.MayDashboardData.uvLevel(11),'Cực cao');
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
test('Gợi ý trang phục: nóng/UV, oi, đêm không chống nắng, mưa (cả 3 giờ tới), dông, lạnh, dễ chịu, gió; tiêu đề đúng số liệu; thiếu nhiệt độ thì không kết luận',()=>{
  // Giờ hiện tại 15:xx, 3 giờ tới không mưa trừ khi đặt riêng.
  const make=(patch,rain={})=>{const d=fixture();d.current_units.uv_index='';d.current_units.apparent_temperature='°C';
    Object.assign(d.current,{time:'2026-10-09T15:15',weather_code:1,is_day:1,temperature_2m:27,apparent_temperature:27,precipitation_probability:10,wind_speed_10m:5,uv_index:2},patch);
    d.hourly.precipitation_probability=d.hourly.precipitation_probability.map(()=>0);
    for(const [hour,p] of Object.entries(rain))d.hourly.precipitation_probability[d.hourly.time.indexOf('2026-10-09T'+hour)]=p;return d;};
  const o=(patch,rain)=>Array.from(advice.outfitAdvice(make(patch,rain)),g=>g.id);
  const titles=(patch,rain)=>Array.from(advice.outfitAdvice(make(patch,rain)),g=>g.title);
  assert.deepEqual(o({}),['mild']);assert.deepEqual(titles({}),['Dễ chịu · 27°']);
  assert.deepEqual(o({temperature_2m:31,apparent_temperature:31}),['sun']);assert.deepEqual(titles({temperature_2m:31.4,apparent_temperature:31}),['Nóng · 31°']);
  assert.deepEqual(titles({uv_index:8.4}),['Nắng gắt · UV 8,4']);
  assert.deepEqual(o({apparent_temperature:31}),['humid']);assert.deepEqual(titles({apparent_temperature:31}),['Oi bức · cảm giác như 31°']);
  assert.deepEqual(o({temperature_2m:33,apparent_temperature:33,is_day:0,uv_index:0}),['humid']);
  const night=JSON.stringify(advice.outfitAdvice(make({temperature_2m:33,is_day:0,uv_index:0})));
  assert.ok(!night.includes('kem chống nắng')&&!night.includes('UV'),'ban đêm không nhắc chống nắng');
  assert.deepEqual(titles({precipitation_probability:50}),['Khả năng mưa 50%']);
  assert.deepEqual(titles({}, {'17:00':65}),['Có thể mưa lúc 17:00 · 65%'],'mưa trong 3 giờ tới');
  assert.deepEqual(o({}, {'20:00':90}),['mild'],'quá 3 giờ thì chưa nhắc');
  assert.deepEqual(titles({weather_code:95,precipitation_probability:0}),['Có dông']);assert.match(JSON.stringify(advice.outfitAdvice(make({weather_code:95}))),/sấm sét/);
  assert.deepEqual(titles({temperature_2m:18,apparent_temperature:18}),['Se lạnh · 18°']);assert.deepEqual(titles({temperature_2m:12,apparent_temperature:12}),['Lạnh · 12°']);
  assert.deepEqual(o({temperature_2m:18,apparent_temperature:18,weather_code:61}),['rain','cold']);
  assert.deepEqual(titles({wind_speed_10m:42}),['Dễ chịu · 27°','Gió mạnh · 42 km/h']);
  assert.deepEqual(o({temperature_2m:null}),[]);
  // Không có câu sáo rỗng
  for(const d of [make({}),make({is_day:0})])assert.doesNotMatch(JSON.stringify(advice.outfitAdvice(d)),/lý tưởng|tuyệt vời|hãy tận hưởng/);
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
test('Ban đêm gọi tên theo mây che phủ: Song Lộc mã 2 + mây 62% → Nhiều mây; ban ngày và mưa giữ nguyên mã',()=>{
  const n=theme.nightCode;
  assert.equal(n(2,0,62),3);assert.equal(n(0,0,5),0);assert.equal(n(0,0,15),1);assert.equal(n(3,0,40),2);
  assert.equal(n(2,1,62),2,'ban ngày dùng tỉ lệ nắng');assert.equal(n(61,0,95),61,'mưa giữ mã');assert.equal(n(2,0,undefined),2);assert.equal(n(2,0,140),2);
  assert.equal(theme.select({weather_code:2,is_day:0,cloud_cover:62}).weather,'cloudy');assert.equal(theme.select({weather_code:2,is_day:0,cloud_cover:5}).weather,'sunny');
});
test('Giờ địa phương từ API: ngày không có thật, sai định dạng hoặc thiếu thì không thành mốc thời gian',()=>{
  assert.equal(advice.localStamp('2026-10-09T15:00'),Date.UTC(2026,9,9,15));
  for(const bad of ['2026-02-30T12:00','2026-10-09T24:00','2026-10-09 15:00','',null,undefined])assert.ok(Number.isNaN(advice.localStamp(bad)),String(bad));
});
