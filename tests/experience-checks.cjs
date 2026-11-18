const pick=require('./places.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const fixture=require('./weather-fixture.cjs');
module.exports=async function({page,test,baseFixture,setForecast,json,ready,evidence}){
  const show=async data=>{setForecast(route=>json(route,data));await page.locator('#refresh-button').click();await ready();};
  await test('36 Nắng nóng, lạnh, mưa, giông: gợi ý hiện tại có căn cứ',async()=>{
    for(const [code,feels,id,weather] of [[0,36,'heat','sunny'],[3,12,'cold','cloudy'],[61,25,'rain','rain'],[97,25,'storm','storm']]){
      const d=fixture(baseFixture);d.current.weather_code=code;d.current.apparent_temperature=feels;
      await show(d);assert.equal(await page.locator(`[data-advice="${id}"]`).count(),1);
      assert.equal(await page.locator('body').getAttribute('data-weather'),weather);
      await page.locator('#current-panel').screenshot({path:path.join(evidence,`theme-${weather}.png`)});
    }
  });
  await test('36b Ban ngày mã 0/1/2 hiện "Nhiều nắng", mặt trời, nền xanh; C/T làm tròn kiểu iPhone',async()=>{
    // [mã, ban ngày, giây nắng trong 15 phút gần nhất (null = không có), nhãn, biểu tượng, nền]
    for(const [code,isDay,sunSec,label,symbol,weather] of [[0,1,null,'Nhiều nắng','clear','sunny'],[1,1,null,'Nhiều nắng','clear','sunny'],[2,1,null,'Nhiều nắng','clear','sunny'],[3,1,null,'Nhiều mây','cloudy','cloudy'],[2,0,null,'Mây rải rác','night-cloud','cloudy'],
      [3,1,800,'Nhiều nắng','clear','sunny'],[3,1,300,'Nắng xen mây','partly-cloudy','partly'],[3,1,60,'Nhiều mây','cloudy','cloudy'],[3,0,800,'Nhiều mây','night-cloud','cloudy'],[61,1,800,'Mưa nhẹ','rain','rain']]){
      const d=fixture(baseFixture);d.current.weather_code=code;d.current.is_day=isDay;d.daily.temperature_2m_max[0]=31.6;d.daily.temperature_2m_min[0]=25.7;
      if(sunSec!==null){d.current.sunshine_duration=sunSec;d.current.interval=900;}await show(d);
      assert.equal(await page.locator('#condition').innerText(),label,`nhãn mã ${code}, is_day=${isDay}`);
      assert.equal(await page.locator('#weather-icon use').getAttribute('href'),`#${symbol}`);
      assert.equal(await page.locator('body').getAttribute('data-weather'),weather);
      assert.equal(await page.locator('#today-range [aria-hidden="true"]').innerText(),'C:32°  T:26°');
      assert.equal(await page.locator('#today-range .visually-hidden').textContent(),'Cao nhất 32 độ, thấp nhất 26 độ');
    }
    // Dự báo 7 ngày: ngày mã 3 nhưng nắng ≥ 50% thời gian ban ngày hiện "Nhiều nắng"; nắng ít vẫn "Nhiều mây".
    const d=fixture(baseFixture);d.current.weather_code=2;d.current.is_day=1;
    d.daily.weather_code=[2,3,3,3,61,95,0];d.daily.daylight_duration=Array(7).fill(40000);d.daily.sunshine_duration=[30000,30000,12000,2000,5000,1000,36000];await show(d);
    assert.deepEqual(await page.locator('.forecast-condition').allInnerTexts(),['Nhiều nắng','Nhiều nắng','Nắng xen mây','Nhiều mây','Mưa nhẹ','Dông','Nhiều nắng']);
    await page.locator('#current-panel').screenshot({path:path.join(evidence,'theme-nhieu-nang.png')});
    d.current.weather_code=3;d.current.sunshine_duration=300;d.current.interval=900;await show(d);
    await page.locator('#current-panel').screenshot({path:path.join(evidence,'theme-nang-xen-may.png')});
  });
  await test('37 Ban đêm vẫn có mưa/mây/giông; giảm chuyển động và bố cục ổn định',async()=>{
    await page.setViewportSize({width:1440,height:1000});const heights=[];
    for(const [code,weather,symbol] of [[0,'sunny','moon'],[3,'cloudy','night-cloud'],[61,'rain','night-rain'],[95,'storm','storm']]){
      const d=fixture(baseFixture);d.current.is_day=0;d.current.weather_code=code;await show(d);
      assert.equal(await page.locator('body').getAttribute('data-phase'),'night');assert.equal(await page.locator('body').getAttribute('data-weather'),weather);
      assert.equal(await page.locator('#weather-icon use').getAttribute('href'),`#${symbol}`);
      // Đo phần lõi (tên, nhiệt độ, tình trạng): dải cảnh báo bên dưới chỉ hiện khi có điều đáng chú ý nên được phép đổi chiều cao.
      heights.push((await page.locator('#current-panel .current-main').boundingBox()).height);
      await page.locator('#current-panel').screenshot({path:path.join(evidence,`theme-night-${weather}.png`)});
    }
    assert.ok(Math.max(...heights)-Math.min(...heights)<2);
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.weather-icon').evaluate(el=>getComputedStyle(el).animationName),'none');
  });
  // Trang này đã bật "chặn lưu trữ" từ kiểm thử trước: chỉ kiểm tra bật/tắt trong phiên; phần nhớ qua tải lại ở navigation.cjs.
  await test('37b Nút Hiệu ứng: mặc định theo máy, người xem tự bật/tắt (kể cả khi trình duyệt chặn lưu trữ)',async()=>{
    const anim=()=>page.locator('.weather-icon').evaluate(el=>getComputedStyle(el).animationName);
    const pressed=()=>page.locator('#motion-toggle').getAttribute('aria-pressed');
    await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await ready();
    assert.equal(await pressed(),'false');assert.equal(await anim(),'none');           // máy giảm chuyển động → mặc định tắt
    await page.locator('#motion-toggle').click();assert.equal(await pressed(),'true');assert.notEqual(await anim(),'none');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('#motion-toggle').click();assert.equal(await pressed(),'false');assert.equal(await anim(),'none'); // tự tắt dù máy cho phép
    await page.reload();await ready();assert.equal(await pressed(),'true');           // không lưu được → lại theo máy
  });
  await test('38 Chỉ đánh giá sau khi tự chọn giờ và hoạt động; không có thẻ gợi ý sẵn',async()=>{
    const d=fixture(baseFixture);d.hourly.apparent_temperature.fill(29);
    await page.locator('#activity-select').selectOption('');await show(d);
    assert.equal(await page.locator('#activity-select').inputValue(),'');
    assert.equal(await page.locator('#activity-hour-detail').isVisible(),false);
    assert.equal(await page.locator('#advice-current-block').isVisible(),false);
    assert.equal(await page.locator('.advice-method').isVisible(),false);
    assert.equal(await page.locator('.activity-slot,#activity-slots,#activity-reasons-box').count(),0);
    assert.equal(await page.locator('.activity-planner select').count(),3);
    await page.locator('#activity-hour').selectOption('2026-10-09T15:00');
    assert.equal(await page.locator('#activity-hour-detail').isVisible(),false);
    await page.locator('#activity-select').selectOption('walk');
    assert.equal(await page.locator('#activity-hour-detail').isVisible(),true);
    assert.match(await page.locator('#activity-hour-detail').innerText(),/Đi bộ.*15:00–16:00/);
    assert.equal(await page.locator('#activity-hour-detail .activity-metrics dd').nth(1).innerText(),'10%');
    assert.deepEqual(await page.locator('.activity-levels li').evaluateAll(items=>items.map(item=>item.dataset.level)),['favorable','caution','favorable']);
    await page.locator('#activity-select').selectOption('run');
    assert.equal(await page.locator('#activity-hour').inputValue(),'2026-10-09T15:00');
    assert.equal(await page.locator('#activity-hour-detail').getAttribute('data-level'),'caution');
    assert.match(await page.locator('#activity-hour-detail').innerText(),/Chạy bộ/);
    await page.locator('#activity-select').selectOption('cycle');
    for(const width of [320,390,630,768,1024,1440]){
      await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Advice overflow ${width}`);
      if([390,630,1440].includes(width))await page.locator('#advice-section').screenshot({path:path.join(evidence,`tu-chon-hoat-dong-${width}.png`)});
    }
    await page.locator('#activity-select').selectOption('');
    assert.equal(await page.locator('#activity-hour-detail').isVisible(),false);
    await page.locator('#advice-section').screenshot({path:path.join(evidence,'hoat-dong-chua-chon.png')});
    await page.locator('#activity-select').selectOption('cycle');
  });
  await test('46 Tự chọn giờ: giông, cân nhắc, đổi ngày/địa điểm xóa đánh giá cũ',async()=>{
    const d=fixture(baseFixture);d.hourly.apparent_temperature.fill(35.4);d.hourly.weather_code.fill(61);d.hourly.precipitation_probability.fill(100);d.hourly.weather_code[10+24*3]=95;
    await show(d);await page.locator('#activity-date').selectOption('2026-10-12');
    assert.equal(await page.locator('#activity-hour-detail').isVisible(),false);
    await page.locator('#activity-hour').selectOption('2026-10-12T06:00');
    assert.equal(await page.locator('#activity-hour-detail').getAttribute('data-level'),'caution');assert.match(await page.locator('#activity-hour-detail').innerText(),/35,4\s°C/);
    assert.deepEqual(await page.locator('.activity-levels li').evaluateAll(items=>items.map(item=>item.dataset.level)),['caution','blocked','caution']);
    await page.locator('#activity-hour').selectOption('2026-10-12T09:00');
    assert.equal(await page.locator('#activity-hour-detail').getAttribute('data-level'),'blocked');assert.match(await page.locator('#activity-hour-detail').innerText(),/giông/);
    assert.equal(await page.locator('#activity-hour option').count(),12);
    await page.locator('#activity-select').selectOption('walk');assert.equal(await page.locator('#activity-hour').inputValue(),'2026-10-12T09:00');
    await page.locator('#activity-date').selectOption('2026-10-13');assert.equal(await page.locator('#activity-hour').inputValue(),'');assert.equal(await page.locator('#activity-hour-detail').isVisible(),false);
    await page.locator('#activity-hour').selectOption('2026-10-13T06:00');await pick(page,1);await ready();assert.equal(await page.locator('#activity-hour').inputValue(),'');assert.equal(await page.locator('#activity-hour-detail').isVisible(),false);
    await page.locator('#activity-date').selectOption('');await show(fixture(baseFixture));
  });
  await test('39 Thiếu hourly/UV và thời tiết xấu không tạo dữ liệu đánh giá giả',async()=>{
    let d=fixture(baseFixture);delete d.hourly;await show(d);assert.equal(await page.locator('#activity-hour').isDisabled(),true);assert.match(await page.locator('#activity-status').innerText(),/Chưa có khung giờ/);assert.equal(await page.locator('#activity-hour-detail').isVisible(),false);
    d=fixture(baseFixture);d.hourly.uv_index.fill(null);await show(d);await page.locator('#activity-hour').selectOption('2026-10-09T15:00');assert.match(await page.locator('#activity-hour-detail .slot-uv').innerText(),/Chưa đủ dữ liệu UV/);
    for(const code of [65,95]){d=fixture(baseFixture);d.hourly.weather_code.fill(code);await show(d);await page.locator('#activity-hour').selectOption('2026-10-09T15:00');assert.equal(await page.locator('#activity-hour-detail').getAttribute('data-level'),'blocked');assert.match(await page.locator('#activity-hour-detail').innerText(),/Không khuyến nghị/);}
    assert.match(await page.locator('#activity-hour-detail').innerText(),/giông/);
    await show(fixture(baseFixture));assert.equal(await page.locator('#activity-hour-detail').isVisible(),false);
    assert.equal(await page.locator('.advice-method').isVisible(),false);
    await page.locator('#activity-hour').selectOption('2026-10-09T15:00');
    assert.equal(await page.locator('.advice-method summary').innerText(),'Cách đánh giá khung giờ');
  });
  await test('43 Ngày và giờ cùng cụm, giữ ngày khi đổi hoạt động, xóa giờ sau cập nhật',async()=>{
    const d=fixture(baseFixture);await show(d);assert.equal(await page.locator('#activity-date option').count(),7);
    assert.match(await page.locator('#activity-date option').first().innerText(),/^Hôm nay/);
    const todayHours=await page.locator('#activity-hour option').evaluateAll(opts=>opts.map(o=>o.value).filter(Boolean));
    assert.ok(todayHours.length&&todayHours.every(time=>time.startsWith(d.daily.time[0])));
    await page.locator('#activity-date').selectOption('2026-10-12');
    for(const value of await page.locator('#activity-hour option').evaluateAll(opts=>opts.map(o=>o.value).filter(Boolean)))assert.ok(value.startsWith('2026-10-12'));
    await page.locator('#activity-hour').selectOption('2026-10-12T06:00');await page.locator('#activity-select').selectOption('run');assert.equal(await page.locator('#activity-date').inputValue(),'2026-10-12');assert.equal(await page.locator('#activity-hour').inputValue(),'2026-10-12T06:00');
    await show(d);assert.equal(await page.locator('#activity-date').inputValue(),'2026-10-12');assert.equal(await page.locator('#activity-hour').inputValue(),'');
    await page.locator('#activity-date').selectOption('2026-10-15');
    const shorter=fixture(baseFixture);shorter.daily.time=shorter.daily.time.slice(0,3);
    await page.evaluate(data=>MayAdvice.render(data,{name:'Địa điểm mới'},'walk'),shorter);assert.equal(await page.locator('#activity-date').inputValue(),'');
    await show(d);await page.locator('#activity-select').selectOption('walk');
  });
  await test('43b Buổi tối hôm nay hết giờ ban ngày: tự xem ngày mai; tự chọn Hôm nay thì giữ',async()=>{
    // Lượt mở trang mới vào buổi tối (chưa từng tự chọn ngày).
    const d=fixture(baseFixture);d.current.time='2026-10-09T19:30';setForecast(route=>json(route,d));
    await page.reload();await ready();
    assert.equal(await page.locator('#activity-date').inputValue(),'2026-10-10');
    assert.match(await page.locator('#activity-status').innerText(),/hết giờ ban ngày.*10\/10/);
    await page.locator('#activity-date').selectOption('');assert.equal(await page.locator('#activity-date').inputValue(),'');
    assert.match(await page.locator('#activity-status').innerText(),/Chưa có khung giờ/);
    // Trả lại trạng thái các bài sau dựa vào (dữ liệu chuẩn, hoạt động Đi bộ) vì đã tải lại trang.
    setForecast(route=>json(route,fixture(baseFixture)));await pick(page,0);await ready();
    await page.locator('#activity-select').selectOption('walk');
  });
  await test('40 Đổi địa điểm cập nhật gợi ý/chủ đề; tải/lỗi về mặc định và ẩn gợi ý cũ',async()=>{
    let pending;setForecast(route=>{pending=route;});await pick(page,0);
    await page.waitForFunction(()=>document.getElementById('weather-content').getAttribute('aria-busy')==='true');
    assert.equal(await page.locator('body').getAttribute('data-weather'),'default');assert.equal(await page.locator('#advice-results').isVisible(),false);
    await page.waitForFunction(()=>document.getElementById('refresh-button').disabled);
    while(!pending)await new Promise(resolve=>setTimeout(resolve,10));
    await json(pending,{},500);await ready();assert.equal(await page.locator('body').getAttribute('data-weather'),'default');assert.match(await page.locator('#advice-unavailable').innerText(),/Chưa tải được/);
    const d=fixture(baseFixture);d.current.weather_code=61;setForecast(route=>json(route,d));
    await pick(page,1);await ready();assert.match(await page.locator('#advice-location').innerText(),/Hà Nội/);assert.equal(await page.locator('body').getAttribute('data-weather'),'rain');assert.equal(await page.locator('#advice-results').isVisible(),true);
  });
  await test('44 Chọn ngày ở đầu trang đổi tổng quan, số liệu và gợi ý đúng ngày',async()=>{
    const d=fixture(baseFixture);
    d.current.apparent_temperature=36;
    Object.assign(d.daily_units,{wind_speed_10m_max:'km/h',precipitation_sum:'mm',uv_index_max:''});
    d.daily.wind_speed_10m_max=[10,11,12,13,14,15,16];d.daily.precipitation_sum=[0,1,2,3,4,5,6];d.daily.uv_index_max=[1,2,3,4,5,6,7];
    await show(d);assert.equal(await page.locator('#weather-date option').count(),7);
    assert.match(await page.locator('#weather-date option').first().innerText(),/^Hôm nay/);
    await page.locator('#weather-date').selectOption('2026-10-11');
    assert.equal(await page.locator('#daily-view').isVisible(),true);assert.equal(await page.locator('#current-panel').isVisible(),false);
    assert.equal(await page.locator('#current-metrics').isVisible(),false);assert.equal(await page.locator('#advice-current-block').isVisible(),false);
    assert.equal(await page.locator('#daily-high').innerText(),'31°');assert.equal(await page.locator('#daily-hilo [aria-hidden="true"]').innerText(),'C:31°  T:24°');
    assert.equal(await page.locator('[data-metric="wind_speed_10m_max"] .daily-value').innerText(),'12 km/h');
    assert.equal(await page.locator('[data-metric="precipitation_sum"] .daily-value').innerText(),'2 mm');
    assert.equal(await page.locator('[data-metric="uv_index_max"] .daily-value').innerText(),'3');
    assert.equal(await page.locator('#activity-date').inputValue(),'2026-10-11');
    assert.match(await page.locator('#page-title-text').innerText(),/11\/10/);
    for(const width of [320,390,706,1024,1440]){
      await page.setViewportSize({width,height:1000});assert.equal(await page.locator('#weather-date').isVisible(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Daily overflow ${width}`);
      if(width===390||width===1440){await page.locator('.page-header').screenshot({path:path.join(evidence,`ngay-header-${width}.png`)});await page.locator('#daily-view').screenshot({path:path.join(evidence,`du-bao-ngay-${width}.png`)});}
    }
    for(const date of d.daily.time.slice(1)){await page.locator('#weather-date').selectOption(date);assert.match(await page.locator('#daily-date').innerText(),new RegExp(date.slice(8)+'[-/]'+date.slice(5,7)));}
    await pick(page,3);await ready();assert.equal(await page.locator('#daily-place').innerText(),'Đà Nẵng');assert.equal(await page.locator('#weather-date').inputValue(),'2026-10-15');
    const missing=structuredClone(d);missing.daily.wind_speed_10m_max[6]=null;missing.daily_units.uv_index_max='wrong';await show(missing);
    assert.equal(await page.locator('[data-metric="wind_speed_10m_max"] .daily-value').innerText(),'Chưa có dữ liệu');
    assert.equal(await page.locator('[data-metric="uv_index_max"] .daily-value').innerText(),'Chưa có dữ liệu');
    await page.locator('#weather-date').selectOption('');assert.equal(await page.locator('#current-panel').isVisible(),true);
    assert.equal(await page.locator('#advice-current-block').isVisible(),true);assert.equal(await page.locator('#daily-view').isVisible(),false);
    assert.equal(await page.locator('#page-title-text').innerText(),'Thời tiết hôm nay');
  });
};
