const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/evidence-navigation');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;const f=path.join(root,'dist',p==='/'?'index.html':p);fs.readFile(f,(err,data)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream');res.end(data)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],checks=[];
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const width of [390,630,1440]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:668},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/#comparison-section`);
   await page.waitForFunction(()=>document.querySelector('#weather-content').getAttribute('aria-busy')==='false');
   assert.equal(await page.locator('#weather-status').getAttribute('data-kind'),'success');
   const active=()=>page.locator('.weather-tabs a[aria-current="location"]');
   await page.waitForFunction(()=>document.querySelector('.weather-tabs a[aria-current="location"]')?.hash==='#comparison-section');
   assert.equal(await active().count(),1);checks.push(`Direct comparison link ${width}`);
   await page.screenshot({path:path.join(out,`comparison-${width}.png`)});
   for(const hash of ['#advice-section','#comparison-section','#forecast-group','#conditions-group','#weather-content']){
    await page.locator(`.weather-tabs a[href="${hash}"]`).click();
    await page.waitForFunction(h=>document.querySelector('.weather-tabs a[aria-current="location"]')?.hash===h,hash);
    assert.equal(await active().count(),1);
   }
   checks.push(`All navigation clicks ${width}`);
   await page.evaluate(()=>{window.dispatchEvent(new WheelEvent('wheel'));scrollTo(0,document.documentElement.scrollHeight)});
   await page.waitForFunction(()=>document.querySelector('.weather-tabs a[aria-current="location"]')?.hash==='#comparison-section');
   await page.evaluate(()=>{window.dispatchEvent(new WheelEvent('wheel'));document.querySelector('#advice-section').scrollIntoView({block:'start'})});
   // In a tall viewport two short final sections may both fit; return to the long forecast section.
   await page.evaluate(()=>{window.dispatchEvent(new WheelEvent('wheel'));document.querySelector('#forecast-group').scrollIntoView({block:'start'})});
   await page.waitForFunction(()=>document.querySelector('.weather-tabs a[aria-current="location"]')?.hash==='#forecast-group');
   checks.push(`Manual scroll and page bottom ${width}`);
   await page.evaluate(()=>{window.dispatchEvent(new WheelEvent('wheel'));scrollTo(0,0)});
   if(width<761){
    assert.equal(await page.locator('#location-drawer>summary svg').count(),0);
    assert.equal(await page.locator('#location-drawer').evaluate(el=>el.open),false);
    await page.screenshot({path:path.join(out,`drawer-closed-${width}.png`)});
    await page.locator('#location-drawer>summary').click();
    assert.equal(await page.locator('#location-input').isVisible(),true);assert.equal(await page.locator('#place-map').isVisible(),true);assert.equal(await page.locator('.quick-button').first().isVisible(),true);
    await page.screenshot({path:path.join(out,`drawer-open-${width}.png`)});
    await page.locator('#location-input').focus();await page.keyboard.press('Escape');assert.equal(await page.locator('#location-drawer').evaluate(el=>el.open),false);
    checks.push(`Drawer opens and closes ${width}`);
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({date:new Date().toISOString(),status:'PASS',checks,errors},null,2));console.log(`PASS ${checks.length} navigation/drawer checks with live API`);
 }finally{await browser?.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
