// Đối chiếu dữ liệu thật (JSON Open-Meteo bắt được trên trang) với từng phần giao diện trên trang đã triển khai.
// Giá trị mong đợi tính lại độc lập từ JSON, không gọi hàm của ứng dụng.
// Chạy: npm run verify:live [-- URL trang]  (mặc định: bản đã triển khai trên Netlify)
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'https://thoitiet-ledanghuy.netlify.app/dist/';
const PLACES = [["Hà Nội",21.0245,105.84117],["Sa Pa",22.3364,103.8438],["Hạ Long",20.9517,107.0806],["Vinh",18.6733,105.6922],["Huế",16.4637,107.5909],["Đà Nẵng",16.0678,108.2208],["Quy Nhơn",13.7765,109.2237],["Đà Lạt",11.9404,108.4583],["Phan Thiết",10.9333,108.1],["TP. Hồ Chí Minh",10.82302,106.62965],["Vĩnh Long",10.2537,105.9722],["Cà Mau",9.1769,105.15]];

// ---- Quy tắc hiển thị (đặc tả), viết lại độc lập ----
const NAMES = {0:"Trời quang",1:"Ít mây",2:"Mây rải rác",3:"Nhiều mây",45:"Sương mù",48:"Sương mù đóng băng",51:"Mưa phùn nhẹ",53:"Mưa phùn vừa",55:"Mưa phùn dày",56:"Mưa phùn đóng băng nhẹ",57:"Mưa phùn đóng băng dày",61:"Mưa nhẹ",63:"Mưa vừa",65:"Mưa to",66:"Mưa đóng băng nhẹ",67:"Mưa đóng băng mạnh",71:"Tuyết nhẹ",73:"Tuyết vừa",75:"Tuyết dày",77:"Hạt tuyết",80:"Mưa rào nhẹ",81:"Mưa rào vừa",82:"Mưa rào mạnh",85:"Mưa tuyết nhẹ",86:"Mưa tuyết mạnh",95:"Dông",96:"Dông, mưa đá nhẹ",97:"Dông mạnh",99:"Dông, mưa đá mạnh"};
const RAIN = [51,53,55,56,57,61,63,65,66,67,80,81,82], STORM = [95,96,97,99];
const ratio = (s, span) => Number.isFinite(s) && span > 0 && s >= 0 && s <= span ? s / span : NaN;
function sky(code, day, r) {               // null = không áp dụng (đêm, mưa, sương…)
  if (day !== 1 || code > 3) return null;
  if (code <= 2) return "sunny";
  if (!Number.isFinite(r)) return "cloudy";
  return r >= 0.5 ? "sunny" : r >= 0.2 ? "partly" : "cloudy";
}
function expect(code, day, r) {
  const s = sky(code, day, r);
  if (s) return { label: { sunny: "Nhiều nắng", partly: "Nắng xen mây", cloudy: "Nhiều mây" }[s], symbol: { sunny: "clear", partly: "partly-cloudy", cloudy: "cloudy" }[s], theme: s };
  const symbol = code === 0 ? "moon" : [1, 2].includes(code) ? "night-cloud" : [45, 48].includes(code) ? "fog" : [71, 73, 75, 77, 85, 86].includes(code) ? "snow"
    : STORM.includes(code) ? "storm" : [80, 81, 82].includes(code) ? (day ? "showers" : "night-rain") : RAIN.includes(code) ? (day ? "rain" : "night-rain") : day ? "cloudy" : "night-cloud";
  const theme = STORM.includes(code) ? "storm" : RAIN.includes(code) ? "rain" : [0, 1].includes(code) ? "sunny" : [2, 3, 45, 48, 71, 73, 75, 77, 85, 86].includes(code) ? "cloudy" : "default";
  return { label: NAMES[code] || "Chưa có mô tả", symbol, theme };
}
const nf = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const f = n => nf.format(n), r0 = n => nf.format(Math.round(n));
const uvLevel = n => n < 3 ? "Thấp" : n < 6 ? "Trung bình" : n < 8 ? "Cao" : n < 11 ? "Rất cao" : "Cực cao";
const dir = d => ["Bắc", "Đông Bắc", "Đông", "Đông Nam", "Nam", "Tây Nam", "Tây", "Tây Bắc"][Math.round(d / 45) % 8];
const airBand = v => [[50, "Tốt"], [100, "Trung bình"], [150, "Kém với nhóm nhạy cảm"], [200, "Không tốt"], [300, "Rất không tốt"], [Infinity, "Nguy hại"]].find(([l]) => v <= l)[1];

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const summary = []; let total = 0, bad = 0;
  for (const [name, lat, lon] of PLACES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, timezoneId: "Asia/Ho_Chi_Minh" });
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    let wx = null, air = null;
    page.on("response", async res => {
      const u = res.url(); if (!res.ok()) return;
      try { if (u.includes("api.open-meteo.com/v1/forecast") && new URL(u).searchParams.has("hourly")) wx = await res.json(); else if (u.includes("air-quality-api")) air = await res.json(); } catch {}
    });
    await page.goto(`${BASE}?lat=${lat}&lon=${lon}&place=${encodeURIComponent(name)}`);
    await page.waitForFunction(() => document.querySelector("#weather-content")?.getAttribute("aria-busy") === "false" && /\d/.test(document.querySelector("#temperature").textContent), null, { timeout: 45000 });
    await page.waitForFunction(() => document.querySelectorAll(".hour-tile").length > 0, null, { timeout: 20000 });
    await page.waitForFunction(() => !/Đang lấy/.test(document.querySelector("#air-status")?.textContent || ""), null, { timeout: 20000 }).catch(() => {});
    const fails = [], ok = (cond, what, got, want) => { total++; if (!cond) { bad++; fails.push(`${what}: giao diện "${got}" ≠ dữ liệu "${want}"`); } };
    const eq = async (sel, want, what, prop = "innerText") => { const got = (await page.locator(sel).first().evaluate((el, p) => p === "href" ? el.getAttribute("href") : el[p], prop)).trim(); ok(got === want, what, got, want); };
    const c = wx.current, d = wx.daily, h = wx.hourly;

    // 1. Thời tiết hiện tại
    const cur = expect(c.weather_code, c.is_day, ratio(c.sunshine_duration, c.interval));
    await eq("#place-name", name, "Tên địa điểm");
    await eq("#temperature", r0(c.temperature_2m), "Nhiệt độ hiện tại");
    await eq("#condition", cur.label, `Tình trạng (mã ${c.weather_code}, nắng ${Math.round(ratio(c.sunshine_duration, c.interval) * 100)}%)`);
    await eq("#weather-icon use", `#${cur.symbol}`, "Biểu tượng hiện tại", "href");
    ok(await page.locator("body").getAttribute("data-weather") === cur.theme, "Nền trời", await page.locator("body").getAttribute("data-weather"), cur.theme);
    await eq("#day-label", c.is_day ? "Ban ngày" : "Ban đêm", "Ngày/đêm");
    await eq("#today-range [aria-hidden]", `C:${r0(d.temperature_2m_max[0])}°  T:${r0(d.temperature_2m_min[0])}°`, "C/T hôm nay");
    await eq("#humidity", r0(c.relative_humidity_2m), "Độ ẩm");
    await eq("#wind", f(c.wind_speed_10m), "Gió");
    await eq("#feels-like", r0(c.apparent_temperature), "Cảm nhận");
    await eq("#precipitation", f(c.precipitation), "Lượng mưa");
    const [dt, tm] = c.time.split("T");
    await eq("#data-time", `Cập nhật lúc ${tm.slice(0, 5)} · ${dt.slice(8)}/${dt.slice(5, 7)}/${dt.slice(0, 4)} · giờ địa phương`, "Mốc cập nhật");
    // Điểm cần chú ý: có mưa/giông thì phải có thẻ tương ứng
    const kinds = await page.locator("#weather-highlights .highlight").evaluateAll(els => els.map(e => e.dataset.kind));
    if (STORM.includes(c.weather_code)) ok(kinds.includes("storm"), "Cảnh báo giông", kinds.join(","), "storm");
    else if (RAIN.includes(c.weather_code) || c.precipitation > 0) ok(kinds.includes("rain"), "Cảnh báo mưa", kinds.join(","), "rain");

    // 2. Chỉ số mở rộng hiện tại
    const ex = async (key, want, label) => eq(`[data-extra="${key}"] .extra-value`, want, label);
    await ex("uv_index", `${f(c.uv_index)} · ${uvLevel(c.uv_index)}`, "UV");
    await ex("visibility", `${f(c.visibility / 1000)} km`, "Tầm nhìn");
    await ex("cloud_cover", `${f(c.cloud_cover)} %`, "Mây che phủ");
    await ex("surface_pressure", `${f(c.surface_pressure)} hPa`, "Áp suất");
    await ex("wind_direction_10m", `${dir(c.wind_direction_10m)} · ${f(c.wind_direction_10m)}°`, "Hướng gió");
    await ex("wind_gusts_10m", `${f(c.wind_gusts_10m)} km/h`, "Gió giật");
    await eq("#sunrise-time", d.sunrise[0].slice(11), "Mặt trời mọc");
    await eq("#sunset-time", d.sunset[0].slice(11), "Mặt trời lặn");
    const mins = Math.round(d.daylight_duration[0] / 60);
    await eq("#sun-duration", `Ban ngày kéo dài ${Math.floor(mins / 60)} giờ ${mins % 60} phút`, "Độ dài ban ngày");

    // 3. Không khí
    if (air?.current) {
      for (const k of ["us_aqi", "pm2_5", "pm10", "nitrogen_dioxide", "ozone"]) await eq(`#air-${k}`, f(air.current[k]), `Không khí ${k}`);
      await eq("#air-band", airBand(air.current.us_aqi), "Mức AQI");
    } else ok(false, "Không khí", "không bắt được phản hồi", "có dữ liệu");

    // 4. 24 giờ tới: từng ô khớp đúng giờ trong JSON
    const tiles = await page.locator(".hour-tile").evaluateAll(els => els.map(e => ({ time: e.dataset.time, t: e.querySelector(".hour-time").innerText, temp: e.querySelector(".hour-main-value").innerText, unit: e.querySelector(".hour-unit").innerText, icon: e.querySelector("use")?.getAttribute("href") })));
    const wantTimes = h.time.filter(t => t >= c.time).slice(0, 24);
    ok(tiles.length === 24 && tiles[0].time === wantTimes[0] && tiles.at(-1).time === wantTimes.at(-1), "Dải 24 giờ", `${tiles.length} ô ${tiles[0]?.time}→${tiles.at(-1)?.time}`, `24 ô ${wantTimes[0]}→${wantTimes.at(-1)}`);
    for (const tile of tiles) {
      const i = h.time.indexOf(tile.time), e = expect(h.weather_code[i], h.is_day[i], ratio(h.sunshine_duration[i], 3600));
      ok(tile.temp === `${f(h.temperature_2m[i])}°`, `Giờ ${tile.time.slice(11)} nhiệt độ`, tile.temp, `${f(h.temperature_2m[i])}°`);
      ok(tile.unit === `Mưa ${f(h.precipitation_probability[i])}%`, `Giờ ${tile.time.slice(11)} khả năng mưa`, tile.unit, `Mưa ${f(h.precipitation_probability[i])}%`);
      ok(tile.icon === `#${e.symbol}`, `Giờ ${tile.time.slice(11)} biểu tượng (mã ${h.weather_code[i]})`, tile.icon, `#${e.symbol}`);
    }

    // 5. Danh sách 7 ngày
    const days = await page.locator(".forecast-day").evaluateAll(els => els.map(e => ({ date: e.querySelector(".forecast-date").innerText, cond: e.querySelector(".forecast-condition").innerText, icon: e.querySelector(".forecast-icon use").getAttribute("href"), aria: e.querySelector(".forecast-icon").getAttribute("aria-label"), hi: e.querySelector(".forecast-temperature span:not(.low)").innerText, lo: e.querySelector(".forecast-temperature .low").innerText })));
    ok(days.length === 7, "Số ngày dự báo", days.length, 7);
    days.forEach((day, i) => {
      const e = expect(d.weather_code[i], 1, ratio(d.sunshine_duration[i], d.daylight_duration[i])), tag = `Ngày ${d.time[i].slice(8)}/${d.time[i].slice(5, 7)}`;
      ok(day.date === `${d.time[i].slice(8)}/${d.time[i].slice(5, 7)}`, `${tag} ngày`, day.date, d.time[i]);
      ok(day.cond === e.label && day.aria === e.label, `${tag} tình trạng (mã ${d.weather_code[i]}, nắng ${Math.round(ratio(d.sunshine_duration[i], d.daylight_duration[i]) * 100)}%)`, day.cond, e.label);
      ok(day.icon === `#${e.symbol}`, `${tag} biểu tượng`, day.icon, `#${e.symbol}`);
      ok(day.hi === `${r0(d.temperature_2m_max[i])}°` && day.lo === `${r0(d.temperature_2m_min[i])}°`, `${tag} cao/thấp`, `${day.hi}/${day.lo}`, `${r0(d.temperature_2m_max[i])}°/${r0(d.temperature_2m_min[i])}°`);
    });

    // 6. Xem từng ngày khác (1–6)
    for (let i = 1; i < 7; i++) {
      await page.locator("#weather-date").selectOption(d.time[i]);
      const e = expect(d.weather_code[i], 1, ratio(d.sunshine_duration[i], d.daylight_duration[i])), tag = `Xem ngày ${d.time[i].slice(8)}/${d.time[i].slice(5, 7)}`;
      await eq("#daily-high", `${r0(d.temperature_2m_max[i])}°`, `${tag} nhiệt độ chính`);
      await eq("#daily-hilo [aria-hidden]", `C:${r0(d.temperature_2m_max[i])}°  T:${r0(d.temperature_2m_min[i])}°`, `${tag} C/T`);
      await eq("#daily-condition", e.label, `${tag} tình trạng`);
      await eq("#daily-icon use", `#${e.symbol}`, `${tag} biểu tượng`, "href");
      ok(await page.locator("body").getAttribute("data-weather") === e.theme, `${tag} nền trời`, await page.locator("body").getAttribute("data-weather"), e.theme);
      await eq('[data-metric="precipitation_probability_max"] .daily-value', `${f(d.precipitation_probability_max[i])} %`, `${tag} xác suất mưa`);
      await eq('[data-metric="wind_speed_10m_max"] .daily-value', `${f(d.wind_speed_10m_max[i])} km/h`, `${tag} gió`);
      await eq('[data-metric="precipitation_sum"] .daily-value', `${f(d.precipitation_sum[i])} mm`, `${tag} lượng mưa`);
      await eq('[data-metric="uv_index_max"] .daily-value', f(d.uv_index_max[i]), `${tag} UV`);
      await eq("#sunrise-time", d.sunrise[i].slice(11), `${tag} mặt trời mọc`);
    }
    await page.locator("#weather-date").selectOption("");
    ok(errors.length === 0, "Lỗi JavaScript", errors.join(" | "), "không có");
    summary.push({ name, current: `${c.time.slice(11)} mã ${c.weather_code} nắng ${Math.round(ratio(c.sunshine_duration, c.interval) * 100) || 0}% → ${cur.label}`, fails });
    await page.close();
  }
  await browser.close();
  for (const s of summary) { console.log(`${s.fails.length ? "✗" : "✓"} ${s.name} (${s.current})`); s.fails.forEach(x => console.log("    - " + x)); }
  console.log(`\nĐã đối chiếu ${total} giá trị ở ${PLACES.length} địa điểm: ${total - bad} khớp, ${bad} lệch.`);
  process.exitCode = bad ? 1 : 0;
})();
