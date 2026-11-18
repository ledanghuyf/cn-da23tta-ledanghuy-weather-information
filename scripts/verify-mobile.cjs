const pick=require('../tests/places.cjs');
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'docs/evidence-mobile');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=path.join(root,'dist',pathname==='/'?'index.html':pathname);fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const responses=[],errors=[];
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({geolocation:{latitude:10.2537,longitude:105.9722},permissions:['geolocation'],viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,timezoneId:'Asia/Ho_Chi_Minh'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',async r=>{if(/https:\/\/(api|air-quality-api)\.open-meteo.com\//.test(r.url())&&r.ok())try{responses.push({url:r.url(),receivedAt:new Date().toISOString(),data:await r.json()})}catch{}});
  const weatherResponse=page.waitForResponse(r=>r.url().includes('api.open-meteo.com/v1/forecast')&&r.ok(),{timeout:30000});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const weather={data:await (await weatherResponse).json()};
  await page.waitForFunction(()=>/^-?\d/.test(document.querySelector('#temperature').textContent.trim())&&document.querySelector('#weather-content').getAttribute('aria-busy')==='false',{},{timeout:30000});
  assert.equal(await page.locator('#temperature').innerText(),String(Math.round(weather.data.current.temperature_2m)));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.equal(await page.locator('#location-drawer').evaluate(el=>el.open),false);
  assert.ok((await page.locator('#current-panel').boundingBox()).y<600,'Thông tin thời tiết xuất hiện ngay trên màn hình đầu');
  await page.screenshot({path:path.join(out,'mobile-top-api-that.png')});
  await page.locator('#date-next').click();assert.equal(await page.locator('#weather-date').inputValue(),weather.data.daily.time[1]);
  await page.locator('#date-prev').click();assert.equal(await page.locator('#weather-date').inputValue(),'');
  assert.equal(await page.locator('#current-panel').isVisible(),true);
  assert.equal(await page.locator('#date-prev').isDisabled(),true);
  await page.locator('#weather-date').selectOption(weather.data.daily.time[6]);assert.equal(await page.locator('#date-next').isDisabled(),true);
  await page.locator('#date-now').click();assert.equal(await page.locator('#weather-date').inputValue(),'');
  await page.locator('[data-hour-mode="precipitation"]').click();
  const first=weather.data.hourly.time.findIndex(time=>time>=weather.data.current.time);
  assert.equal(await page.locator('.hour-main-value').first().innerText(),new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(weather.data.hourly.precipitation[first]));
  assert.match(await page.locator('#hourly-detail').innerText(),/Lượng mưa/);
  await page.locator('[data-hour-mode="temperature_2m"]').click();
  await page.evaluate(()=>{window.originalNow=Date.now;Date.now=()=>WeatherDataTools.timestamp(state.weather)+7200000;window.dispatchEvent(new Event('focus'))});
  assert.equal(await page.locator('#weather-age').isVisible(),true);assert.match(await page.locator('#weather-age').innerText(),/120 phút/);
  await page.evaluate(()=>{Date.now=window.originalNow;delete window.originalNow;window.dispatchEvent(new Event('focus'))});
  await page.locator('#location-drawer>summary').click();assert.equal(await page.locator('#location-input').isVisible(),true);
  await page.locator('#location-input').focus();await page.keyboard.press('Escape');assert.equal(await page.locator('#location-drawer').evaluate(el=>el.open),false);

  await page.locator('#current-panel').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(out,'mobile-current-api-that.png')});
  await page.locator('#daily-card').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'mobile-forecast-api-that.png')});
  assert.equal(await page.locator('.weather-tabs a').count(),3); // Tổng quan, Dự báo, Chỉ số
  // Như ứng dụng điện thoại: theo giờ, 7 ngày, chỉ số và không khí hiện cùng lúc (không còn tab ẩn bớt).
  for(const id of ['#hourly-section','#forecast-section','#details-section','#current-metrics'])assert.equal(await page.locator(id).isVisible(),true,id);
  await page.locator('#weather-date').selectOption(weather.data.daily.time[1]);
  await page.locator('#forecast-list .day-open').first().click();
  assert.equal(await page.locator('#weather-date').inputValue(),'');
  assert.equal(await page.locator('#current-panel').isVisible(),true);
  await page.locator('#chart-button').click();
  await page.setViewportSize({width:320,height:844});
  const fitsChart = selector => page.waitForFunction(selector => {
    const el = document.querySelector(selector);
    const svg = el.querySelector('svg');
    return el.clientWidth > 0 && svg?.viewBox.baseVal.width === el.clientWidth && el.scrollWidth <= el.clientWidth + 1;
  }, selector);
  await fitsChart('#chart-graphic');
  await page.locator('#forecast-chart').screenshot({path:path.join(out,'mobile-weekly-chart.png')});
  await page.locator('#cards-button').click();
  assert.equal(await page.locator('#forecast-list .forecast-day').count(),7);
  assert.equal(await page.locator('#forecast-list .forecast-day').evaluateAll(cards=>cards.every(card=>card.scrollWidth<=card.clientWidth+1)),true);
  await page.locator('#forecast-list').screenshot({path:path.join(out,'mobile-weekly-list.png')});
  await fitsChart('#hourly-chart');
  await page.locator('#hourly-chart').screenshot({path:path.join(out,'mobile-hourly-chart.png')});
  await page.setViewportSize({width:390,height:844});
  await fitsChart('#hourly-chart');
  await page.locator('#refresh-button').click();
  await page.waitForFunction(()=>document.querySelector('#weather-content').getAttribute('aria-busy')==='false');
  for(const id of ['#hourly-section','#forecast-section','#details-section'])assert.equal(await page.locator(id).isVisible(),true,'sau cập nhật '+id);
  if(!await page.locator('#location-drawer').evaluate(el=>el.open))await page.locator('#location-drawer>summary').click();
  await pick(page,1);
  await page.waitForFunction(()=>document.querySelector('#weather-content').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('#place-name').innerText(),'Hà Nội');
  assert.equal(await page.locator('#forecast-section').isVisible(),true);
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#forecast-group').screenshot({path:path.join(out,'group-forecast-desktop.png')});
  await page.waitForFunction(()=>document.querySelector('#air-section').getAttribute('aria-busy')==='false');
  await page.locator('#conditions-group').screenshot({path:path.join(out,'group-air-desktop.png')});
  await page.locator('#conditions-group').screenshot({path:path.join(out,'group-indices-desktop.png')});
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'group-home-desktop.png')});
  for(const width of [320,390,550,768,1024,1440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`width=${width}`)}
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({date:new Date().toISOString(),browser:browser.version(),environment:'Chrome mô phỏng màn hình nhỏ, chưa phải điện thoại vật lý',status:'PASS',checks:['Nhiệt độ khớp phản hồi API thật','Ảnh 390 x 844 từ API thật','Không tràn trang tại 320,390,550,768,1024,1440 px','Không phát sinh lỗi JavaScript','Tìm kiếm thu gọn, mở bằng bàn phím và Escape','Ngày trước/sau/hiện tại và giới hạn 7 ngày','Biểu đồ lượng mưa khớp API','Nhắc dữ liệu cũ khi quá 90 phút'],responses},null,2));
  console.log('PASS kiểm tra màn hình nhỏ với API thật');
 }finally{await browser?.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
