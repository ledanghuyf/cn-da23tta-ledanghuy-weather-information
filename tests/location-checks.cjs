const assert=require('node:assert/strict');
const path=require('node:path');
// Vị trí là bắt buộc: mở trang là tự định vị. Mỗi tình huống mở một trang riêng với navigator.geolocation giả lập;
// window.__geo điều khiển lần gọi kế tiếp: {code} lỗi, {coords} thành công, {late:true} không phản hồi, {throws:true} ném lỗi.
module.exports=async({open,test,baseFixture,setForecast,json,evidence})=>{
  const geo=config=>{window.__geo=config;Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(ok,fail,options)=>{
    window.geoOptions=options;const g=window.__geo;
    if(g.throws)throw new Error('provider failure');if(g.late){window.geoLate=ok;return;}if(g.code)return fail({code:g.code});ok({coords:g.coords});}}});};
  const idle=p=>p.waitForFunction(()=>document.getElementById('weather-content').getAttribute('aria-busy')==='false');
  const gate=async(p,text)=>{
    await idle(p);assert.match(await p.locator('#empty-message').innerText(),text);
    assert.equal(await p.locator('#weather-view').isVisible(),false,'không hiện thời tiết khi chưa có vị trí');
    assert.equal(await p.locator('#location-input').isDisabled(),true,'khóa tìm kiếm khi chưa có vị trí');
    assert.equal(await p.locator('#locate-retry').isVisible(),true);
    assert.equal(await p.locator('.control-bar').isVisible(),false);
  };
  const VL={latitude:10.2537,longitude:105.9722};

  await test('53 Từ chối, không có tọa độ, hết giờ: không hiện thời tiết, khóa tìm kiếm; Thử lại có vị trí thì hiện',async()=>{
    for(const [code,text] of [[1,/chưa cho phép/],[2,/chưa lấy được vị trí/],[3,/quá lâu/]]){
      const p=await open({init:geo,arg:{code}});await gate(p,text);
      const options=await p.evaluate(()=>window.geoOptions);assert.equal(options.timeout,30000);assert.equal(options.maximumAge,0);assert.equal(options.enableHighAccuracy,true);
      if(code===1){
        await p.screenshot({path:path.join(evidence,'can-vi-tri.png')});
        await p.evaluate(c=>{window.__geo={coords:c};},VL);await p.locator('#locate-retry').click();await idle(p);
        assert.equal(await p.locator('#weather-view').isVisible(),true);assert.equal(await p.locator('#location-input').isEnabled(),true);assert.equal(await p.locator('#locate-retry').isVisible(),false);
      }
      await p.close();
    }
  });
  await test('53b Vị trí ngoài Việt Nam: không gọi thời tiết, báo rõ chỉ hỗ trợ Việt Nam',async()=>{
    let calls=0;const p=await open({init:geo,arg:{coords:{latitude:13.75,longitude:100.5}},before:p=>p.route('https://api.open-meteo.com/**',r=>{calls++;return r.fallback();})});
    await gate(p,/ngoài Việt Nam/);assert.equal(await p.locator('#empty-title').innerText(),'Bạn đang ở ngoài Việt Nam');assert.equal(calls,0);await p.close();
  });
  await test('53c Miền Bắc (API gán múi giờ Asia/Bangkok) vẫn được nhận khi định vị',async()=>{
    const north=structuredClone(baseFixture);north.timezone='Asia/Bangkok';setForecast(route=>json(route,north));
    const p=await open({init:geo,arg:{coords:{latitude:21.0245,longitude:105.84117}}});await idle(p);
    assert.equal(await p.locator('#weather-view').isVisible(),true);assert.doesNotMatch(await p.locator('#weather-status').innerText(),/ngoài Việt Nam/);
    setForecast(route=>json(route,baseFixture));await p.close();
  });
  await test('53d Tên vị trí: phường/xã từ Nominatim, dòng phụ thành phố/huyện, tỉnh; bị chặn thì "Gần <tỉnh lỵ>"; không hiện tọa độ',async()=>{
    let asked;
    let p=await open({init:geo,arg:{coords:VL},before:p=>p.route('https://nominatim.openstreetmap.org/**',r=>{asked=new URL(r.request().url());return json(r,{lat:'10.2531',lon:'105.9721',name:'Đường Phạm Thái Bường',address:{road:'Đường Phạm Thái Bường',quarter:'Phường 4',city:'Thành phố Vĩnh Long',state:'Tỉnh Vĩnh Long',country_code:'vn'}});})});
    await idle(p);assert.equal(asked.pathname,'/reverse');assert.equal(asked.searchParams.get('zoom'),'18');assert.equal(asked.searchParams.get('accept-language'),'vi');
    assert.equal(await p.locator('#place-name').innerText(),'Phường 4');assert.equal(await p.locator('#place-region').innerText(),'Thành phố Vĩnh Long, Tỉnh Vĩnh Long');await p.close();
    let tries=0;p=await open({init:geo,arg:{coords:VL},before:p=>p.route('https://nominatim.openstreetmap.org/**',r=>{tries++;return r.abort();})});
    await idle(p);assert.equal(await p.locator('#place-name').innerText(),'Gần Vĩnh Long');assert.doesNotMatch(await p.locator('#place-region').innerText(),/\d/);
    assert.equal(tries,2,'lỗi thì thử lại một lần rồi mới dùng tên dự phòng');await p.close();
  });
  await test('53e Link chia sẻ: vẫn cần vị trí, có vị trí thì mở nơi trong link; link ra nước ngoài thì về nơi đang đứng',async()=>{
    let p=await open({init:geo,arg:{coords:VL},query:'?lat=21.0245&lon=105.84117&place=H%C3%A0%20N%E1%BB%99i'});await idle(p);
    assert.equal(await p.locator('#place-name').innerText(),'Hà Nội');await p.close();
    p=await open({init:geo,arg:{code:1},query:'?lat=21.0245&lon=105.84117&place=H%C3%A0%20N%E1%BB%99i'});await gate(p,/chưa cho phép/);await p.close();
    p=await open({init:geo,arg:{coords:VL},query:'?lat=13.75&lon=100.5&place=Bangkok'});await idle(p);
    await p.waitForFunction(()=>document.getElementById('place-name').textContent==='Vĩnh Long');await p.close();
  });
  await test('54 Định vị không phản hồi: sau 35 giây báo hết giờ; kết quả trễ bị bỏ qua',async()=>{
    const p=await open({init:geo,arg:{late:true},before:p=>p.clock.install()});
    await p.waitForFunction(()=>typeof window.geoLate==='function');await p.clock.fastForward(36000);await p.clock.resume();
    await gate(p,/quá lâu/);
    await p.evaluate(c=>window.geoLate({coords:c}),VL);await p.waitForTimeout(300);assert.equal(await p.locator('#weather-view').isVisible(),false);await p.close();
  });
  await test('55 Không hỗ trợ, ném lỗi, tọa độ thiếu; lỗi thời tiết sau khi có vị trí vẫn cho thử tải lại',async()=>{
    let p=await open({init:()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:undefined})});await gate(p,/không hỗ trợ/);await p.close();
    for(const [arg,text] of [[{throws:true},/Chưa lấy được vị trí/],[{coords:{latitude:null,longitude:106}},/không hợp lệ/]]){p=await open({init:geo,arg});await gate(p,text);await p.close();}
    setForecast(route=>json(route,{},500));p=await open({init:geo,arg:{coords:VL}});await idle(p);
    assert.match(await p.locator('#weather-status').innerText(),/chưa phản hồi thành công/);assert.equal(await p.locator('#retry-button').isVisible(),true);assert.equal(await p.locator('#location-input').isEnabled(),true);
    setForecast(route=>json(route,baseFixture));await p.locator('#retry-button').click();await idle(p);assert.equal(await p.locator('#weather-view').isVisible(),true);await p.close();
  });
};
