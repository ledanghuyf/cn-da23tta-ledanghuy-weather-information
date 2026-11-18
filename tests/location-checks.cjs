const pick=require('./places.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async({page,test,baseFixture,setForecast,json,ready,evidence})=>{
  const mock=async code=>page.evaluate(code=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(ok,fail,options)=>{window.geoOptions=options;fail({code});}}}),code);
  await test('53b Vị trí ngoài Việt Nam bị từ chối, giữ nơi đang xem, không gợi ý thử lại',async()=>{
    const before=await page.locator('#place-name').innerText();
    const abroad=structuredClone(baseFixture);abroad.timezone='Asia/Bangkok';setForecast(route=>json(route,abroad));
    await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:ok=>ok({coords:{latitude:13.75,longitude:100.5,accuracy:20}})}}));
    await page.locator('#locate-button').click();await page.waitForFunction(()=>document.getElementById('locate-status').dataset.error==='outside');
    assert.equal(await page.locator('#place-name').innerText(),before);assert.match(await page.locator('#weather-status').innerText(),/ngoài Việt Nam/);
    assert.equal(await page.locator('#retry-button').isVisible(),false);assert.equal(await page.locator('#locate-help').isVisible(),false);
    setForecast(route=>json(route,baseFixture));await page.locator('#refresh-button').click();await ready();
  });
  await test('53c Miền Bắc (API gán múi giờ Asia/Bangkok) vẫn được nhận khi định vị',async()=>{
    // Open-Meteo trả Asia/Bangkok cho Hà Nội, Sa Pa, Vinh…; trước đây kiểm tra theo múi giờ nên bị từ chối nhầm.
    const north=structuredClone(baseFixture);north.timezone='Asia/Bangkok';setForecast(route=>json(route,north));
    await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:ok=>ok({coords:{latitude:21.0245,longitude:105.84117,accuracy:20}})}}));
    await page.locator('#locate-button').click();await ready();await page.waitForFunction(()=>document.getElementById('locate-status').textContent.includes('Đã tải thời tiết'));
    assert.equal(await page.locator('#place-name').innerText(),'Gần Hà Nội');assert.doesNotMatch(await page.locator('#weather-status').innerText(),/ngoài Việt Nam/);
    setForecast(route=>json(route,baseFixture));await pick(page,0);await ready();
  });
  await test('53d Gần tôi: tiêu đề là phường/xã từ Nominatim, dòng phụ thành phố/huyện, tỉnh; không hiện tọa độ',async()=>{
    let asked;const pattern='https://nominatim.openstreetmap.org/**';
    await page.route(pattern,r=>{asked=new URL(r.request().url());return json(r,{lat:'10.2531',lon:'105.9721',name:'Đường Phạm Thái Bường',address:{road:'Đường Phạm Thái Bường',quarter:'Phường 4',city:'Thành phố Vĩnh Long',state:'Tỉnh Vĩnh Long',country_code:'vn'}});});
    await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:ok=>ok({coords:{latitude:10.253789,longitude:105.972218,accuracy:20}})}}));
    await page.locator('#locate-button').click();await ready();await page.waitForFunction(()=>document.getElementById('locate-status').textContent.includes('Đã tải thời tiết'));
    assert.equal(asked.pathname,'/reverse');assert.equal(asked.searchParams.get('zoom'),'18');assert.equal(asked.searchParams.get('accept-language'),'vi');
    assert.equal(await page.locator('#place-name').innerText(),'Phường 4');
    assert.equal(await page.locator('#place-region').innerText(),'Thành phố Vĩnh Long, Tỉnh Vĩnh Long');
    await page.unroute(pattern);
    await pick(page,0);await ready();
  });
  await test('53 Định vị phân biệt bị chặn, không có tọa độ, hết giờ; thử lại lấy vị trí mới',async()=>{
    for(const [code,kind,text] of [[1,'denied','chưa cho phép'],[2,'unavailable','lỗi 2'],[3,'timeout','lỗi 3']]){
      await mock(code);await page.locator('#locate-button').click();assert.equal(await page.locator('#locate-status').getAttribute('data-error'),kind);assert.ok((await page.locator('#locate-status').innerText()).includes(text));
      assert.equal(await page.locator('#locate-help').isVisible(),true);assert.equal(await page.locator('#locate-button').isEnabled(),true);assert.equal(await page.locator('#locate-label').innerText(),'Thử định vị lại');
      const options=await page.evaluate(()=>window.geoOptions);assert.equal(options.timeout,30000);assert.equal(options.maximumAge,0);
    }
    await page.locator('#locate-search').click();assert.equal(await page.locator('#location-input').evaluate(el=>el===document.activeElement),true);
    await mock(2);await page.locator('#locate-button').click();await page.locator('.search-panel').screenshot({path:path.join(evidence,'dinh-vi-huong-dan.png')});
  });
  await test('54 Định vị không phản hồi được giải phóng sau 35 giây; hủy và bỏ callback cũ',async()=>{
    await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:ok=>{window.geoLate=ok;}}}));
    const before=await page.locator('#place-name').innerText();
    await page.locator('#locate-button').click();assert.equal(await page.locator('#locate-cancel').isVisible(),true);await page.clock.fastForward(36000);await page.clock.resume();
    assert.equal(await page.locator('#locate-status').getAttribute('data-error'),'timeout');assert.equal(await page.locator('#locate-button').isEnabled(),true);
    await page.evaluate(()=>window.geoLate({coords:{latitude:10,longitude:106}}));assert.equal(await page.locator('#place-name').innerText(),before);
    await page.locator('#locate-button').click();await page.locator('#locate-cancel').click();assert.match(await page.locator('#locate-status').innerText(),/Đã hủy/);assert.equal(await page.locator('#locate-button').isEnabled(),true);
    await page.evaluate(()=>window.geoLate({coords:{latitude:10,longitude:106}}));assert.equal(await page.locator('#place-name').innerText(),before);
  });
  await test('55 Không hỗ trợ, ném lỗi, tọa độ thiếu và API lỗi không báo định vị thành công',async()=>{
    await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:undefined}));await page.locator('#locate-button').click();assert.equal(await page.locator('#locate-status').getAttribute('data-error'),'unsupported');
    await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:()=>{throw new Error('provider failure');}}}));await page.locator('#locate-button').click();assert.equal(await page.locator('#locate-status').getAttribute('data-error'),'unknown');assert.equal(await page.locator('#locate-button').isEnabled(),true);
    await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:ok=>ok({coords:{latitude:null,longitude:106}})}}));await page.locator('#locate-button').click();assert.equal(await page.locator('#locate-status').getAttribute('data-error'),'invalid');
    await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:ok=>ok({coords:{latitude:10,longitude:106}})}}));
    setForecast(route=>json(route,{},500));await page.locator('#locate-button').click();await ready();await page.waitForFunction(()=>document.getElementById('locate-status').dataset.error==='weather');assert.doesNotMatch(await page.locator('#locate-status').innerText(),/Đã tải thời tiết/);
    setForecast(route=>json(route,baseFixture));await page.locator('#locate-button').click();await ready();await page.waitForFunction(()=>document.getElementById('locate-status').textContent.includes('Đã tải thời tiết'));
    assert.equal(await page.locator('#locate-help').isVisible(),false);assert.equal(await page.locator('#locate-button').isEnabled(),true);
  });
};
