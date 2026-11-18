"use strict";
// Chỉ số bổ sung độc lập với dữ liệu lõi: thiếu dữ liệu không làm mất trang thời tiết.
globalThis.MayDashboardData = (() => {
  const specs = {
    temperature_2m: ["Nhiệt độ", "°C", -Infinity, Infinity],
    apparent_temperature: ["Cảm nhận", "°C", -Infinity, Infinity],
    precipitation_probability: ["Xác suất mưa", "%", 0, 100],
    precipitation: ["Lượng mưa", "mm", 0, Infinity],
    relative_humidity_2m: ["Độ ẩm", "%", 0, 100],
    wind_speed_10m: ["Gió", "km/h", 0, Infinity],
    uv_index: ["UV", "", 0, Infinity],
    cloud_cover: ["Mây che phủ", "%", 0, 100],
    surface_pressure: ["Áp suất bề mặt", "hPa", 1, Infinity],
    visibility: ["Tầm nhìn", "m", 0, Infinity],
    wind_direction_10m: ["Hướng gió", "°", 0, 360],
    wind_gusts_10m: ["Gió giật", "km/h", 0, Infinity],
  };
  function value(data, group, key, index = null) {
    const spec = specs[key];
    if (!spec || data?.[`${group}_units`]?.[key] !== spec[1]) return null;
    const values = data?.[group]?.[key];
    if (index !== null && (!Array.isArray(values) || values.length !== data?.[group]?.time?.length)) return null;
    const n = index === null ? values : values[index];
    return Number.isFinite(n) && n >= spec[2] && n <= spec[3] ? n : null;
  }
  function hours(data, selectedDate = "") {
    const now = MayAdvice.localStamp(data?.current?.time);
    if (!Number.isFinite(now) || !Array.isArray(data?.hourly?.time)) return [];
    if (selectedDate && !Number.isFinite(MayAdvice.localStamp(`${selectedDate}T00:00`))) return [];
    const seen = new Set();
    return data.hourly.time.flatMap((time, index) => {
      const stamp = MayAdvice.localStamp(time);
      if (!Number.isFinite(stamp) || seen.has(stamp)) return [];
      seen.add(stamp);
      // Chọn ngày cho xem cả ngày (kể cả giờ đã qua); mặc định chỉ 24 giờ tới.
      if (selectedDate ? time.slice(0, 10) !== selectedDate : stamp < now || stamp >= now + 86400000) return [];
      const read = key => value(data, "hourly", key, index);
      const extra = (key, unit, allowed) => {
        const arr = data.hourly[key], n = arr?.[index];
        return Array.isArray(arr) && arr.length === data.hourly.time.length && data.hourly_units?.[key] === unit && allowed(n) ? n : null;
      };
      const row = { time, stamp, index, ...Object.fromEntries(Object.keys(specs).map(key => [key, read(key)])),
        code: extra("weather_code", "wmo code", Number.isInteger), day: extra("is_day", "", n => n === 0 || n === 1),
        sun: MayTheme.ratio(extra("sunshine_duration", "s", Number.isFinite) ?? NaN, 3600) };
      // Ban đêm gọi tên theo mây che phủ, giống khối hiện tại (xem MayTheme.nightCode).
      if (row.code !== null) row.code = MayTheme.nightCode(row.code, row.day, extra("cloud_cover", "%", Number.isFinite) ?? NaN);
      return [row];
    }).sort((a, b) => a.stamp - b.stamp).slice(0, 24);
  }
  function sun(data, date) {
    const index = data.daily?.time?.indexOf(date);
    const time = key => {
      const values = data.daily?.[key], t = values?.[index];
      return index >= 0 && Array.isArray(values) && values.length === data.daily.time.length && data.daily_units?.[key] === "iso8601" &&
        Number.isFinite(MayAdvice.localStamp(t)) && t.slice(0, 10) === date ? t : null;
    };
    const rise = time("sunrise"), set = time("sunset");
    const duration = data.daily?.daylight_duration;
    const seconds = index >= 0 && Array.isArray(duration) && duration.length === data.daily.time.length && data.daily_units?.daylight_duration === "s" &&
      Number.isFinite(duration[index]) && duration[index] >= 0 && duration[index] <= 86400 ? duration[index] : null;
    return { rise, set, seconds };
  }
  const direction = degrees => Number.isFinite(degrees) && degrees >= 0 && degrees <= 360
    ? ["Bắc", "Đông Bắc", "Đông", "Đông Nam", "Nam", "Tây Nam", "Tây", "Tây Bắc"][Math.round(degrees / 45) % 8] : null;
  // Thang UV của WHO.
  const uvLevel = n => n < 3 ? "Thấp" : n < 6 ? "Trung bình" : n < 8 ? "Cao" : n < 11 ? "Rất cao" : "Cực cao";
  const num = n => String(Math.round(n * 10) / 10).replace(".", ",");
  // Lệch theo số đã làm tròn như trên thẻ (27° / 35° → 8°); trả 0 khi dưới 3° (không đáng nhấn).
  const feelsGap = (temp, feels) => {
    const gap = temp === null || feels === null ? 0 : Math.round(feels) - Math.round(temp);
    return Math.abs(gap) >= 3 ? gap : 0;
  };
  // Tối đa 3 điểm cần chú ý trong 12 giờ tới, xếp theo mức ảnh hưởng; không có gì đáng chú ý thì [] (ẩn hẳn, không hiện ô "yên ổn").
  // air: { aqi, label } của nơi đang xem khi đã tải được chất lượng không khí (không có thì bỏ qua).
  function highlights(data, air = null) {
    const now = key => value(data, "current", key), next = hours(data).slice(0, 12), items = [];
    const rainNow = now("precipitation"), rainHour = next.find(r => r.precipitation_probability >= 50);
    // Mã thời tiết hiện tại báo mưa/giông vẫn tính là đang mưa dù lượng đo được bằng 0.
    const code = data?.current?.weather_code, storm = MayWeatherConfig.stormCodes.includes(code);
    if (rainNow > 0 || storm || MayWeatherConfig.rainCodes.includes(code)) items.push({ kind: storm ? "storm" : "rain", icon: "i-rain", title: storm ? "Đang có giông" : "Đang có mưa",
      text: rainNow > 0 ? `Vừa ghi nhận ${num(rainNow)} mm · nhớ mang ô` : storm ? "Ưu tiên ở trong nhà, tránh nơi trống trải" : "Theo dữ liệu hiện tại · nhớ mang ô" });
    else if (rainHour) items.push({ kind: "rain", icon: "i-rain", title: `Có thể mưa lúc ${rainHour.time.slice(11)}`, text: `Khả năng ${num(rainHour.precipitation_probability)}% · nên mang ô` });
    // Thang US AQI: trên 100 là kém với nhóm nhạy cảm, trên 150 là không tốt cho mọi người.
    if (air?.aqi > 100) items.push({ kind: "air", icon: "i-wind", title: `Không khí ${air.label.toLowerCase()} (AQI ${num(air.aqi)})`,
      text: air.aqi > 150 ? "Hạn chế ra ngoài, đeo khẩu trang khi cần" : "Người nhạy cảm nên hạn chế ở ngoài lâu" });
    const uv = [{ time: "", uv_index: now("uv_index") }, ...next].filter(r => r.uv_index !== null).sort((a, b) => b.uv_index - a.uv_index)[0];
    if (uv?.uv_index >= 6) items.push({ kind: "uv", icon: "i-sun", title: `UV ${uvLevel(uv.uv_index).toLowerCase()} (${num(uv.uv_index)})`, text: uv.time ? `Mạnh nhất lúc ${uv.time.slice(11)} · che nắng khi ra ngoài` : "Đang ở mức này · che nắng khi ra ngoài" });
    const gust = now("wind_gusts_10m");
    if (gust >= 40) items.push({ kind: "wind", icon: "i-wind", title: `Gió giật ${num(gust)} km/h`, text: "Cẩn thận khi đi xe máy, tránh đứng dưới cây" });
    return items.slice(0, 3);
  }
  return { specs, value, hours, sun, direction, uvLevel, feelsGap, highlights };
})();

