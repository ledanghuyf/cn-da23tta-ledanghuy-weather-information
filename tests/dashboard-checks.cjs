const assert=require('node:assert/strict');
const path=require('node:path');
const fixture=require('./weather-fixture.cjs');
module.exports=async({page,test,baseFixture,setForecast,json,ready,evidence})=>{
  const data=()=>{
    const d=fixture(baseFixture);
    Object.assign(d.hourly_units,{temperature_2m:'°C',relative_humidity_2m:'%'});
    d.hourly.temperature_2m=d.hourly.time.map((_,i)=>22+i%12);d.hourly.relative_humidity_2m=Array(168).fill(72);
    Object.assign(d.current_units,{cloud_cover:'%',surface_pressure:'hPa',visibility:'m',wind_direction_10m:'°',wind_gusts_10m:'km/h'});
    Object.assign(d.current,{cloud_cover:62,surface_pressure:1008.2,visibility:18000,wind_direction_10m:90,wind_gusts_10m:16});
    Object.assign(d.daily_units,{sunrise:'iso8601',sunset:'iso8601',daylight_duration:'s'});
    Object.assign(d.daily,{sunrise:d.daily.time.map(day=>day+'T05:42'),sunset:d.daily.time.map(day=>day+'T17:41'),daylight_duration:Array(7).fill(43140)});
    return d;
  };
  const show=async d=>{setForecast(route=>json(route,d));await page.locator('#refresh-button').click();await ready();};
  await test('48 Bảng 24 giờ, biểu đồ nhiệt/mưa/gió và mở chi tiết đúng mốc',async()=>{
    await page.locator('#weather-date').selectOption('');await show(data());await page.locator('#tab-hourly-section').click();
    assert.equal(await page.locator('.hour-tile').count(),24);assert.equal(await page.locator('.hour-time').first().innerText(),'15:00');
    await page.locator('.hour-tile').nth(2).click();assert.match(await page.locator('#hourly-detail').innerText(),/17:00.*09\/10/);assert.match(await page.locator('#hourly-detail').innerText(),/27 °C/);
    for(const mode of ['precipitation_probability','wind_speed_10m','temperature_2m']){await page.locator(`[data-hour-mode="${mode}"]`).click();assert.equal(await page.locator(`[data-hour-mode="${mode}"]`).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#hourly-chart svg').count(),1);}
    assert.match(await page.locator('#hourly-detail').innerText(),/17:00/);
  });
  await test('49 Xem ngày từ thẻ 7 ngày; mặt trời và các chỉ số bổ sung đúng dữ liệu',async()=>{
    await page.locator('#tab-forecast-section').click();await page.locator('.day-open').nth(3).click();assert.equal(await page.locator('#weather-date').inputValue(),'2026-10-12');
    assert.equal(await page.locator('.hour-time').first().innerText(),'00:00');assert.match(await page.locator('#hourly-caption').innerText(),/12\/10/);
    assert.equal(await page.locator('#sunrise-time').innerText(),'05:42');assert.equal(await page.locator('#sunset-time').innerText(),'17:41');assert.match(await page.locator('#sun-duration').innerText(),/11 giờ 59 phút/);
    assert.match(await page.locator('[data-extra="visibility"]').innerText(),/18 km/);assert.match(await page.locator('[data-extra="wind_direction_10m"]').innerText(),/Đông · 90°/);
    assert.equal(await page.locator('#details-period').count(),0);
    await page.locator('#weather-date').selectOption('');
  });
  await test('49b Điểm cần chú ý: hiện hôm nay, ẩn khi xem ngày khác; ô Cảm nhận nổi rồi trả chữ gốc',async()=>{
    const d=data();d.current.apparent_temperature=29;d.hourly.precipitation_probability[17]=70;await show(d);
    const list=page.locator('#weather-highlights'),feels=page.locator('.metric:has(#feels-like)');
    assert.equal(await list.isVisible(),true);assert.match(await list.innerText(),/Có thể mưa lúc 17:00/);assert.match(await list.innerText(),/nóng hơn 4°/);
    assert.equal(await feels.getAttribute('data-alert'),'');assert.match(await feels.innerText(),/Nóng hơn thực tế 4°/);
    assert.equal(await page.locator('.hour-tile[data-rain="high"]').count(),1);
    await page.locator('#weather-date').selectOption('2026-10-12');assert.equal(await list.isVisible(),false);
    await page.locator('#weather-date').selectOption('');assert.equal(await list.isVisible(),true);
    await show(data());assert.equal(await feels.getAttribute('data-alert'),null);assert.match(await feels.innerText(),/Nhiệt độ cảm nhận ngoài trời/);assert.match(await list.innerText(),/khá yên/);
  });
  await test('50 Dữ liệu bổ sung thiếu, sai đơn vị, gián đoạn không làm mất thời tiết lõi',async()=>{
    await page.locator('#tab-hourly-section').click();const d=data();d.hourly.temperature_2m[17]=null;d.current.visibility=null;d.daily.sunrise.fill(null);await show(d);
    assert.equal(await page.locator('#hourly-chart .hour-curve').count(),2);assert.equal(await page.locator('.hour-main-value').nth(2).innerText(),'—');assert.match(await page.locator('[data-extra="visibility"]').innerText(),/Chưa có dữ liệu/);assert.equal(await page.locator('#sunrise-time').innerText(),'Chưa có');
    delete d.hourly;await show(d);assert.equal(await page.locator('.hour-tile').count(),0);assert.match(await page.locator('#hourly-message').innerText(),/Chưa có/);assert.equal(await page.locator('#hourly-detail').isVisible(),false);assert.equal(await page.locator('#current-panel').isVisible(),true);
    await show(data());
  });
  await test('51 Định vị: từ chối, thành công và kết quả trễ không ghi đè nơi chọn tay',async()=>{
    await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(_,fail)=>fail({code:1})}}));
    await page.locator('#locate-button').click();assert.match(await page.locator('#locate-status').innerText(),/chưa cho phép/);assert.equal(await page.locator('#locate-button').isEnabled(),true);
    await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:ok=>ok({coords:{latitude:10.253789,longitude:105.972218}})}}));
    await page.locator('#locate-button').click();await ready();assert.equal(await page.locator('#place-name').innerText(),'Vị trí của bạn');assert.match(await page.locator('#place-region').innerText(),/10,?\.25/);
    await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:ok=>{window.lateGeo=ok;}}}));
    await page.locator('#locate-button').click();await page.locator('.quick-button').nth(1).click();await ready();
    await page.evaluate(()=>window.lateGeo({coords:{latitude:10,longitude:106}}));assert.equal(await page.locator('#place-name').innerText(),'Hà Nội');
  });
  await test('52 Giao diện mới không tràn, điều hướng bàn phím và ảnh desktop/mobile',async()=>{
    await show(data());
    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`dashboard overflow ${width}`);
      if([390,1440].includes(width)){await page.locator('#hourly-section').screenshot({path:path.join(evidence,`dashboard-hourly-${width}.png`)});await page.locator('#details-section').screenshot({path:path.join(evidence,`dashboard-details-${width}.png`)});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(evidence,`dashboard-preview-${width}.png`)});await page.screenshot({path:path.join(evidence,`dashboard-full-${width}.png`),fullPage:true});}
    }
    await page.locator('.hour-tile').first().focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.hour-tile').first().getAttribute('aria-pressed'),'true');
    await page.locator('.quick-button').first().click();await ready();
  });
};
