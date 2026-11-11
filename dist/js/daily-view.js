"use strict";
// Chọn ngày chỉ đổi cách xem dữ liệu đã tải; không lấy số hiện tại thay cho dự báo.
(() => {
  let selectedDate = "";
  const fullDate = date => new Date(`${date}T12:00:00Z`).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  const node = (tag, className, text) => {
    const item = document.createElement(tag); item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  };
  function render() {
    if (!state.weather) return;
    const data = state.weather, dates = data.daily.time.slice(0, 7);
    const [today, ...futureDates] = dates;
    if (!futureDates.includes(selectedDate)) selectedDate = "";
    const todayLabel = `${today.slice(8)}/${today.slice(5, 7)}/${today.slice(0, 4)}`;
    const options = [["", `Hôm nay · ${todayLabel}`], ...futureDates.map(date => [date, fullDate(date)])];
    $("weather-date").replaceChildren(...options.map(([value, label]) => {
      const option = node("option", "", label); option.value = value; return option;
    }));
    $("weather-date").value = selectedDate;
    const dailyMode = Boolean(selectedDate);
    document.body.dataset.view = dailyMode ? "daily" : "current";
    $("current-panel").hidden = dailyMode;
    $("current-metrics").hidden = dailyMode;
    $("daily-view").hidden = !dailyMode;
    $("weather-content").setAttribute("aria-labelledby", dailyMode ? "daily-place" : "place-name");
    $("page-title-text").textContent = dailyMode ? `Thời tiết ${selectedDate.slice(8)}/${selectedDate.slice(5, 7)}` : "Thời tiết hôm nay";
    window.MayDashboard?.render(data, selectedDate);
    if (!dailyMode) { MayTheme.apply(data.current); return; }
    const index = dates.indexOf(selectedDate), daily = data.daily;
    $("daily-place").textContent = state.location.name;
    $("daily-region").textContent = regionLabel(state.location);
    $("daily-date").textContent = fullDate(selectedDate);
    $("daily-high").textContent = `${formatNumber(daily.temperature_2m_max[index])}°C`;
    $("daily-low").textContent = `${formatNumber(daily.temperature_2m_min[index])}°C`;
    $("daily-condition").textContent = describeWeather(daily.weather_code[index]).label;
    $("daily-icon").replaceChildren(weatherGraphic(daily.weather_code[index], 1));
    // Đây là biểu trưng cả ngày, không khẳng định một giờ tương lai là ban ngày.
    MayTheme.apply({ weather_code: daily.weather_code[index], is_day: 1 });
    $("daily-source").textContent = `Nguồn: Open-Meteo · ${data.timezone} · Mốc dữ liệu hiện tại: ${data.current.time.slice(11)} ${data.current.time.slice(8, 10)}/${data.current.time.slice(5, 7)}`;
    const specs = [
      ["Xác suất mưa", "precipitation_probability_max", "%", "Cao nhất trong ngày", 100],
      ["Gió mạnh nhất", "wind_speed_10m_max", "km/h", "Ở độ cao 10 m"],
      ["Giáng thủy", "precipitation_sum", "mm", "Tổng lượng trong ngày"],
      ["UV cao nhất", "uv_index_max", "", "Chỉ số trong ngày"],
    ];
    $("daily-metrics").replaceChildren(...specs.map(([label, key, unit, note, max = Infinity]) => {
      const values = daily[key], value = values?.[index];
      const valid = Array.isArray(values) && values.length === daily.time.length && data.daily_units?.[key] === unit && Number.isFinite(value) && value >= 0 && value <= max;
      const card = node("article", "daily-metric"); card.dataset.metric = key;
      card.append(node("h3", "", label), node("p", "daily-value", valid ? `${formatNumber(value)}${unit ? ` ${unit}` : ""}` : "Chưa có dữ liệu"), node("span", "", note));
      return card;
    }));
    $("activity-date").value = selectedDate;
    MayAdvice.render(data, state.location, $("activity-select").value);
  }
  $("weather-date").addEventListener("change", () => {
    selectDate($("weather-date").value);
  });
  function selectDate(date) {
    if (!state.weather || (date && !state.weather.daily.time.includes(date))) return;
    selectedDate = date === state.weather.daily.time[0] ? "" : date;
    if (!selectedDate) {
      $("activity-date").value = "";
      MayAdvice.render(state.weather, state.location, $("activity-select").value);
    }
    render();
  }
  window.MayDaily = { onWeatherLoaded: render, selectDate };
  if (state.weather) render();
})();