(() => {
  if (typeof document === "undefined") return;
  const dataTools = MayDashboardData;
  const node = (tag, cls, text) => { const el = document.createElement(tag); el.className = cls; if (text !== undefined) el.textContent = text; return el; };
  const hourlyChart = $("hourly-chart");
  let source = null, selectedDate = "", selectedHour = "", mode = "temperature_2m";
  let chartRows = [], chartWidth = 0;
  const stampLabel = time => `${time.slice(11)} · ${time.slice(8, 10)}/${time.slice(5, 7)}`;
  const metricText = (key, n) => n === null ? "Chưa có dữ liệu" : `${formatNumber(n)}${dataTools.specs[key][1] ? ` ${dataTools.specs[key][1]}` : ""}`;
  function renderHourDetail(row) {
    $("hourly-detail").hidden = !row;
    if (!row) { $("hourly-detail").replaceChildren(); return; }
    const head = node("div", "hour-detail-heading");
    head.append(node("strong", "", `Dự báo ${stampLabel(row.time)}`), node("span", "", row.code === null ? "Chưa có mô tả thời tiết" : describeWeather(row.code, row.day === 0 ? 0 : 1, row.sun).label));
    const metrics = node("dl", "hour-detail-metrics");
    for (const key of ["temperature_2m", "apparent_temperature", "relative_humidity_2m", "precipitation_probability", "precipitation", "wind_speed_10m", "uv_index"]) {
      const item = node("div", ""); item.append(node("dt", "", dataTools.specs[key][0]), node("dd", "", metricText(key, row[key]))); metrics.append(item);
    }
    $("hourly-detail").replaceChildren(head, metrics);
    $("hourly-list").querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.time === row.time)));
  }
  function renderChart(rows) {
    const key = mode, unit = dataTools.specs[key][1], finite = rows.map(row => row[key]).filter(n => n !== null);
    chartWidth = hourlyChart.clientWidth;
    if (!finite.length) {
      hourlyChart.replaceChildren(node("p", "chart-empty", "Chưa đủ dữ liệu để vẽ biểu đồ."));
      return;
    }
    if (!chartWidth) return;
    const width = chartWidth, height = 154, left = 38, right = 23, top = 28, bottom = 29;
    const labelCount = Math.min(rows.length, Math.max(2, Math.floor((width - left - right) / 55) + 1));
    const ticks = new Set(Array.from({ length: labelCount }, (_, index) =>
      Math.round(index * (rows.length - 1) / Math.max(1, labelCount - 1))));
    const min = ["precipitation_probability", "precipitation", "wind_speed_10m"].includes(key) ? 0 : Math.floor(Math.min(...finite) - 2);
    const max = key === "precipitation_probability" ? 100 : Math.ceil(Math.max(...finite) + 2);
    const x = index => left + index * (width - left - right) / Math.max(1, rows.length - 1);
    const y = n => top + (max - n) / Math.max(1, max - min) * (height - top - bottom);
    const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, width: String(width), height: String(height), role: "img", "aria-label": `Biểu đồ ${dataTools.specs[key][0].toLowerCase()} (${unit}). Số liệu chi tiết có ở từng thẻ giờ bên dưới.` });
    const unitLabel = svgElement("text", { x: left - 8, y: 11, "text-anchor": "end", class: "hour-axis" });
    unitLabel.textContent = unit;
    svg.append(unitLabel);
    for (const n of [min, (min + max) / 2, max]) {
      svg.append(svgElement("line", { x1: left, x2: width - right, y1: y(n), y2: y(n), class: "chart-gridline" }));
      const label = svgElement("text", { x: left - 8, y: y(n) + 4, "text-anchor": "end", class: "hour-axis" }); label.textContent = formatNumber(n); svg.append(label);
    }
    let points = [];
    const flush = () => { if (points.length) svg.append(svgElement("polyline", { points: points.join(" "), class: "hour-curve" })); points = []; };
    rows.forEach((row, i) => {
      if (i && row.stamp - rows[i - 1].stamp !== 3600000) flush();
      if (row[key] === null) flush(); else {
        points.push(`${x(i)},${y(row[key])}`);
        const dot = svgElement("circle", { cx: x(i), cy: y(row[key]), r: 3, class: "hour-point" });
        const tip = svgElement("title"); tip.textContent = `${stampLabel(row.time)}: ${metricText(key, row[key])}`; dot.append(tip); svg.append(dot);
      }
      if (ticks.has(i)) { const label = svgElement("text", { x: x(i), y: height - 8, "text-anchor": "middle", class: "hour-axis" }); label.textContent = row.time.slice(11); svg.append(label); }
    });
    flush(); hourlyChart.replaceChildren(svg);
  }
  function renderHours() {
    if (!source) return;
    const rows = dataTools.hours(source, selectedDate);
    $("hourly-caption").textContent = `${state.location.name} · ${selectedDate ? `Ngày ${selectedDate.slice(8)}/${selectedDate.slice(5, 7)} (cả ngày)` : "24 giờ tới"} · giờ địa phương`;
    $("hourly-message").textContent = rows.length ? "" : "Chưa có dự báo theo giờ cho khoảng thời gian này. Hãy thử cập nhật lại.";
    chartRows = rows;
    renderChart(rows);
    const spec = dataTools.specs[mode];
    $("hourly-list").replaceChildren(...rows.map(row => {
      const card = node("button", "hour-tile"); card.type = "button"; card.dataset.time = row.time;
      // Mức mưa để tô màu: ≥ 50% xanh đậm, ≥ 20% xanh, thấp hơn thì mờ (như ứng dụng điện thoại).
      if (row.precipitation_probability >= 50) card.dataset.rain = "high"; else if (row.precipitation_probability >= 20) card.dataset.rain = "some";
      card.setAttribute("aria-label", `Xem dự báo ${stampLabel(row.time)}`); card.setAttribute("aria-pressed", "false");
      card.append(node("span", "hour-time", row.time.slice(11)), node("span", "hour-date", `${row.time.slice(8, 10)}/${row.time.slice(5, 7)}`));
      if (row.code !== null && row.day !== null) card.append(weatherGraphic(row.code, row.day, row.sun)); else card.append(node("span", "hour-symbol-missing", "—"));
      card.append(node("strong", "hour-main-value", row[mode] === null ? "—" : `${formatNumber(row[mode])}${spec[1] === "°C" ? "°" : spec[1] === "%" ? "%" : ""}`));
      // Dòng dưới số chính: chế độ nhiệt độ → giọt nước + % khả năng mưa; các chế độ khác → chỉ đơn vị ngắn.
      const unit = node("span", "hour-unit");
      if (mode === "temperature_2m") {
        const drop = svgElement("svg", { class: "icon", width: "11", height: "11", "aria-hidden": "true" }); drop.append(svgElement("use", { href: "#i-drop" }));
        unit.append(drop, node("span", "", row.precipitation_probability === null ? "—" : `${formatNumber(row.precipitation_probability)}%`));
        unit.setAttribute("aria-label", row.precipitation_probability === null ? "Khả năng mưa chưa rõ" : `Khả năng mưa ${formatNumber(row.precipitation_probability)}%`);
      } else unit.textContent = { wind_speed_10m: "km/h", precipitation: "mm", precipitation_probability: "khả năng" }[mode];
      card.append(unit);
      card.onclick = () => { selectedHour = row.time; renderHourDetail(row); };
      return card;
    }));
    const row = rows.find(item => item.time === selectedHour) || rows[0]; selectedHour = row?.time || ""; renderHourDetail(row);
    hourList.scrollLeft = 0; updateHourArrows();
  }
  // Nút ‹ › cho người dùng chuột: dải 24 giờ chỉ hiện được một phần và lăn chuột dọc không cuộn ngang.
  const hourList = $("hourly-list"), hourArrows = [...document.querySelectorAll("[data-hour-scroll]")];
  function updateHourArrows() {
    const max = hourList.scrollWidth - hourList.clientWidth;
    hourArrows[0].disabled = hourList.scrollLeft <= 1;
    hourArrows[1].disabled = hourList.scrollLeft >= max - 1;
  }
  hourArrows.forEach(button => button.addEventListener("click", () =>
    hourList.scrollBy({ left: Number(button.dataset.hourScroll) * hourList.clientWidth * .8, behavior: "smooth" })));
  hourList.addEventListener("scroll", updateHourArrows, { passive: true });
  new ResizeObserver(updateHourArrows).observe(hourList);
  function renderDetails() {
    const date = selectedDate || source.current.time.slice(0, 10), sun = dataTools.sun(source, date);
    $("sunrise-time").textContent = sun.rise?.slice(11) || "Chưa có";
    $("sunset-time").textContent = sun.set?.slice(11) || "Chưa có";
    const minutes = sun.seconds === null ? null : Math.round(sun.seconds / 60);
    $("sun-duration").textContent = minutes === null ? "Chưa có dữ liệu độ dài ban ngày." : `Ban ngày kéo dài ${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
    $("sun-note").textContent = `${date.slice(8)}/${date.slice(5, 7)} · Giờ địa phương`;
    $("indices-note").hidden = !selectedDate;
    $("indices-note").textContent = `Giờ mặt trời theo ngày đã chọn. Các chỉ số thời tiết lấy từ dữ liệu lúc ${stampLabel(source.current.time)}.`;
    const icons = ["i-temp", "i-wind", "i-grid", "i-chart", "i-pin", "i-wind"];
    $("extra-metrics").replaceChildren(...["uv_index", "visibility", "cloud_cover", "surface_pressure", "wind_direction_10m", "wind_gusts_10m"].map((key, i) => {
      const n = dataTools.value(source, "current", key), card = node("article", "extra-metric"); card.dataset.extra = key;
      const heading = node("div", "extra-heading"); const icon = svgElement("svg", { class: "icon", width: "17", height: "17", "aria-hidden": "true" }); icon.append(svgElement("use", { href: `#${icons[i]}` })); heading.append(icon, node("h4", "", dataTools.specs[key][0]));
      let text = metricText(key, n);
      if (n !== null && key === "visibility") text = `${formatNumber(n / 1000)} km`;
      if (n !== null && key === "wind_direction_10m") text = `${dataTools.direction(n)} · ${formatNumber(n)}°`;
      if (n !== null && key === "uv_index") { text = `${formatNumber(n)} · ${dataTools.uvLevel(n)}`; if (n >= 6) card.dataset.alert = "true"; }
      card.append(heading, node("strong", "extra-value", text), node("span", "extra-note visually-hidden", `Hiện tại · ${source.current.time.slice(11)} ${source.current.time.slice(8, 10)}/${source.current.time.slice(5, 7)}`));
      return card;
    }));
  }
  function wireDayCards() {
    $("forecast-list").querySelectorAll(".forecast-day").forEach((card, index) => {
      const date = source.daily.time[index];
      card.dataset.selected = String(date === selectedDate);
      const button = node("button", "day-open", "Xem ngày"); button.type = "button";
      button.setAttribute("aria-label", `Xem thời tiết ngày ${date.slice(8)}/${date.slice(5, 7)}`);
      // Cuộn lên đầu trang để thấy cả bộ chọn ngày; cuộn tới #weather-content sẽ để thanh trên cùng che mất nó.
      button.onclick = () => { MayDaily.selectDate(date); $("weather-date").focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "instant" }); };
      card.querySelector(".day-open")?.remove(); card.append(button);
    });
  }
  function renderHighlights() {
    // Khi chọn ngày khác, daily-view.js ẩn cả #current-panel (chứa dải này) nên không cần kiểm tra ngày ở đây.
    const air = state.air?.key === `${state.location.latitude},${state.location.longitude}` ? state.air : null;
    const list = $("weather-highlights"), items = dataTools.highlights(source, air);
    list.hidden = !items.length;
    list.replaceChildren(...items.map(item => {
      const li = node("li", item.calm ? "highlight is-calm" : "highlight"); li.dataset.kind = item.kind; // màu theo loại cảnh báo
      const icon = svgElement("svg", { class: "icon", width: "18", height: "18", "aria-hidden": "true" }); icon.append(svgElement("use", { href: `#${item.icon}` }));
      const body = node("span", "highlight-body"); body.append(node("strong", "", item.title), node("span", "", item.text));
      li.append(icon, body); return li;
    }));
    const feels = $("feels-like").closest(".metric"), note = feels.querySelector(".metric-note");
    note.dataset.base ??= note.textContent;
    const gap = dataTools.feelsGap(dataTools.value(source, "current", "temperature_2m"), dataTools.value(source, "current", "apparent_temperature"));
    feels.toggleAttribute("data-alert", gap !== 0);
    note.textContent = gap ? `${gap > 0 ? "Nóng" : "Lạnh"} hơn thực tế ${Math.abs(gap)}°` : note.dataset.base;
  }
  function render(data, date = "") {
    source = data; selectedDate = date; selectedHour = "";
    $("hourly-section").hidden = false; $("details-section").hidden = false;
    renderHighlights(); renderHours(); renderDetails(); wireDayCards();
  }
  function onLoading() {
    $("hourly-section").hidden = true; $("details-section").hidden = true;
  }
  document.querySelectorAll("[data-hour-mode]").forEach(button => button.addEventListener("click", () => {
    mode = button.dataset.hourMode;
    document.querySelectorAll("[data-hour-mode]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    renderHours();
  }));
  new ResizeObserver(() => {
    if (source && hourlyChart.clientWidth && hourlyChart.clientWidth !== chartWidth) renderChart(chartRows);
  }).observe(hourlyChart);
  // live-data.js gọi khi chất lượng không khí tải xong/lỗi để dải điểm nhấn cập nhật theo.
  window.MayDashboard = { render, onLoading, refreshHighlights: () => { if (source) renderHighlights(); } };
  if (state.weather) render(state.weather, $("weather-date").value);
})();
