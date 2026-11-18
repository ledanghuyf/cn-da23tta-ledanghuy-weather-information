"use strict";

// 1. Cấu hình: không lưu khóa API hay dữ liệu thời tiết giả trong mã nguồn.
const API = {
  nominatim: "https://nominatim.openstreetmap.org", // OSM: có đến cấp xã/phường; dữ liệu © OpenStreetMap (ODbL)
  geocoding: "https://geocoding-api.open-meteo.com/v1/search",
  forecast: "https://api.open-meteo.com/v1/forecast",
};
const DEFAULT_LOCATION = {
  name: "Vĩnh Long", admin1: "Vĩnh Long", country: "Việt Nam",
  latitude: 10.2537, longitude: 105.9722,
};
const QUICK_LOCATIONS = [
  DEFAULT_LOCATION,
  { name: "Hà Nội", admin1: "Hà Nội", country: "Việt Nam", latitude: 21.0245, longitude: 105.84117 },
  { name: "TP. Hồ Chí Minh", admin1: "TP. Hồ Chí Minh", country: "Việt Nam", latitude: 10.82302, longitude: 106.62965 },
  { name: "Đà Nẵng", admin1: "Đà Nẵng", country: "Việt Nam", latitude: 16.06778, longitude: 108.22083 },
];
const WEATHER_CODES = {
  0: ["Trời quang", "☀️"], 1: ["Ít mây", "🌤️"],
  2: ["Mây rải rác", "⛅"], 3: ["Nhiều mây", "☁️"],
  45: ["Sương mù", "🌫️"], 48: ["Sương mù đóng băng", "🌫️"],
  51: ["Mưa phùn nhẹ", "🌦️"], 53: ["Mưa phùn vừa", "🌦️"],
  55: ["Mưa phùn dày", "🌧️"], 56: ["Mưa phùn đóng băng nhẹ", "🌧️"],
  57: ["Mưa phùn đóng băng dày", "🌧️"],
  61: ["Mưa nhẹ", "🌧️"], 63: ["Mưa vừa", "🌧️"], 65: ["Mưa to", "🌧️"],
  66: ["Mưa đóng băng nhẹ", "🌧️"], 67: ["Mưa đóng băng mạnh", "🌧️"],
  71: ["Tuyết nhẹ", "🌨️"], 73: ["Tuyết vừa", "🌨️"], 75: ["Tuyết dày", "🌨️"],
  77: ["Hạt tuyết", "🌨️"], 80: ["Mưa rào nhẹ", "🌦️"],
  81: ["Mưa rào vừa", "🌧️"], 82: ["Mưa rào mạnh", "🌧️"],
  85: ["Mưa tuyết nhẹ", "🌨️"], 86: ["Mưa tuyết mạnh", "🌨️"],
  95: ["Dông", "⛈️"], 96: ["Dông, mưa đá nhẹ", "⛈️"], 97: ["Dông mạnh", "⛈️"], 99: ["Dông, mưa đá mạnh", "⛈️"],
};

// 2. Tham chiếu DOM và trạng thái. Hai luồng tìm kiếm/lấy thời tiết hủy độc lập.
const $ = (id) => document.getElementById(id);
const state = {
  location: DEFAULT_LOCATION, weather: null, results: [],
  searchController: null, weatherController: null,
};
const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const formatNumber = (value, round = false) =>
  Number.isFinite(value) ? numberFormat.format(round ? Math.round(value) : value) : "—";

function setStatus(id, message, kind = "info") {
  $(id).textContent = message;
  $(id).dataset.kind = kind;
}

function regionLabel(location) {
  return [...new Set([location.admin1, location.country].filter(Boolean))].join(", ");
}

// Trạng thái trời ban ngày (xem MayTheme.sky): nắng / nắng xen mây / nhiều mây.
const SKY_STATES = {
  sunny: { label: "Nhiều nắng", icon: "☀️", symbol: "clear" },
  partly: { label: "Nắng xen mây", icon: "⛅", symbol: "partly-cloudy" },
  cloudy: { label: "Nhiều mây", icon: "☁️", symbol: "cloudy" },
};
// sun: tỉ lệ thời gian có nắng 0–1 (NaN nếu không có dữ liệu).
function describeWeather(code, isDay = 1, sun = NaN) {
  const state = SKY_STATES[MayTheme.sky(code, isDay === 0 ? 0 : 1, sun)];
  if (state) return { label: state.label, icon: state.icon };
  const [label, icon] = WEATHER_CODES[code] || ["Chưa có mô tả", "☁️"];
  return { label, icon: isDay === 0 && code === 0 ? "🌙" : icon };
}

