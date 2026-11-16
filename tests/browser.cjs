// Chạy: npm install, sau đó npm test. Dữ liệu mô phỏng chỉ nằm trong kiểm thử.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const evidence = path.join(root, 'docs', 'evidence-experience');
fs.mkdirSync(evidence, { recursive: true });
const results = [];
const fixture = {
  timezone: 'Asia/Ho_Chi_Minh',
  current: {time:'2026-10-09T14:15',temperature_2m:29.6,relative_humidity_2m:78,wind_speed_10m:12.3,apparent_temperature:33.1,precipitation:0.2,weather_code:61,is_day:1},
  current_units:{temperature_2m:'°C',relative_humidity_2m:'%',wind_speed_10m:'km/h',apparent_temperature:'°C',precipitation:'mm'},
  daily_units:{temperature_2m_max:'°C',temperature_2m_min:'°C',precipitation_probability_max:'%'},
  daily:{time:Array.from({length:7},(_,i)=>`2026-10-${String(9+i).padStart(2,'0')}`),temperature_2m_max:[32,33,31,32,30,32,33],temperature_2m_min:[25,25,24,25,24,25,25],weather_code:[61,3,0,80,95,2,1],precipitation_probability_max:[80,40,0,65,90,20,10]}
};
const locations = [
  {name:'Hà Nội',admin1:'Hà Nội',country:'Việt Nam',country_code:'VN',latitude:21.0245,longitude:105.8412},
  {name:'Đà Lạt',admin1:'Lâm Đồng',country:'Việt Nam',country_code:'VN',latitude:11.9404,longitude:108.4583}
];
const clone = () => structuredClone(fixture);
const server = http.createServer((req,res)=>{
  const route = new URL(req.url,'http://localhost').pathname;
  const file = path.resolve(root,'dist',route === '/' ? 'index.html' : '.'+route);
  if (!file.startsWith(path.join(root,'dist')+path.sep)) {res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
    res.end(data);
  });
});
let browser, context, page, base;
let forecast, geocoding;
const errors = [];
const json = (route, value, status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
async function ready(){await page.waitForFunction(()=>document.getElementById('weather-content').getAttribute('aria-busy')==='false');}
async function statusHas(text){await page.waitForFunction(t=>document.getElementById('weather-status').textContent.includes(t),text);}
async function openDrawer(p=page){
  if(!await p.locator('#location-drawer').evaluate(el=>el.open))await p.locator('#location-drawer>summary').click();
}
// "Địa điểm của bạn" là menu thả xuống (đóng khi bấm ra ngoài): mở ngay trước khi thao tác như người dùng thật.
async function openSaved(p=page){
  await openDrawer(p);
  if(!await p.locator('.personal-section').evaluate(el=>el.open))await p.locator('.personal-section>summary').click();
}
async function reset(){
  forecast = route=>json(route,fixture);
  geocoding = route=>json(route,{results:locations});
  await context.setOffline(false);
  // Mỗi lần reset là một lượt mở mới: bỏ nơi vừa xem đã nhớ để trang mở nơi mặc định.
  await page.evaluate(()=>localStorage.removeItem('may.last.v1')).catch(()=>{});
  await page.goto(base);
  await ready();
  await openDrawer();
}
async function search(value){await page.locator('#location-input').fill(value);await page.locator('#location-input').press('Enter');await page.waitForFunction(()=>!document.getElementById('search-button').disabled);}
async function test(name,fn){
  try{await fn(); results.push({name,status:'PASS'});console.log('PASS '+name);}
  catch(e){results.push({name,status:'FAIL',error:e.message});console.error('FAIL '+name+' '+e.message);}
}
async function main(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.env.BROWSER_PATH ? {executablePath:process.env.BROWSER_PATH,headless:true} : {channel:'chrome',headless:true});
  context = await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'America/Los_Angeles'});
  await context.route('https://air-quality-api.open-meteo.com/**', r => r.abort());
  page = await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://api.open-meteo.com/**',r=>forecast(r));
  await context.route('https://geocoding-api.open-meteo.com/**',r=>geocoding(r));
  await test('01 Tải mặc định và đối chiếu giá trị JSON',async()=>{
    await reset();assert.equal(await page.locator('#place-name').innerText(),'Vĩnh Long');
    assert.equal(await page.locator('#temperature').innerText(),'30');assert.equal(await page.locator('#humidity').innerText(),'78');
    assert.equal(await page.locator('#wind').innerText(),'12,3');assert.equal(await page.locator('#condition').innerText(),'Mưa nhẹ');
    assert.equal(await page.locator('.forecast-day').count(),7);
    assert.match(await page.locator('#data-time').innerText(),/14:15.*09\/10\/2026.*giờ địa phương/);
    assert.equal(await page.locator('.forecast-date').first().innerText(),'09/10');
  });
  await test('02 Tìm và đổi địa điểm bằng bàn phím, giữ focus',async()=>{
    await search('Hà Nội');assert.equal(await page.locator('.result-button').count(),2);
    await page.locator('.result-button').first().focus();await page.keyboard.press('Enter');await statusHas('Đã cập nhật thời tiết Hà Nội');
    assert.equal(await page.locator('#place-name').innerText(),'Hà Nội');
    assert.equal(await page.locator('.result-button').first().getAttribute('aria-pressed'),'true');
    // Chọn xong: bảng kết quả đóng, focus tới tên nơi mới (không rơi về <body>).
    await ready();assert.equal(await page.evaluate(()=>document.activeElement.id),'place-name');
    assert.equal(await page.locator('.search-dropdown').isVisible(),false);
  });
  await test('02b Mở lại nơi vừa xem khi tải lại trang; dữ liệu nhớ hỏng thì về mặc định',async()=>{
    await page.reload();await ready();assert.equal(await page.locator('#place-name').innerText(),'Hà Nội');
    await page.evaluate(()=>localStorage.setItem('may.last.v1','{hỏng'));await page.reload();await ready();
    assert.equal(await page.locator('#place-name').innerText(),'Vĩnh Long');
  });
  await test('03 Từ chối tên trống và một ký tự',async()=>{for(const value of ['',' ','a']){await search(value);assert.match(await page.locator('#search-status').innerText(),/2 đến 120/);assert.equal(await page.locator('#location-input').getAttribute('aria-invalid'),'true');}});
  await test('04 Không tìm thấy địa điểm',async()=>{geocoding=r=>json(r,{});await search('khongtontai');assert.match(await page.locator('#search-status').innerText(),/Không tìm thấy/);});
  await test('04c Gõ tên tỉnh dịch vụ không có (Gia Lai, nghe an) vẫn ra tỉnh lỵ',async()=>{
    geocoding=r=>json(r,{});
    for(const [query,town,province] of [['Gia Lai','Pleiku','Gia Lai'],['nghe an','Vinh','Nghệ An']]){
      await search(query);assert.match(await page.locator('#search-status').innerText(),/Tìm thấy 1 địa điểm/);
      assert.match(await page.locator('.result-button').first().innerText(),new RegExp(`${town}[\\s\\S]*${province}`));
    }
  });
  await test('04b Chỉ hiện địa điểm ở Việt Nam và yêu cầu dịch vụ lọc countryCode=VN',async()=>{
    const tokyo={name:'Tokyo',admin1:'Tokyo',country:'Nhật Bản',country_code:'JP',latitude:35.6895,longitude:139.6917};let asked;
    geocoding=r=>{asked=new URL(r.request().url());return json(r,{results:[locations[0],tokyo]});};
    await search('Ha');assert.equal(asked.searchParams.get('countryCode'),'VN');
    assert.deepEqual(await page.locator('.result-name').allInnerTexts(),['Hà Nội']);
    geocoding=r=>json(r,{results:[tokyo]});await search('Tokyo');
    assert.equal(await page.locator('.result-button').count(),0);assert.match(await page.locator('#search-status').innerText(),/Không tìm thấy địa điểm ở Việt Nam/);
    geocoding=r=>json(r,{results:locations});
  });
  await test('05 Kết quả tìm kiếm sai cấu trúc và thiếu tọa độ',async()=>{
    for(const data of [{results:{}},{results:[{name:'abc'}]}]){geocoding=r=>json(r,data);await search('abc');assert.equal(await page.locator('#search-status').getAttribute('data-kind'),'error');}
  });
  await test('06 Chuỗi HTML trong tên chỉ hiển thị như văn bản',async()=>{geocoding=r=>json(r,{results:[{...locations[0],name:'<img src=x onerror=alert(1)>'}]});await search('abc');assert.equal(await page.locator('#search-results img').count(),0);assert.match(await page.locator('.result-name').innerText(),/<img/);});
  await test('07 HTTP 429 giữ dữ liệu cũ và thử lại đúng địa điểm',async()=>{
    await reset();await search('Hà Nội');forecast=r=>json(r,{},429);await page.locator('.result-button').first().click();await statusHas('giới hạn');
    assert.equal(await page.locator('#place-name').innerText(),'Vĩnh Long');assert.match(await page.locator('#weather-status').innerText(),/Đang giữ thông tin/);
    await page.screenshot({path:path.join(evidence,'loi-api.png'),fullPage:true});
    forecast=r=>json(r,fixture);await page.locator('#retry-button').click();await statusHas('Đã cập nhật thời tiết Hà Nội');
  });
  await test('08 HTTP 500, JSON hỏng và JSON null',async()=>{
    for(const handler of [r=>json(r,{},500),r=>r.fulfill({body:'{broken',contentType:'application/json'}),r=>json(r,null)]){
      forecast=handler;await page.locator('#refresh-button').click();await ready();assert.equal(await page.locator('#weather-status').getAttribute('data-kind'),'error');
    }
  });
  await test('09 Từ chối dữ liệu thời tiết thiếu hoặc sai',async()=>{
    const variants=[];
    for(const key of ['relative_humidity_2m','wind_speed_10m','weather_code']){const d=clone();d.current[key]=null;variants.push(d);}
    let d=clone();d.current.relative_humidity_2m=150;variants.push(d);
    d=clone();d.current_units.temperature_2m='°F';variants.push(d);
    d=clone();d.daily.temperature_2m_max[2]=null;variants.push(d);
    d=clone();d.daily.time[1]='2026-02-30';variants.push(d);
    d=clone();d.daily.time[1]=d.daily.time[0];variants.push(d);
    d=clone();d.daily.weather_code.pop();variants.push(d);
    d=clone();d.daily.precipitation_probability_max[0]=101;variants.push(d);
    for(const value of variants){forecast=r=>json(r,value);await page.locator('#refresh-button').click();await ready();assert.match(await page.locator('#weather-status').innerText(),/chưa đầy đủ hoặc không hợp lệ/);}
  });
  await test('10 Thiếu xác suất mưa không bị hiển thị thành 0%',async()=>{const d=clone();d.daily.precipitation_probability_max[0]=null;forecast=r=>json(r,d);await page.locator('#refresh-button').click();await ready();assert.equal(await page.locator('.rain-chance').first().innerText(),'Chưa có tỷ lệ mưa');});
  await test('11 Mã thời tiết lạ có mô tả dự phòng',async()=>{const d=clone();d.current.weather_code=100;forecast=r=>json(r,d);await page.locator('#refresh-button').click();await ready();assert.equal(await page.locator('#condition').innerText(),'Chưa có mô tả');});
  await test('12 Ngoại tuyến, lỗi mạng và phục hồi',async()=>{
    await context.setOffline(true);await page.waitForFunction(()=>!document.getElementById('connection-status').hidden);
    forecast=r=>r.abort('internetdisconnected');await page.locator('#refresh-button').click();await ready();assert.match(await page.locator('#weather-status').innerText(),/Kiểm tra Internet/);
    await context.setOffline(false);forecast=r=>json(r,fixture);await page.locator('#retry-button').click();await ready();assert.equal(await page.locator('#connection-status').isVisible(),false);
  });
  await test('13 Lỗi lần tải đầu và thử lại',async()=>{forecast=r=>r.abort('failed');await page.reload();await ready();assert.equal(await page.locator('#empty-view').isVisible(),true);assert.equal(await page.locator('#weather-view').isVisible(),false);forecast=r=>json(r,fixture);await page.locator('#retry-button').click();await ready();assert.equal(await page.locator('#weather-view').isVisible(),true);});
  await test('14 Hết thời gian chờ 15 giây',async()=>{
    await page.clock.install();forecast=()=>{};await page.locator('#refresh-button').click();await page.clock.fastForward(16000);await ready();assert.match(await page.locator('#weather-status').innerText(),/quá nhiều thời gian/);await page.clock.resume();
  });
  await test('15 Đổi địa điểm nhanh, kết quả cuối cùng thắng',async()=>{
    await reset();await search('abc');let old;
    forecast=r=>{if(new URL(r.request().url()).searchParams.get('latitude')==='21.0245')old=r;else return json(r,fixture);};
    await page.locator('.result-button').first().click();await page.waitForFunction(()=>document.getElementById('weather-status').textContent.includes('Đang tải'));
    await page.locator('.result-button').nth(1).click();await statusHas('Đã cập nhật thời tiết Đà Lạt');
    if(old)await json(old,{...clone(),current:{...fixture.current,temperature_2m:-50}}).catch(()=>{});
    assert.equal(await page.locator('#place-name').innerText(),'Đà Lạt');assert.equal(await page.locator('#temperature').innerText(),'30');
  });
  await test('16 Tìm liên tiếp, kết quả cũ không ghi đè',async()=>{
    let old;geocoding=r=>{if(new URL(r.request().url()).searchParams.get('name')==='cu')old=r;else return json(r,{results:[locations[1]]});};
    await page.locator('#location-input').fill('cu');await page.locator('#location-input').press('Enter');
    await page.waitForFunction(()=>document.getElementById('search-button').disabled);
    await page.locator('#location-input').fill('moi');
    // Form có thể được gửi lại khi nút bị vô hiệu hóa (ví dụ công cụ trình duyệt).
    await page.locator('#search-form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    await page.waitForFunction(()=>!document.getElementById('search-button').disabled);
    if(old)await json(old,{results:[locations[0]]}).catch(()=>{});
    assert.equal(await page.locator('.result-name').innerText(),'Đà Lạt');
  });
  await test('17 Màn hình 320, 390, 768, 1024, 1440 px không tràn ngang',async()=>{
    await reset();for(const width of [320,390,768,1024,1366,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,`Overflow ${width}`);await page.screenshot({path:path.join(evidence,`giaolap-${width}.png`),fullPage:true});}
  });
  await test('18 Không có lỗi JavaScript chưa xử lý',async()=>assert.deepEqual(errors,[]));
  await test('22 Biểu đồ dùng đúng 7 ngày và đổi về thẻ',async()=>{
    await reset();await page.locator('#tab-forecast-section').click();await page.locator('#chart-button').click();
    assert.equal(await page.locator('#forecast-chart').isVisible(),true);
    assert.equal(await page.locator('#forecast-list').isVisible(),false);
    assert.equal(await page.locator('#chart-data tbody tr').count(),7);
    assert.equal(await page.locator('#chart-data tbody tr').first().innerText(),'09/10\t32\t25');
    assert.equal(await page.locator('#chart-graphic circle').count(),14);
    await page.screenshot({path:path.join(evidence,'bieu-do.png'),fullPage:true});
    const warmer=clone();warmer.daily.temperature_2m_max=warmer.daily.temperature_2m_max.map(n=>n+5);
    forecast=r=>json(r,warmer);await page.locator('#refresh-button').click();await ready();
    assert.equal(await page.locator('#forecast-chart').isVisible(),true);
    assert.equal(await page.locator('#chart-data tbody tr').first().innerText(),'09/10\t37\t25');
    await page.setViewportSize({width:320,height:850});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    await page.locator('#cards-button').click();assert.equal(await page.locator('#forecast-list').isVisible(),true);
  });
  await test('23 Địa điểm nhanh cập nhật tên, dữ liệu và trạng thái chọn',async()=>{
    await page.locator('.quick-button').nth(3).click();await statusHas('Đã cập nhật thời tiết Đà Nẵng');
    assert.equal(await page.locator('#place-name').innerText(),'Đà Nẵng');
    assert.equal(await page.locator('.quick-button').nth(3).getAttribute('aria-pressed'),'true');
    // Điện thoại: chọn xong ngăn kéo tự đóng để thấy thời tiết; mở lại để chọn nơi khác.
    await openDrawer();await page.locator('.quick-button').first().click();await statusHas('Đã cập nhật thời tiết Vĩnh Long');
  });
  await test('24 Biểu tượng và bối cảnh ngày, đêm, mưa đúng dữ liệu',async()=>{
    for(const [code,isDay,symbol,scene] of [[0,1,'clear','day'],[0,0,'moon','night'],[61,1,'rain','rain'],[95,1,'storm','storm']]){
      const d=clone();d.current.weather_code=code;d.current.is_day=isDay;forecast=r=>json(r,d);
      await page.locator('#refresh-button').click();await ready();
      assert.equal(await page.locator('#current-panel').getAttribute('data-scene'),scene);
      assert.equal(await page.locator('#weather-icon use').getAttribute('href'),`#${symbol}`);
      if(scene==='night'){
        await page.setViewportSize({width:1366,height:900});
        await page.screenshot({path:path.join(evidence,'ban-dem.png'),fullPage:true});
      }
    }
    assert.equal(await page.locator('#humidity-fill').evaluate(el=>el.style.width),'78%');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.weather-icon').evaluate(el=>getComputedStyle(el).animationName),'none');
    assert.deepEqual(errors,[]);
  });
  await test('25 Lưu yêu thích, chống trùng và tải lại trang',async()=>{
    await reset();await page.evaluate(()=>localStorage.clear());await page.reload();await ready();await openDrawer();
    await page.locator('#save-location').click();
    assert.equal(await page.locator('#favorite-list .personal-place').count(),1);
    assert.equal(await page.locator('#save-location').getAttribute('aria-pressed'),'true');
    await page.reload();await ready();await openDrawer();assert.equal(await page.locator('#favorite-list .personal-place').count(),1);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('may.locations.v1')));
    assert.equal(saved.favorites[0].name,'Vĩnh Long');assert.equal(saved.history.length,1);
    assert.equal(JSON.stringify(saved).includes('temperature'),false);
    await page.locator('.quick-button').nth(1).click();await ready();
    await openSaved();await page.locator('#favorite-list .personal-place').click();await ready();
    assert.equal(await page.locator('#place-name').innerText(),'Vĩnh Long');
    await openSaved();await page.locator('#favorite-list .remove-place').click();assert.equal(await page.locator('#favorite-list .personal-place').count(),0);
  });
  await test('26 Lịch sử không trùng, không ghi lần tải lỗi, xóa độc lập yêu thích',async()=>{
    await page.locator('#save-location').click();await openSaved();await page.locator('#clear-history').click();
    assert.equal(await page.locator('#history-list .personal-place').count(),0);
    assert.equal(await page.locator('#favorite-list .personal-place').count(),1);
    forecast=r=>json(r,{},500);await page.locator('.quick-button').nth(2).click();await ready();
    assert.equal(await page.locator('#history-list .personal-place').count(),0);
    forecast=r=>json(r,fixture);await page.locator('#retry-button').click();await ready();
    await page.locator('#refresh-button').click();await ready();
    assert.equal(await page.locator('#history-list .personal-place').count(),1);
  });
  await test('33 Dữ liệu lưu hỏng, giới hạn danh sách và chống chèn HTML',async()=>{
    await page.evaluate(()=>localStorage.setItem('may.locations.v1','{broken'));await reset();assert.equal(await page.locator('#favorite-list .personal-place').count(),0);
    await page.evaluate(()=>localStorage.setItem('may.locations.v1',JSON.stringify({version:1,favorites:[null,{name:'x',latitude:999,longitude:0},{name:'<img src=x onerror=alert(1)>',country:'<b>VN</b>',latitude:1,longitude:2}],history:[]})));
    await reset();await openSaved();assert.equal(await page.locator('#favorite-list img,#favorite-list b').count(),0);assert.match(await page.locator('#favorite-list').innerText(),/<img/);
    await page.evaluate(()=>localStorage.setItem('may.locations.v1',JSON.stringify({version:1,favorites:Array.from({length:6},(_,i)=>({name:'Nơi '+i,latitude:i,longitude:i})),history:Array.from({length:20},(_,i)=>({name:'Nơi '+i,latitude:i,longitude:i}))})));
    await reset();await page.locator('#save-location').click();assert.match(await page.locator('#saved-status').innerText(),/Đã đủ 6/);
    assert.equal(await page.locator('#favorite-list .personal-place').count(),6);assert.equal(await page.locator('#history-list .personal-place').count(),8);
  });
  await test('34 Trình duyệt chặn lưu vẫn tra cứu được',async()=>{
    await page.evaluate(()=>localStorage.clear());
    await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Blocked','SecurityError');};});
    await reset();await page.locator('#save-location').click();
    assert.match(await page.locator('#saved-status').innerText(),/chỉ được giữ trong lần mở trang/);
    assert.equal(await page.locator('#favorite-list .personal-place').count(),1);
    await page.locator('.quick-button').nth(1).click();await ready();assert.equal(await page.locator('#place-name').innerText(),'Hà Nội');
    assert.deepEqual(errors,[]);
  });
  await require('./experience-checks.cjs')({page,test,baseFixture:fixture,setForecast:handler=>{forecast=handler;},json,ready,evidence});
  await require('./dashboard-checks.cjs')({page,test,baseFixture:fixture,setForecast:handler=>{forecast=handler;},json,ready,evidence});
  await require('./location-checks.cjs')({page,test,baseFixture:fixture,setForecast:handler=>{forecast=handler;},json,ready,evidence});
  await test('56 Logo, ảnh minh họa, biểu tượng SVG cục bộ và bố cục máy tính/điện thoại ở 320–1440 px',async()=>{
    await reset();
    for(const width of [320,360,390,430,768,1024,1440]){
      await page.setViewportSize({width,height:900});
      await page.evaluate(()=>{for(const img of document.querySelectorAll('img'))img.scrollIntoView();window.scrollTo(0,0);});
      const check=await page.evaluate(()=>{
        const imgs=[...document.querySelectorAll('img')].map(img=>{
          const r=img.getBoundingClientRect(),p=img.parentElement.getBoundingClientRect();
          const clipped=r.width===0||r.height===0||r.left<p.left-1||r.right>p.right+1||r.top<p.top-1||r.bottom>p.bottom+1;
          return {src:img.getAttribute('src'),wAttr:img.getAttribute('width'),hAttr:img.getAttribute('height'),nw:img.naturalWidth,clipped};
        });
        const svgsWithoutSize=[...document.querySelectorAll('svg:not(.icon-definitions)')].filter(s=>!s.getAttribute('width')||!s.getAttribute('height')).length;
        const uses=[...document.querySelectorAll('use')].map(u=>{
          const href=u.getAttribute('href')||'';
          const svg=u.closest('svg');
          const hidden=Boolean(u.closest('[hidden]'))||Boolean(u.closest('details:not([open])>:not(summary)'))||(svg&&getComputedStyle(svg).display==='none');
          const sr=svg?svg.getBoundingClientRect():{width:0,height:0};
          const ur=u.getBoundingClientRect();
          return {href,local:href.startsWith('#')&&Boolean(document.querySelector(href)),hidden,zero:!hidden&&(sr.width===0||sr.height===0||ur.width===0||ur.height===0)};
        });
        const shell=getComputedStyle(document.querySelector('.app-shell'));
        const sidebar=getComputedStyle(document.querySelector('.sidebar'));
        const summary=getComputedStyle(document.querySelector('#location-drawer>summary'));
        return {
          overflow:document.documentElement.scrollWidth>window.innerWidth,
          imgs,
          svgsWithoutSize,
          externalUses:uses.filter(u=>!u.href.startsWith('#')).length,
          missingSymbols:uses.filter(u=>!u.local).length,
          zeroUses:uses.filter(u=>u.zero).length,
          shellDisplay:shell.display,
          sidebarPosition:sidebar.position,
          summaryDisplay:summary.display
        };
      });
      assert.equal(check.overflow,false,`Overflow at ${width}`);
      assert.equal(check.svgsWithoutSize,0,`SVG missing width/height at ${width}`);
      assert.equal(check.externalUses,0,`External <use> at ${width}`);
      assert.equal(check.missingSymbols,0,`Missing symbol at ${width}`);
      assert.equal(check.zeroUses,0,`Zero-size visible <use> at ${width}`);
      if(width>760){
        assert.equal(check.shellDisplay,'grid',`Desktop shell display at ${width}`);
        assert.equal(check.sidebarPosition,'sticky',`Desktop sidebar position at ${width}`);
        assert.equal(check.summaryDisplay,'none',`Desktop drawer summary display at ${width}`);
      }else{
        assert.equal(check.shellDisplay,'block',`Mobile shell display at ${width}`);
        assert.equal(check.summaryDisplay,'flex',`Mobile drawer summary display at ${width}`);
      }
      for(const img of check.imgs){
        assert.ok(img.nw>0,`Image naturalWidth=0 (${img.src}) at ${width}`);
        assert.ok(img.wAttr&&img.hAttr,`Image missing width/height (${img.src}) at ${width}`);
        assert.ok(img.src.includes('?v=3.0.0'),`Image version query (${img.src}) at ${width}`);
        assert.equal(img.clipped,false,`Image clipped (${img.src}) at ${width}`);
      }
    }
  });
  await test('41 Không có lỗi JavaScript sau toàn bộ tính năng mới',async()=>assert.deepEqual(errors,[]));
  await context.close();
  // API thật: tách riêng để không nhầm kết quả mô phỏng với kết nối Internet.
  const live = await browser.newContext({viewport:{width:1440,height:1050}});
  const livePage = await live.newPage();
  const liveResponses = [];
  livePage.on('response',async r=>{if(/open-meteo.com\/v1\//.test(r.url())){try{liveResponses.push({url:r.url(),status:r.status(),data:await r.json()});}catch{}}});
  await test('19 API thật tải Vĩnh Long từ trình duyệt',async()=>{
    await livePage.goto(base);await livePage.waitForFunction(()=>document.getElementById('weather-content').getAttribute('aria-busy')==='false',{},{timeout:25000});
    assert.equal(await livePage.locator('#weather-view').isVisible(),true,await livePage.locator('#weather-status').innerText());
    const response=liveResponses.find(r=>r.url.includes('api.open-meteo.com/v1/forecast'));
    assert.ok(response);assert.equal(await livePage.locator('#humidity').innerText(),new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(Math.round(response.data.current.relative_humidity_2m)));
    await livePage.screenshot({path:path.join(evidence,'thucte-desktop.png'),fullPage:true});
    await livePage.setViewportSize({width:390,height:844});await livePage.screenshot({path:path.join(evidence,'thucte-mobile.png'),fullPage:true});
    await livePage.locator('#current-panel').scrollIntoViewIfNeeded();
    await livePage.screenshot({path:path.join(evidence,'mobile-current.png')});
    await livePage.locator('#tab-forecast-section').click();
    await livePage.locator('#forecast-list').scrollIntoViewIfNeeded();
    await livePage.screenshot({path:path.join(evidence,'mobile-forecast.png')});
    await livePage.setViewportSize({width:1440,height:1050});
  });
  for(const [index,city] of ['Hanoi','Hue'].entries()) await test(`${20+index} API thật tìm và chọn ${city}`,async()=>{
    await openDrawer(livePage);
    await livePage.locator('#location-input').fill(city);await livePage.locator('#location-input').press('Enter');
    await livePage.waitForFunction(()=>!document.getElementById('search-button').disabled);
    assert.ok(await livePage.locator('.result-button').count(),await livePage.locator('#search-status').innerText());
    const name=await livePage.locator('.result-name').first().innerText();await livePage.locator('.result-button').first().click();
    await livePage.waitForFunction(()=>document.getElementById('weather-content').getAttribute('aria-busy')==='false');
    assert.equal(await livePage.locator('#place-name').innerText(),name);assert.equal(await livePage.locator('#weather-status').getAttribute('data-kind'),'success');
  });
  await test('35 API thật: lưu yêu thích, tải lại mở đúng nơi vừa xem, mở lại từ yêu thích',async()=>{
    const liveReady=()=>livePage.waitForFunction(()=>document.getElementById('weather-content').getAttribute('aria-busy')==='false');
    await livePage.locator('#save-location').click();assert.equal(await livePage.locator('#save-location').getAttribute('aria-pressed'),'true');
    await livePage.screenshot({path:path.join(evidence,'toan-trang-moi.png'),fullPage:true});
    await livePage.reload();await liveReady();assert.match(await livePage.locator('#place-name').innerText(),/Hu[eế]/i);
    await openDrawer(livePage);await livePage.locator('.quick-button').nth(1).click();await liveReady();
    assert.equal(await livePage.locator('#place-name').innerText(),'Hà Nội');
    await openSaved(livePage);
    assert.equal(await livePage.locator('#favorite-list .personal-place').count(),1);
    await livePage.locator('#favorite-list .personal-place').click();await liveReady();
    assert.match(await livePage.locator('#place-name').innerText(),/Hu[eế]/i);
  });
  await test('42 API thật có hourly/UV, gợi ý khớp số liệu và chủ đề khớp mã',async()=>{
    const response=[...liveResponses].reverse().find(r=>new URL(r.url).searchParams.has('hourly'));
    assert.ok(response);assert.equal(response.status,200);assert.ok(response.data.hourly.time.length>=24);
    assert.equal(response.data.hourly_units.uv_index,'');assert.ok('uv_index' in response.data.current);
    const expected=await livePage.evaluate(data=>({theme:MayTheme.select(data.current),...MayAdvice.chooseSlots(data,'walk',data.current.time.slice(0,10))}),response.data);
    assert.equal(await livePage.locator('body').getAttribute('data-weather'),expected.theme.weather);
    assert.equal(await livePage.locator('body').getAttribute('data-phase'),expected.theme.phase);
    assert.equal(await livePage.locator('.activity-slot').count(),0);
    await livePage.locator('#activity-select').selectOption('walk');
    assert.equal(await livePage.locator('#activity-hour-detail').isVisible(),false);
    if(expected.allSlots.length){await livePage.locator('#activity-hour').selectOption(expected.allSlots[0].start);assert.match(await livePage.locator('#activity-hour-detail').innerText(),/Đi bộ/);}
    for(const slot of expected.slots){const index=response.data.hourly.time.indexOf(slot.start);assert.ok(index>=0);assert.equal(response.data.hourly.is_day[index],1);assert.equal(response.data.hourly.is_day[index+1],1);assert.equal(slot.rain,Math.max(...response.data.hourly.precipitation_probability.slice(index,index+2)));}
    await livePage.locator('#advice-section').screenshot({path:path.join(evidence,'goi-y-api-that.png')});
    const lastDate=response.data.daily.time[6];
    await livePage.locator('#activity-date').selectOption(lastDate);
    const later=await livePage.evaluate(({data,date})=>MayAdvice.chooseSlots(data,'walk',date).slots,{data:response.data,date:lastDate});
    assert.equal(await livePage.locator('.activity-slot').count(),0);assert.equal(await livePage.locator('#activity-hour-detail').isVisible(),false);
    assert.match(await livePage.locator('#activity-period').innerText(),new RegExp(lastDate.slice(8)+'/'+lastDate.slice(5,7)));
    await livePage.locator('#activity-date').selectOption('');
  });
  await test('45 Xem ngày API thật khớp nhiệt độ, gió và UV trả về',async()=>{
    const response=[...liveResponses].reverse().find(r=>new URL(r.url).searchParams.has('hourly'));
    const data=response.data,index=3;
    await livePage.locator('#weather-date').selectOption(data.daily.time[index]);
    const f=value=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(value);
    const r=value=>f(Math.round(value));
    assert.equal(await livePage.locator('#daily-high').innerText(),r(data.daily.temperature_2m_max[index])+'°');
    assert.equal(await livePage.locator('#daily-hilo [aria-hidden="true"]').innerText(),`C:${r(data.daily.temperature_2m_max[index])}°  T:${r(data.daily.temperature_2m_min[index])}°`);
    assert.equal(await livePage.locator('[data-metric="wind_speed_10m_max"] .daily-value').innerText(),f(data.daily.wind_speed_10m_max[index])+' km/h');
    assert.equal(await livePage.locator('[data-metric="uv_index_max"] .daily-value').innerText(),f(data.daily.uv_index_max[index]));
    await livePage.locator('#daily-view').screenshot({path:path.join(evidence,'du-bao-ngay-api-that.png')});
    await livePage.locator('#weather-date').selectOption('');assert.equal(await livePage.locator('#current-panel').isVisible(),true);
  });
  await test('47 Dashboard API thật: theo giờ, mặt trời và chỉ số mở rộng khớp JSON',async()=>{
    const response=[...liveResponses].reverse().find(r=>new URL(r.url).searchParams.has('hourly'));const data=response.data;
    assert.ok(data.hourly.temperature_2m.length);assert.equal(data.daily_units.sunrise,'iso8601');assert.equal(data.current_units.visibility,'m');
    const index=data.hourly.time.findIndex(time=>time>=data.current.time);const f=n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(n);
    assert.equal(await livePage.locator('.hour-main-value').first().innerText(),f(data.hourly.temperature_2m[index])+'°');
    assert.equal(await livePage.locator('#sunrise-time').innerText(),data.daily.sunrise[0].slice(11));
    assert.equal(await livePage.locator('[data-extra="visibility"] .extra-value').innerText(),f(data.current.visibility/1000)+' km');
    await livePage.locator('#hourly-section').screenshot({path:path.join(evidence,'dashboard-api-that.png')});
  });
  fs.writeFileSync(path.join(evidence,'api-responses.json'),JSON.stringify(liveResponses,null,2));
  fs.writeFileSync(path.join(evidence,'test-results.json'),JSON.stringify({date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date()),browser:await browser.version(),timezone:'Asia/Saigon',results,limitations:'Viewport mô phỏng trên Chrome desktop; chưa thử điện thoại vật lý, Safari hoặc Firefox.'},null,2));
  await live.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();if(results.some(r=>r.status==='FAIL'))process.exitCode=1;});
