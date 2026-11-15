"use strict";
// Chỉ số bổ sung độc lập với dữ liệu lõi: thiếu dữ liệu không làm mất trang thời tiết.
globalThis.MayDashboardData = (() => {
  const specs = {
    temperature_2m: ["Nhiệt độ", "°C", -Infinity, Infinity],
    apparent_temperature: ["Cảm nhận", "°C", -Infinity, Infinity],
    precipitation_probability: ["Xác suất mưa", "%", 0, 100],
    precipitation: ["Giáng thủy", "mm", 0, Infinity],
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
        code: extra("weather_code", "wmo code", Number.isInteger), day: extra("is_day", "", n => n === 0 || n === 1) };
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
  return { specs, value, hours, sun, direction };
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
    head.append(node("strong", "", `Dự báo ${stampLabel(row.time)}`), node("span", "", row.code === null ? "Chưa có mô tả thời tiết" : describeWeather(row.code).label));
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
    $("hourly-caption").textContent = `${state.location.name} · ${selectedDate ? `Ngày ${selectedDate.slice(8)}/${selectedDate.slice(5, 7)} (cả ngày)` : "24 giờ tới"} · ${source.timezone}`;
    $("hourly-message").textContent = rows.length ? "" : "Chưa có dự báo theo giờ cho khoảng thời gian này. Hãy thử cập nhật lại.";
    chartRows = rows;
    renderChart(rows);
    const spec = dataTools.specs[mode];
    $("hourly-list").replaceChildren(...rows.map(row => {
      const card = node("button", "hour-tile"); card.type = "button"; card.dataset.time = row.time;
      card.setAttribute("aria-label", `Xem dự báo ${stampLabel(row.time)}`); card.setAttribute("aria-pressed", "false");
      card.append(node("span", "hour-time", row.time.slice(11)), node("span", "hour-date", `${row.time.slice(8, 10)}/${row.time.slice(5, 7)}`));
      if (row.code !== null && row.day !== null) card.append(weatherGraphic(row.code, row.day)); else card.append(node("span", "hour-symbol-missing", "—"));
      card.append(node("strong", "hour-main-value", row[mode] === null ? "—" : `${formatNumber(row[mode])}${spec[1] === "°C" ? "°" : spec[1] === "%" ? "%" : ""}`));
      card.append(node("span", "hour-unit", mode === "wind_speed_10m" ? "km/h" : mode === "precipitation" ? "mm · giờ trước" : mode === "precipitation_probability" ? "Khả năng mưa" : row.precipitation_probability === null ? "Mưa: chưa rõ" : `Mưa ${formatNumber(row.precipitation_probability)}%`));
      card.onclick = () => { selectedHour = row.time; renderHourDetail(row); };
      return card;
    }));
    const row = rows.find(item => item.time === selectedHour) || rows[0]; selectedHour = row?.time || ""; renderHourDetail(row);
  }
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
      button.onclick = () => { MayDaily.selectDate(date); $("weather-date").focus({ preventScroll: true }); $("weather-content").scrollIntoView({ behavior: "instant", block: "start" }); };
      card.querySelector(".day-open")?.remove(); card.append(button);
    });
  }
  function render(data, date = "") {
    source = data; selectedDate = date; selectedHour = "";
    $("hourly-section").hidden = false; $("details-section").hidden = false;
    renderHours(); renderDetails(); wireDayCards();
  }
  function onLoading() {
    window.MayLocation?.cancel("Đã chuyển sang địa điểm bạn chọn.");
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
  window.MayDashboard = { render, onLoading };
  document.querySelector(".personal-section").open = !window.matchMedia("(max-width: 760px)").matches;
  if (state.weather) render(state.weather, $("weather-date").value);
})();