// "C:32°  T:26°" (cao trước, thấp sau, làm tròn, không chữ C); trình đọc màn hình nghe câu đầy đủ.
function highLowNodes(max, min) {
  const high = formatNumber(max, true), low = formatNumber(min, true);
  const visual = document.createElement("span"), spoken = document.createElement("span");
  visual.setAttribute("aria-hidden", "true"); visual.textContent = `C:${high}°  T:${low}°`;
  spoken.className = "visually-hidden"; spoken.textContent = `Cao nhất ${high} độ, thấp nhất ${low} độ`;
  return [visual, spoken];
}

// Biểu tượng SVG cục bộ: không phụ thuộc font emoji hoặc dịch vụ ảnh bên ngoài.
function weatherSymbol(code, isDay = 1, sun = NaN) {
  if (!Object.hasOwn(WEATHER_CODES, code)) return "unknown";
  const state = SKY_STATES[MayTheme.sky(code, isDay ? 1 : 0, sun)];
  if (state) return state.symbol;
  if (code === 0) return "moon";
  if ([1, 2].includes(code)) return "night-cloud";
  if ([45, 48].includes(code)) return "fog";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 97, 99].includes(code)) return "storm";
  if ([80, 81, 82].includes(code)) return isDay ? "showers" : "night-rain";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67].includes(code)) return isDay ? "rain" : "night-rain";
  return isDay ? "cloudy" : "night-cloud";
}

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function weatherGraphic(code, isDay = 1, sun = NaN) {
  const svg = svgElement("svg", { viewBox: "0 0 160 160", width: "160", height: "160", "aria-hidden": "true", focusable: "false" });
  svg.append(svgElement("use", { href: `#${weatherSymbol(code, isDay, sun)}` }));
  return svg;
}

function renderQuickLocations() {
  const fragment = document.createDocumentFragment();
  QUICK_LOCATIONS.forEach((location) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-button";
    button.setAttribute("aria-pressed", "false");
    const icon = svgElement("svg", { class: "icon", width: "14", height: "14", "aria-hidden": "true" });
    icon.append(svgElement("use", { href: "#i-pin" }));
    const label = document.createElement("span");
    label.textContent = location.name;
    button.append(icon, label);
    button.addEventListener("click", () => loadWeather(location));
    fragment.append(button);
  });
  $("quick-locations").replaceChildren(fragment);
}

function updateQuickSelection(location) {
  [...$("quick-locations").children].forEach((button, i) => {
    const quick = QUICK_LOCATIONS[i];
    button.setAttribute("aria-pressed", String(Math.abs(quick.latitude - location.latitude) < .015 && Math.abs(quick.longitude - location.longitude) < .015));
  });
}

function validateLocation(location) {
  if (!location || typeof location.name !== "string" || !location.name.trim() ||
      !Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90 ||
      !Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180) {
    throw new Error("Thông tin địa điểm không hợp lệ.");
  }
  return location;
}

