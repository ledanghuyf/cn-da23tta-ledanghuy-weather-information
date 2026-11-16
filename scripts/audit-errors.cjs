// Rà soát xử lý lỗi: dữ liệu thật + cố tình gây lỗi (mất mạng, 500, 429, chậm >15 s, JSON hỏng, thiếu trường).
// Chạy: npm run audit:errors  (dùng dữ liệu thật của Open-Meteo, mất khoảng 2 phút vì có tình huống chờ quá 15 giây)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const root = process.argv[2] || path.join(__dirname, '../dist');
const server = http.createServer((q, s) => { const p = new URL(q.url, 'http://x').pathname; const f = path.join(root, p === '/' ? 'index.html' : p); fs.readFile(f, (e, b) => { if (e) { s.writeHead(404).end(); return; } s.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(f)] || 'application/octet-stream'); s.end(b); }); });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : '  → ' + detail}`); };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage();
  const jsErrors = []; page.on('pageerror', e => jsErrors.push(e.message));
  // Bộ chặn có thể đổi theo từng tình huống: null = để đi dữ liệu thật.
  const fault = { geo: null, wx: null, air: null };
  const apply = kind => async route => {
    const f = fault[kind]; if (!f) return route.continue();
    if (f === 'offline') return route.abort('internetdisconnected');
    if (f === 'slow') { await new Promise(r => setTimeout(r, 16500)); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }).catch(() => {}); }
    if (f === 'badjson') return route.fulfill({ status: 200, contentType: 'application/json', body: '{hỏng' });
    if (f === 'html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<html>bảo trì</html>' });
    if (f === 'empty') return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (f === 'nocurrent') { const res = await route.fetch(); const j = await res.json(); delete j.current; return route.fulfill({ response: res, json: j }); }
    if (f === 'badunit') { const res = await route.fetch(); const j = await res.json(); j.current_units.temperature_2m = '°F'; return route.fulfill({ response: res, json: j }); }
    if (typeof f === 'number') return route.fulfill({ status: f, contentType: 'application/json', body: '{"error":true}' });
  };
  await page.route(/geocoding-api\.open-meteo\.com/, apply('geo'));
  await page.route(/api\.open-meteo\.com\/v1\/forecast/, apply('wx'));
  await page.route(/air-quality-api\.open-meteo\.com/, apply('air'));
  const idle = () => page.waitForFunction(() => document.querySelector('#weather-content').getAttribute('aria-busy') === 'false', null, { timeout: 40000 });
  const text = sel => page.locator(sel).innerText().catch(() => '');
  const visible = sel => page.locator(sel).isVisible();
  const enabled = sel => page.locator(sel).isEnabled();
  const search = async q => { await page.fill('#location-input', q); await page.click('#search-button'); await page.waitForFunction(() => !/Đang tìm/.test(document.querySelector('#search-status').textContent), null, { timeout: 40000 }); };

  // --- Tải lần đầu khi mất mạng ---
  fault.wx = 'offline'; fault.air = 'offline';
  await page.goto(base); await idle();
  check('Mở trang khi mất mạng: báo chưa tải được', /Chưa thể tải thời tiết/.test(await text('#empty-title')), await text('#empty-title'));
  check('Mở trang khi mất mạng: thông báo nói rõ do kết nối', /Không kết nối được dịch vụ|Internet/.test(await text('#weather-status')), await text('#weather-status'));
  check('Mở trang khi mất mạng: có nút Thử tải lại', await visible('#retry-button'));
  check('Mở trang khi mất mạng: không hiện số liệu thời tiết', !(await visible('#current-panel')) || !/\d/.test(await text('#temperature')), await text('#temperature'));
  fault.wx = null; fault.air = null;
  await page.click('#retry-button'); await idle();
  check('Có mạng lại, bấm Thử tải lại: tải được thời tiết', /^-?\d+$/.test((await text('#temperature')).trim()), await text('#temperature'));
  check('Sau khi tải lại thành công: ẩn nút Thử tải lại', !(await visible('#retry-button')));
  const placeBefore = await text('#place-name'), tempBefore = await text('#temperature');

  // --- Tìm kiếm ---
  await search('xyzqwkhongcothat');
  check('Tìm không thấy: báo rõ', /Không tìm thấy địa điểm/.test(await text('#search-status')), await text('#search-status'));
  check('Tìm không thấy: nút Tìm bấm lại được', await enabled('#search-button'));
  for (const [f, re, label] of [['offline', /Không kết nối được|Internet/, 'mất mạng'], [500, /chưa phản hồi thành công/, 'lỗi 500'], [429, /giới hạn/, 'lỗi 429'], ['badjson', /định dạng|cấu trúc/, 'JSON hỏng'], ['html', /định dạng|cấu trúc/, 'trả về trang HTML']]) {
    fault.geo = f; await search('Huế');
    const st = await text('#search-status');
    check(`Tìm khi ${label}: thông báo rõ ràng`, re.test(st), st);
    check(`Tìm khi ${label}: báo đúng dịch vụ tìm địa điểm (không nói "thời tiết")`, !/thời tiết/.test(st), st);
    check(`Tìm khi ${label}: giữ nguyên nơi đang xem`, await text('#place-name') === placeBefore && await text('#temperature') === tempBefore);
    check(`Tìm khi ${label}: nút Tìm bấm lại được`, await enabled('#search-button'));
  }
  fault.geo = 'slow'; const t0 = Date.now(); await search('Huế');
  check('Tìm khi dịch vụ chậm >15 giây: báo quá thời gian', /quá nhiều thời gian/.test(await text('#search-status')), await text('#search-status'));
  check('Tìm khi dịch vụ chậm: tự dừng sau khoảng 15 giây', Date.now() - t0 < 17000, `${Date.now() - t0} ms`);
  fault.geo = null; await search('Huế');
  check('Hết lỗi, tìm lại: có kết quả', (await page.locator('.result-button').count()) > 0, await text('#search-status'));

  // --- Cập nhật thời tiết khi lỗi ---
  for (const [f, re, label] of [['offline', /Không kết nối được|Internet/, 'mất mạng'], [500, /chưa phản hồi thành công/, 'lỗi 500'], [429, /giới hạn/, 'lỗi 429'], ['badjson', /định dạng/, 'JSON hỏng'], ['html', /định dạng/, 'trả về trang HTML'], ['empty', /chưa đầy đủ|không hợp lệ/, 'dữ liệu rỗng'], ['nocurrent', /chưa đầy đủ|không hợp lệ/, 'thiếu dữ liệu hiện tại'], ['badunit', /chưa đầy đủ|không hợp lệ/, 'sai đơn vị (°F)'], ['slow', /quá nhiều thời gian/, 'chậm >15 giây']]) {
    fault.wx = f; const t1 = Date.now(); await page.click('#refresh-button'); await idle();
    const st = await text('#weather-status');
    check(`Cập nhật khi ${label}: thông báo rõ ràng`, re.test(st), st);
    check(`Cập nhật khi ${label}: báo đang giữ dữ liệu cũ`, /Đang giữ thông tin đã tải/.test(st), st);
    check(`Cập nhật khi ${label}: số liệu cũ không bị thay sai`, await text('#place-name') === placeBefore && await text('#temperature') === tempBefore, `${await text('#place-name')} ${await text('#temperature')}`);
    check(`Cập nhật khi ${label}: có nút Thử tải lại, nút Cập nhật bấm lại được`, await visible('#retry-button') && await enabled('#refresh-button'));
    if (f === 'slow') check('Cập nhật khi chậm: tự dừng sau khoảng 15 giây', Date.now() - t1 < 17500, `${Date.now() - t1} ms`);
  }
  fault.wx = null; await page.click('#retry-button'); await idle();
  check('Hết lỗi, bấm Thử tải lại: cập nhật thành công', /Đã cập nhật/.test(await text('#weather-status')) && !(await visible('#retry-button')), await text('#weather-status'));

  // --- Đổi địa điểm khi mất mạng ---
  fault.wx = 'offline';
  if (!(await page.locator('.quick-button').nth(1).isVisible())) await page.click('#location-drawer>summary').catch(() => {});
  await page.locator('.quick-button').nth(1).click(); await idle();
  check('Đổi địa điểm khi mất mạng: giữ nơi đang xem', await text('#place-name') === placeBefore, await text('#place-name'));
  check('Đổi địa điểm khi mất mạng: thông báo rõ', /Không kết nối được|Internet/.test(await text('#weather-status')), await text('#weather-status'));
  fault.wx = null; await page.click('#retry-button'); await idle();
  check('Thử lại sau khi có mạng: mở đúng nơi vừa chọn', await text('#place-name') !== placeBefore, await text('#place-name'));

  // --- Bấm đổi nơi liên tục khi mạng chậm: chỉ hiện nơi chọn cuối ---
  let slowOnce = true;
  await page.unroute(/api\.open-meteo\.com\/v1\/forecast/);
  await page.route(/api\.open-meteo\.com\/v1\/forecast/, async route => { if (slowOnce) { slowOnce = false; await new Promise(r => setTimeout(r, 4000)); } return route.continue().catch(() => {}); });
  await page.locator('.quick-button').nth(2).click(); await page.locator('.quick-button').nth(3).click(); await idle(); await page.waitForTimeout(4500);
  check('Bấm đổi nơi liên tục: hiển thị đúng nơi chọn cuối', /Đà Nẵng/.test(await text('#place-name')), await text('#place-name'));
  await page.unroute(/api\.open-meteo\.com\/v1\/forecast/); await page.route(/api\.open-meteo\.com\/v1\/forecast/, apply('wx'));

  // --- Chất lượng không khí lỗi riêng ---
  await page.locator('#tab-air-section').click(); // nút thử lại nằm trong thẻ Không khí
  fault.air = 500; await page.click('#refresh-button'); await idle();
  await page.waitForFunction(() => document.querySelector('#air-section').getAttribute('aria-busy') === 'false', null, { timeout: 30000 });
  check('Không khí lỗi: thời tiết vẫn hiển thị bình thường', /Đã cập nhật/.test(await text('#weather-status')), await text('#weather-status'));
  check('Không khí lỗi: báo rõ và có nút thử lại riêng', /Chưa tải được chất lượng không khí/.test(await text('#air-status')) && await page.locator('#air-retry').isVisible(), await text('#air-status'));
  check('Không khí lỗi: báo đúng dịch vụ (không nói "thời tiết")', !/Dịch vụ thời tiết/.test(await text('#air-status')), await text('#air-status'));
  check('Không khí lỗi: không hiện số AQI cũ', !(await page.locator('#air-values').isVisible()));
  fault.air = null; await page.locator('#air-retry').click();
  await page.waitForFunction(() => document.querySelector('#air-section').getAttribute('aria-busy') === 'false', null, { timeout: 30000 });
  check('Không khí: bấm thử lại sau khi hết lỗi thì có số liệu', await page.locator('#air-values').isVisible(), await text('#air-status'));

  // --- Biểu tượng mất kết nối ---
  await ctx.setOffline(true); await page.waitForTimeout(300);
  check('Mất mạng: hiện thông báo mất kết nối ở đầu trang', await page.locator('#connection-status').isVisible());
  await ctx.setOffline(false); await page.waitForTimeout(300);
  check('Có mạng lại: ẩn thông báo mất kết nối', !(await page.locator('#connection-status').isVisible()));

  check('Không có lỗi JavaScript trong suốt quá trình', jsErrors.length === 0, jsErrors.join(' | '));
  await browser.close(); server.close();
  const bad = results.filter(r => !r.ok).length;
  console.log(`\n${results.length} kiểm tra: ${results.length - bad} đạt, ${bad} lỗi.`); process.exitCode = bad ? 1 : 0;
})();