// Dữ liệu hợp lệ về cú pháp JSON vẫn có thể sai cấu trúc hoặc sai đơn vị.
function isISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateWeather(data) {
  const invalid = () => { throw new Error("Dịch vụ trả về dữ liệu thời tiết chưa đầy đủ hoặc không hợp lệ. Vui lòng thử lại."); };
  const current = data.current;
  const daily = data.daily;
  if (!current || !daily) invalid();
  if (!["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "apparent_temperature", "precipitation"]
    .every((key) => Number.isFinite(current[key]))) invalid();
  if (current.relative_humidity_2m < 0 || current.relative_humidity_2m > 100 ||
      current.wind_speed_10m < 0 || current.precipitation < 0 ||
      !Number.isInteger(current.weather_code) || ![0, 1].includes(current.is_day)) invalid();
  if (typeof current.time !== "string" || !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(current.time) ||
      !isISODate(current.time.slice(0, 10)) || typeof data.timezone !== "string" || !data.timezone) invalid();
  if (!Array.isArray(daily.time) || daily.time.length < 7 ||
      !["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_probability_max"]
        .every((key) => Array.isArray(daily[key]) && daily[key].length === daily.time.length)) invalid();
  if (daily.time[0] !== current.time.slice(0, 10)) invalid();
  daily.time.slice(0, 7).forEach((date, index) => {
    if (!isISODate(date) || (index > 0 && Date.parse(date) - Date.parse(daily.time[index - 1]) !== 86400000)) invalid();
    const high = daily.temperature_2m_max[index];
    const low = daily.temperature_2m_min[index];
    const rain = daily.precipitation_probability_max[index];
    if (!Number.isFinite(high) || !Number.isFinite(low) || high < low || !Number.isInteger(daily.weather_code[index])) invalid();
    // Xác suất có thể chưa được nhà cung cấp hỗ trợ; null không có nghĩa là 0%.
    if (rain !== null && (!Number.isFinite(rain) || rain < 0 || rain > 100)) invalid();
  });
  const expectedCurrent = { temperature_2m: "°C", apparent_temperature: "°C", relative_humidity_2m: "%", wind_speed_10m: "km/h", precipitation: "mm" };
  const expectedDaily = { temperature_2m_max: "°C", temperature_2m_min: "°C", precipitation_probability_max: "%" };
  if (!Object.entries(expectedCurrent).every(([key, unit]) => data.current_units?.[key] === unit) ||
      !Object.entries(expectedDaily).every(([key, unit]) => data.daily_units?.[key] === unit)) invalid();
  return data;
}

// 3. Gửi HTTP GET, kiểm tra mã trạng thái, đọc JSON và giới hạn thời gian chờ.
// array: dịch vụ trả về mảng (Nominatim); timeout ngắn hơn khi còn nguồn dự phòng.
async function fetchJSON(url, signal, { array = false, timeout = 15000 } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal.aborted) controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(response.status === 429
        ? "Dịch vụ đang giới hạn số lần tra cứu. Vui lòng thử lại sau."
        : "Dịch vụ chưa phản hồi thành công. Vui lòng thử lại."); // dùng chung cho tìm địa điểm, thời tiết, không khí
    }
    const data = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data) !== array) {
      throw new Error("Dữ liệu trả về chưa đúng cấu trúc. Vui lòng thử lại.");
    }
    if (!array && data.error) throw new Error("Dịch vụ không thể xử lý yêu cầu này.");
    return data;
  } catch (error) {
    if (signal.aborted) throw error;
    if (timedOut) throw new Error("Kết nối mất quá nhiều thời gian. Vui lòng thử lại.");
    if (error instanceof TypeError) throw new Error("Không kết nối được dịch vụ. Kiểm tra Internet rồi thử lại.");
    if (error instanceof SyntaxError) throw new Error("Dữ liệu trả về chưa đúng định dạng. Vui lòng thử lại.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

// 4. Tìm địa điểm bằng tên. Dùng textContent để hiển thị an toàn dữ liệu API.
async function searchLocations(rawQuery) {
  state.searchController?.abort();
  const controller = new AbortController();
  state.searchController = controller;
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
  $("search-results").replaceChildren();
  state.results = [];
  if (query.length < 2 || query.length > 120) {
    setStatus("search-status", "Nhập tên địa điểm từ 2 đến 120 ký tự.", "error");
    $("location-input").setAttribute("aria-invalid", "true");
    $("search-button").disabled = false;
    return [];
  }
  $("location-input").removeAttribute("aria-invalid");
  $("search-button").disabled = true;
  setStatus("search-status", "Đang tìm địa điểm…");
  try {
    state.results = await findPlaces(query, controller.signal);
    if (controller.signal.aborted) return [];
    // Gõ đúng tên tỉnh: đưa tỉnh lỵ lên đầu (dịch vụ không có tên tỉnh), trừ khi kết quả đã có nơi đó (cách < ~5 km).
    const province = MayVietnam.province(query);
    if (province && !state.results.some(r => Math.abs(r.latitude - province.latitude) < .05 && Math.abs(r.longitude - province.longitude) < .05)) state.results.unshift(province);
    renderSearchResults();
    setStatus("search-status", state.results.length
      ? `Tìm thấy ${state.results.length} địa điểm. Chọn nơi bạn muốn xem.`
      : "Không tìm thấy địa điểm ở Việt Nam. Thử tên tỉnh, thành khác hoặc gõ không dấu.");
    return state.results;
  } catch (error) {
    if (!controller.signal.aborted) setStatus("search-status", `Chưa tìm được địa điểm. ${error.message}`, "error");
    return [];
  } finally {
    if (state.searchController === controller) $("search-button").disabled = false;
  }
}

// Nominatim (OSM) tìm được đến xã/phường, có dấu hoặc không dấu. Lỗi, bị chặn hay không có kết quả → Open-Meteo như trước.
async function findPlaces(query, signal) {
  const started = Date.now();
  try {
    const places = await searchNominatim(query, signal);
    if (places.length) return places;
  } catch (error) {
    if (signal.aborted) throw error;
  }
  // Tổng thời gian chờ vẫn khoảng 15 giây kể cả khi Nominatim chậm rồi mới chuyển nguồn.
  return searchOpenMeteo(query, signal, Math.max(5000, 15000 - (Date.now() - started)));
}

let lastNominatim = 0;
// Chờ đủ 1 giây giữa hai lần gọi (chính sách Nominatim), không gọi khi đã hủy.
async function nominatimJSON(path, params, signal) {
  const wait = lastNominatim + 1000 - Date.now();
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
  lastNominatim = Date.now();
  const url = new URL(`${API.nominatim}/${path}`);
  url.search = new URLSearchParams({ format: "json", addressdetails: "1", "accept-language": "vi", ...params });
  return fetchJSON(url, signal, { array: path === "search", timeout: 8000 });
}

async function searchNominatim(query, signal) {
  const data = await nominatimJSON("search", { countrycodes: "vn", limit: "8", q: MayVietnam.expand(query) }, signal);
  return data.map(item => MayVietnam.fromOSM(item)).filter(Boolean);
}

// Tên xã/phường cho tọa độ định vị (giữ tọa độ GPS gốc). Không tra được → "Gần <tỉnh lỵ>"; không bao giờ hiện tọa độ thô.
async function nameCoordinates(latitude, longitude) {
  try {
    const data = await nominatimJSON("reverse", { lat: String(latitude), lon: String(longitude), zoom: "18" }, new AbortController().signal);
    const place = MayVietnam.fromOSM({ ...data, lat: latitude, lon: longitude }, true);
    if (place) return place;
  } catch { /* bị chặn hoặc lỗi mạng: dùng tỉnh lỵ gần nhất */ }
  return MayVietnam.nearest(latitude, longitude);
}

async function searchOpenMeteo(query, signal, timeout) {
  const data = await fetchJSON(geocodingURL(query), signal, { timeout });
  if (data.results !== undefined && !Array.isArray(data.results)) {
    throw new Error("Danh sách địa điểm trả về không hợp lệ. Vui lòng thử lại.");
  }
  const valid = Array.isArray(data.results) ? data.results.filter((item) => {
    try { validateLocation(item); return true; } catch { return false; }
  }) : [];
  if (data.results?.length && !valid.length) {
    throw new Error("Dịch vụ trả về địa điểm thiếu thông tin tọa độ. Vui lòng thử lại.");
  }
  return valid.filter(inVietnam);
}

// Ứng dụng chỉ hỗ trợ địa điểm ở Việt Nam: nhờ dịch vụ lọc sẵn (countryCode) và tự kiểm tra lại từng kết quả.
function geocodingURL(query) {
  const url = new URL(API.geocoding);
  url.search = new URLSearchParams({ name: query, count: "8", language: "vi", format: "json", countryCode: "VN" });
  return url;
}
const inVietnam = (item) => item?.country_code === "VN";

function renderSearchResults() {
  const focusedIndex = [...$("search-results").children].indexOf(document.activeElement);
  const fragment = document.createDocumentFragment();
  for (const location of state.results) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-button";
    button.setAttribute("aria-pressed", String(isSameLocation(location, state.location)));
    const name = document.createElement("span");
    name.className = "result-name";
    name.textContent = location.name;
    const region = document.createElement("span");
    region.className = "result-region";
    region.textContent = regionLabel(location);
    button.append(name, region);
    button.addEventListener("click", () => loadWeather(location));
    fragment.append(button);
  }
  $("search-results").replaceChildren(fragment);
  if (focusedIndex >= 0) $("search-results").children[focusedIndex]?.focus({ preventScroll: true });
}

function isSameLocation(a, b) {
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

// Truy vấn dự báo dùng chung cho màn hình chính, định vị và địa điểm đã lưu.
function forecastURL(location, includeHourly = false) {
  const url = new URL(API.forecast);
  url.search = new URLSearchParams({
    latitude: String(location.latitude), longitude: String(location.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,precipitation_probability,uv_index,cloud_cover,surface_pressure,visibility,wind_direction_10m,wind_gusts_10m,sunshine_duration",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,precipitation_sum,sunrise,sunset,daylight_duration,sunshine_duration",
    temperature_unit: "celsius", wind_speed_unit: "kmh", precipitation_unit: "mm",
    timezone: "auto", forecast_days: "7",
  });
  if (includeHourly) url.searchParams.set("hourly", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,is_day,uv_index,sunshine_duration,cloud_cover");
  return url;
}

// 5. Lấy thời tiết hiện tại và dự báo 7 ngày bằng vĩ độ/kinh độ.
async function loadWeather(location) {
  validateLocation(location);
  window.MayDashboard?.onLoading();
  window.MayLive?.onLoading();
  state.weatherController?.abort();
  const controller = new AbortController();
  state.weatherController = controller;
  $("weather-content").setAttribute("aria-busy", "true");
  $("refresh-button").disabled = true;
  $("save-location").disabled = true;
  $("weather-date").disabled = true;
  $("retry-button").hidden = true;
  MayTheme.apply();
  $("advice-results").hidden = true;
  $("advice-unavailable").hidden = false;
  $("advice-unavailable").textContent = "Đang cập nhật. Gợi ý tạm ẩn để tránh dùng thông tin cũ.";
  if (!state.weather) {
    $("empty-title").textContent = "Đang tải thời tiết";
    $("empty-message").textContent = `Đang kết nối để xem bầu trời tại ${location.name}…`;
  }
  setStatus("weather-status", `Đang tải thời tiết ${location.name}…`);
  const url = forecastURL(location, true);
  try {
    // Tọa độ từ GPS/link chia sẻ có thể ở nước ngoài: kiểm tra theo ranh giới Việt Nam trước khi gọi API.
    // (Không dùng múi giờ: Open-Meteo gán Asia/Bangkok cho cả miền Bắc nên Hà Nội, Sa Pa, Vinh từng bị từ chối nhầm.)
    if (location.vietnamOnly && !MayVietnam.contains(location.latitude, location.longitude)) {
      throw Object.assign(new Error("Vị trí này nằm ngoài Việt Nam. Ứng dụng chỉ hỗ trợ địa điểm ở Việt Nam, hãy tìm một nơi bằng tên."), { outside: true });
    }
    const data = await fetchJSON(url, controller.signal);
    if (controller.signal.aborted) return null;
    validateWeather(data);
    if (!isSameLocation(location, state.location)) delete $("activity-date").dataset.userPicked;
    state.location = location;
    state.weather = data;
    rememberLocation(location);
    renderWeather(location, data);
    window.MayLive?.onLoaded(location, data, url);
    renderSearchResults();
    window.MayFeatures?.onWeatherLoaded(location);
    setStatus("weather-status", `Đã cập nhật thời tiết ${location.name}.`, "success");
    return data;
  } catch (error) {
    if (controller.signal.aborted) return null;
    state.lastError = error;
    MayTheme.apply();
    window.MayLive?.onError();
    $("advice-unavailable").textContent = "Chưa tải được dữ liệu mới. Gợi ý tạm ẩn; hãy bấm Thử tải lại.";
    const retained = state.weather ? ` Đang giữ thông tin đã tải của ${state.location.name}.` : "";
    setStatus("weather-status", error.message + retained, "error");
    if (!state.weather) {
      $("empty-title").textContent = "Chưa thể tải thời tiết";
      $("empty-message").textContent = "Chưa tải được dữ liệu. Bạn có thể thử lại hoặc tìm một địa điểm khác.";
    }
    $("retry-button").hidden = Boolean(error.outside); // thử lại cũng vẫn ngoài Việt Nam
    $("retry-button").onclick = () => loadWeather(location);
    return null;
  } finally {
    if (state.weatherController === controller) {
      $("weather-content").setAttribute("aria-busy", "false");
      $("refresh-button").disabled = false;
      $("save-location").disabled = !state.weather;
      $("weather-date").disabled = !state.weather || $("weather-status").dataset.kind === "error";
    }
  }
}

// Thẻ "Lời khuyên & trang phục": mỗi nhóm (nắng, mưa, lạnh, gió, dễ chịu) một biểu tượng, tên nhóm và các gợi ý.
function renderOutfit(data) {
  const groups = MayAdvice.outfitAdvice(data);
  $("outfit-card").hidden = !groups.length;
  $("outfit-list").replaceChildren(...groups.map(group => {
    const item = document.createElement("li"), body = document.createElement("div"), title = document.createElement("strong"), tips = document.createElement("ul");
    item.className = "outfit-item"; item.dataset.kind = group.id;
    const icon = svgElement("svg", { class: "icon", width: "22", height: "22", "aria-hidden": "true" });
    icon.append(svgElement("use", { href: `#${group.icon}` }));
    title.textContent = group.title;
    tips.append(...group.tips.map(tip => { const li = document.createElement("li"); li.textContent = tip; return li; }));
    body.append(title, tips); item.append(icon, body);
    return item;
  }));
}

// 6. Tách phần hiển thị khỏi phần gọi API để dễ đọc và sửa.
function renderWeather(location, data) {
  const current = data.current;
  const sun = MayTheme.ratio(current.sunshine_duration, current.interval); // 15 phút gần nhất
  const code = MayTheme.nightCode(current.weather_code, current.is_day, current.cloud_cover);
  const weather = describeWeather(code, current.is_day, sun);
  $("place-name").textContent = location.name;
  $("place-region").textContent = regionLabel(location);
  $("temperature").textContent = formatNumber(current.temperature_2m, true);
  $("condition").textContent = weather.label;
  $("weather-icon").replaceChildren(weatherGraphic(code, current.is_day, sun));
  MayTheme.apply(current);
  $("day-label").textContent = current.is_day === 0 ? "Ban đêm" : "Ban ngày";
  $("humidity").textContent = formatNumber(current.relative_humidity_2m, true);
  $("humidity-fill").style.width = `${current.relative_humidity_2m}%`;
  $("wind").textContent = formatNumber(current.wind_speed_10m);
  $("feels-like").textContent = formatNumber(current.apparent_temperature, true);
  $("precipitation").textContent = formatNumber(current.precipitation);
  $("today-range").replaceChildren(...highLowNodes(data.daily.temperature_2m_max[0], data.daily.temperature_2m_min[0]));
  renderOutfit(data);
  // ISO từ API đã theo timezone của địa điểm; không chuyển bằng múi giờ máy người xem.
  const [date, time] = String(current.time || "").split("T");
  const [year, month, day] = (date || "").split("-");
  $("data-time").textContent = time && day
    ? `Cập nhật lúc ${time.slice(0, 5)} · ${day}/${month}/${year} · giờ địa phương`
    : "Theo giờ địa phương";
  $("page-date").textContent = new Date(`${date}T12:00:00Z`).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  updateQuickSelection(location);
  renderForecast(data.daily);
  renderTemperatureChart(data.daily);
  MayAdvice.render(data, location, $("activity-select").value);
  $("advice-results").hidden = false;
  $("advice-unavailable").hidden = true;
  $("weather-view").hidden = false;
  $("empty-view").hidden = true;
  window.MayDaily?.onWeatherLoaded();
}

function renderForecast(daily) {
  const fragment = document.createDocumentFragment();
  const rangeLow = Math.min(...daily.temperature_2m_min.slice(0, 7));
  const rangeHigh = Math.max(...daily.temperature_2m_max.slice(0, 7));
  const rangeSpan = Math.max(1, rangeHigh - rangeLow);
  daily.time.slice(0, 7).forEach((isoDate, index) => {
    const date = new Date(`${isoDate}T12:00:00Z`);
    const sun = MayTheme.ratio(daily.sunshine_duration?.[index], daily.daylight_duration?.[index]);
    const condition = describeWeather(daily.weather_code[index], 1, sun);
    const article = document.createElement("article");
    article.className = "forecast-day";
    const heading = document.createElement("h4");
    heading.textContent = index === 0 ? "Hôm nay" : date.toLocaleDateString("vi-VN", { weekday: "short", timeZone: "UTC" });
    const dateLabel = document.createElement("p");
    dateLabel.className = "forecast-date";
    dateLabel.textContent = `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`;
    const icon = document.createElement("span");
    icon.className = "forecast-icon";
    icon.append(weatherGraphic(daily.weather_code[index], 1, sun));
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", condition.label);
    icon.title = condition.label;
    const description = document.createElement("p");
    description.className = "forecast-condition";
    description.textContent = condition.label;
    const temperature = document.createElement("p");
    temperature.className = "forecast-temperature";
    temperature.setAttribute("aria-label", `Cao nhất ${formatNumber(daily.temperature_2m_max[index], true)} độ C, thấp nhất ${formatNumber(daily.temperature_2m_min[index], true)} độ C`);
    const high = document.createElement("span");
    high.textContent = `${formatNumber(daily.temperature_2m_max[index], true)}°`;
    const low = document.createElement("span");
    low.className = "low";
    low.textContent = `${formatNumber(daily.temperature_2m_min[index], true)}°`;
    temperature.append(high, low);
    const range = document.createElement("div");
    range.className = "range-track";
    range.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.className = "range-fill";
    fill.style.left = `${(daily.temperature_2m_min[index] - rangeLow) / rangeSpan * 100}%`;
    fill.style.width = `${(daily.temperature_2m_max[index] - daily.temperature_2m_min[index]) / rangeSpan * 100}%`;
    range.append(fill);
    const rain = document.createElement("p");
    rain.className = "rain-chance";
    rain.textContent = daily.precipitation_probability_max[index] === null
      ? "Chưa có tỷ lệ mưa" : `Mưa ${formatNumber(daily.precipitation_probability_max[index], true)}%`;
    article.append(heading, dateLabel, icon, description, temperature, range, rain);
    fragment.append(article);
  });
  $("forecast-list").replaceChildren(fragment);
}

const weeklyChart = $("chart-graphic");
let weeklyChartWidth = 0;
// Đồ thị dùng cùng mảng daily với các thẻ; không nội suy số liệu thời tiết mới.
function renderTemperatureChart(daily) {
  const highs = daily.temperature_2m_max.slice(0, 7);
  const lows = daily.temperature_2m_min.slice(0, 7);
  const min = Math.floor(Math.min(...lows)) - 2;
  const max = Math.ceil(Math.max(...highs)) + 2;
  weeklyChartWidth = weeklyChart.clientWidth;
  const width = weeklyChartWidth || 760;
  const compact = width < 400;
  const left = compact ? 28 : 48;
  const right = compact ? 19 : 26;
  const x = (i) => left + i * (width - left - right) / Math.max(1, highs.length - 1);
  const y = (value) => 190 - (value - min) / (max - min) * 150;
  const svg = svgElement("svg", { viewBox: `0 0 ${width} 240`, width: String(width), height: "240", role: "img", "aria-labelledby": "chart-title chart-desc" });
  const title = svgElement("title", { id: "chart-title" });
  title.textContent = "Biểu đồ nhiệt độ cao nhất và thấp nhất trong 7 ngày";
  const description = svgElement("desc", { id: "chart-desc" });
  description.textContent = daily.time.slice(0, 7).map((date, i) => `${date}: cao nhất ${formatNumber(highs[i])} độ C, thấp nhất ${formatNumber(lows[i])} độ C`).join(". ");
  svg.append(title, description);
  const text = (value, attributes) => {
    const label = svgElement("text", { "font-family": "Segoe UI, Arial, sans-serif", "font-size": compact ? 10 : 12, ...attributes });
    label.textContent = value;
    svg.append(label);
  };
  for (let i = 0; i <= 3; i++) {
    const value = min + (max - min) * i / 3;
    svg.append(svgElement("line", { x1: left, x2: width - right, y1: y(value), y2: y(value), class: "chart-gridline" }));
    text(formatNumber(value, true), { x: left - 6, y: y(value) + 4, "text-anchor": "end", class: "chart-axis", "font-size": 10 });
  }
  // Màu do CSS quyết định (.chart-high/.chart-low) để khớp giao diện.
  for (const [series, tone, labelOffset] of [[highs, "chart-high", -13], [lows, "chart-low", 22]]) {
    svg.append(svgElement("polyline", { points: series.map((value, i) => `${x(i)},${y(value)}`).join(" "), class: `chart-line ${tone}` }));
    series.forEach((value, i) => {
      svg.append(svgElement("circle", { cx: x(i), cy: y(value), r: 4, class: `chart-dot ${tone}` }));
      text(`${formatNumber(value)}°`, { x: x(i), y: y(value) + labelOffset, class: `chart-label ${tone}`, "text-anchor": "middle", "font-weight": 600 });
    });
  }
  const tbody = document.createElement("tbody");
  daily.time.slice(0, 7).forEach((date, i) => {
    const short = `${date.slice(8, 10)}/${date.slice(5, 7)}`;
    text(i || compact ? short : "Hôm nay", { x: x(i), y: 229, class: "chart-axis", "text-anchor": "middle" });
    const row = document.createElement("tr");
    [short, formatNumber(highs[i]), formatNumber(lows[i])].forEach((value, index) => {
      const cell = document.createElement(index ? "td" : "th");
      if (!index) cell.scope = "row";
      cell.textContent = value;
      row.append(cell);
    });
    tbody.append(row);
  });
  weeklyChart.replaceChildren(svg);
  $("chart-data").querySelector("tbody").replaceWith(tbody);
}

new ResizeObserver(() => {
  if (state.weather && weeklyChart.clientWidth && weeklyChart.clientWidth !== weeklyChartWidth) {
    renderTemperatureChart(state.weather.daily);
  }
}).observe(weeklyChart);

function setForecastView(view) {
  const isChart = view === "chart";
  $("forecast-list").hidden = isChart;
  $("forecast-chart").hidden = !isChart;
  $("cards-button").setAttribute("aria-pressed", String(!isChart));
  $("chart-button").setAttribute("aria-pressed", String(isChart));
}

// 7. Sự kiện: Enter/nút tìm, chọn kết quả, cập nhật địa điểm hiện tại.
$("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void searchLocations($("location-input").value);
});
$("refresh-button").addEventListener("click", () => loadWeather(state.location));
$("cards-button").addEventListener("click", () => setForecastView("cards"));
$("chart-button").addEventListener("click", () => setForecastView("chart"));
for (const id of ["activity-select", "activity-date"]) $(id).addEventListener("change", () => {
  // Người dùng đã tự chọn ngày thì không tự chuyển sang ngày mai nữa (xem MayAdvice.render).
  if (id === "activity-date") $("activity-date").dataset.userPicked = "true";
  if (state.weather && !$("advice-results").hidden) MayAdvice.render(state.weather, state.location, $("activity-select").value, { keepHour: id === "activity-select" });
});
$("page-date").textContent = "Đang cập nhật";
renderQuickLocations();

function updateConnectionStatus() {
  $("connection-status").hidden = navigator.onLine;
}
window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
updateConnectionStatus();

// Công cụ trình duyệt dùng cùng các hàm xử lý với giao diện, khi được hỗ trợ.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
  const tool = {
    name: "search_weather_locations",
    title: "Tìm địa điểm thời tiết",
    description: "Tìm địa điểm theo tên và hiển thị danh sách kết quả; chưa chọn địa điểm.",
    inputSchema: { type: "object", properties: { query: { type: "string", minLength: 2, maxLength: 120 } }, required: ["query"], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    async execute(input) {
      if (!input || typeof input.query !== "string" || input.query.trim().length < 2 || input.query.length > 120) throw new Error("Tên địa điểm không hợp lệ.");
      $("location-input").value = input.query;
      const results = await searchLocations(input.query);
      return { locations: results.map(({ name, admin1, country, latitude, longitude }) => ({ name, admin1, country, latitude, longitude })), status: $("search-status").textContent };
    },
  };
  try { Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Trình duyệt chưa hỗ trợ đầy đủ: giao diện vẫn hoạt động. */ }
}

// Mở lại nơi xem gần nhất; dữ liệu lưu hỏng hoặc trình duyệt chặn lưu thì dùng nơi mặc định.
const LAST_KEY = "may.last.v1";
function lastViewed() {
  try { const place = JSON.parse(localStorage.getItem(LAST_KEY)); return place && validateLocation(place); } catch { return null; }
}
function rememberLocation(location) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify({ name: location.name, admin1: location.admin1, country: location.country, latitude: location.latitude, longitude: location.longitude })); } catch { /* Không lưu được thì lần sau mở nơi mặc định. */ }
}

document.addEventListener("DOMContentLoaded", async () => {
  const shared = WeatherDataTools.sharedLocation(window.location.search);
  const fallback = lastViewed() || DEFAULT_LOCATION;
  // Link chia sẻ trỏ ra nước ngoài thì mở nơi thường dùng thay vì để trang trống.
  if (shared && !(await loadWeather({ ...shared, vietnamOnly: true })) && state.lastError?.outside) void loadWeather(fallback);
  else if (!shared) void loadWeather(fallback);
}, { once: true });
