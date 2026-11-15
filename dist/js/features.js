"use strict";

// Các tính năng cá nhân chỉ lưu tên/tọa độ; thời tiết luôn được tải từ API.
(() => {
  const STORAGE_KEY = "may.locations.v1";
  const limits = { favorites: 6, history: 8 };
  const keyOf = (place) => `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
  let saved = { favorites: [], history: [] };
  let comparison = null;
  let compareController = null;
  let searchController = null;

  function cleanPlace(place) {
    validateLocation(place);
    const clean = { name: place.name.trim().slice(0, 120), latitude: place.latitude, longitude: place.longitude };
    for (const field of ["admin1", "country"]) {
      if (typeof place[field] === "string") clean[field] = place[field].trim().slice(0, 120);
    }
    return clean;
  }

  function readSaved() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!data || data.version !== 1) return;
      for (const field of Object.keys(limits)) {
        const unique = new Map();
        if (Array.isArray(data[field])) for (const item of data[field].slice(0, 100)) {
          try { const place = cleanPlace(item); unique.set(keyOf(place), place); } catch { /* Bỏ mục hỏng. */ }
        }
        saved[field] = [...unique.values()].slice(0, limits[field]);
      }
    } catch { /* Không có quyền lưu hoặc JSON hỏng: vẫn dùng được ứng dụng. */ }
  }

  function persist(message = "") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...saved }));
      if (message) setStatus("saved-status", message, "success");
    } catch {
      setStatus("saved-status", "Trình duyệt không cho lưu. Danh sách chỉ được giữ trong lần mở trang này.", "error");
    }
    renderSaved();
  }

  function remember(place) {
    const clean = cleanPlace(place);
    saved.history = [clean, ...saved.history.filter(item => keyOf(item) !== keyOf(clean))].slice(0, limits.history);
    persist();
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function button(label, className, action) {
    const element = node("button", className, label);
    element.type = "button";
    element.addEventListener("click", action);
    return element;
  }

  function renderSaved() {
    const focusedPlace = document.activeElement?.closest(".personal-row");
    const focusedKey = focusedPlace?.dataset.place;
    const focusedList = focusedPlace?.parentElement.id;
    for (const field of Object.keys(limits)) {
      const fragment = document.createDocumentFragment();
      for (const place of saved[field]) {
        const row = node("div", "personal-row");
        row.dataset.place = keyOf(place);
        const open = button("", "personal-place", () => loadWeather(place));
        open.append(node("span", "", place.name), node("small", "", regionLabel(place)));
        open.setAttribute("aria-label", `Xem thời tiết ${place.name}, ${regionLabel(place)}`);
        row.append(open);
        if (field === "favorites") {
          const remove = button("×", "remove-place", () => {
            saved.favorites = saved.favorites.filter(item => keyOf(item) !== keyOf(place));
            persist(`Đã bỏ ${place.name} khỏi yêu thích.`);
            $("save-location").focus({ preventScroll: true });
          });
          remove.setAttribute("aria-label", `Bỏ yêu thích ${place.name}`);
          row.append(remove);
        }
        fragment.append(row);
      }
      if (!saved[field].length) fragment.append(node("p", "personal-empty", field === "favorites" ? "Bấm ☆ Lưu yêu thích ở phần tổng quan." : "Các nơi đã tải thành công sẽ xuất hiện ở đây."));
      $(field === "favorites" ? "favorite-list" : "history-list").replaceChildren(fragment);
    }
    const active = saved.favorites.some(item => keyOf(item) === keyOf(state.location));
    $("save-location").textContent = active ? "★ Đã yêu thích" : "☆ Lưu yêu thích";
    $("save-location").setAttribute("aria-pressed", String(active));
    $("clear-history").disabled = !saved.history.length;
    renderShortcuts();
    if (focusedKey && focusedList) {
      [...$(focusedList).children].find(row => row.dataset.place === focusedKey)?.querySelector(".personal-place")?.focus({ preventScroll: true });
    }
  }

  function renderShortcuts() {
    const focused = document.activeElement?.parentElement?.id === "compare-quick" ? document.activeElement.dataset.place : null;
    const unique = new Map();
    [...saved.favorites, ...QUICK_LOCATIONS].forEach(place => {
      if (keyOf(place) !== keyOf(state.location)) unique.set(keyOf(place), place);
    });
    const fragment = document.createDocumentFragment();
    for (const place of [...unique.values()].slice(0, 6)) {
      const choice = button(place.name, "compare-choice", () => loadComparison(place));
      choice.dataset.place = keyOf(place);
      choice.title = regionLabel(place);
      choice.setAttribute("aria-pressed", String(comparison && keyOf(comparison.location) === keyOf(place) || false));
      fragment.append(choice);
    }
    $("compare-quick").replaceChildren(fragment);
    if (focused) [...$("compare-quick").children].find(choice => choice.dataset.place === focused)?.focus({ preventScroll: true });
  }

  function localTime(data) {
    const [date, time] = data.current.time.split("T");
    return `${time} · ${date.slice(8)}/${date.slice(5, 7)}/${date.slice(0, 4)} · ${data.timezone}`;
  }

  function renderComparison() {
    if (!comparison || !state.weather) return;
    const pairs = [["A · Đang xem", state.location, state.weather], ["B · Đối chiếu", comparison.location, comparison.weather]];
    const fragment = document.createDocumentFragment();
    for (const [label, place, data] of pairs) {
      const card = node("article", "compare-card");
      card.append(node("p", "compare-label", label), node("h4", "compare-place-name", place.name), node("p", "compare-region", regionLabel(place)));
      const hero = node("div", "compare-weather");
      hero.append(node("strong", "compare-temperature", `${formatNumber(data.current.temperature_2m)}°C`), weatherGraphic(data.current.weather_code, data.current.is_day));
      card.append(hero, node("p", "compare-condition", describeWeather(data.current.weather_code, data.current.is_day).label));
      const list = node("dl", "compare-metrics");
      const date = data.daily.time[0];
      const rain = data.daily.precipitation_probability_max[0];
      for (const [name, value] of [
        ["Cảm nhận", `${formatNumber(data.current.apparent_temperature)}°C`],
        ["Độ ẩm", `${formatNumber(data.current.relative_humidity_2m)}%`],
        ["Gió", `${formatNumber(data.current.wind_speed_10m)} km/h`],
        [`Mưa ${date.slice(8)}/${date.slice(5, 7)} · cao nhất`, rain === null ? "Chưa có dữ liệu" : `${formatNumber(rain)}%`],
      ]) {
        const row = node("div"); row.append(node("dt", "", name), node("dd", "", value)); list.append(row);
      }
      card.append(list, node("p", "compare-time", localTime(data)));
      fragment.append(card);
    }
    $("compare-cards").replaceChildren(fragment);
    const a = state.weather, b = comparison.weather;
    const insights = [];
    const difference = (av, bv, more, equal, unit) => {
      // So sánh trên cùng độ chính xác một chữ số thập phân như số hiển thị.
      const delta = Math.round((Math.round(av * 10) - Math.round(bv * 10))) / 10;
      return delta === 0 ? equal : `${delta > 0 ? state.location.name : comparison.location.name} ${more} ${formatNumber(Math.abs(delta))} ${unit}.`;
    };
    if (keyOf(state.location) === keyOf(comparison.location)) {
      insights.push("Hai bên đang cùng một địa điểm. Chọn nơi khác ở bên B để so sánh.");
    } else {
      insights.push(difference(a.current.temperature_2m, b.current.temperature_2m, "nóng hơn", "Hai nơi có cùng nhiệt độ hiển thị.", "°C"));
      insights.push(difference(a.current.wind_speed_10m, b.current.wind_speed_10m, "có gió mạnh hơn", "Hai nơi có cùng tốc độ gió hiển thị.", "km/h"));
      if (a.daily.time[0] !== b.daily.time[0]) {
        insights.push("Hai nơi đang khác ngày địa phương; xem ngày cạnh tỷ lệ mưa ở từng cột.");
      } else if (a.daily.precipitation_probability_max[0] === null || b.daily.precipitation_probability_max[0] === null) {
        insights.push("Chưa đủ dữ liệu để đối chiếu xác suất mưa.");
      } else {
        insights.push(difference(a.daily.precipitation_probability_max[0], b.daily.precipitation_probability_max[0], "có xác suất mưa cao nhất trong ngày lớn hơn", "Xác suất mưa cao nhất trong ngày bằng nhau.", "điểm phần trăm"));
      }
    }
    $("compare-insights").replaceChildren(...insights.map(text => node("li", "", text)));
    $("compare-content").hidden = false;
    $("compare-refresh").hidden = false;
    renderShortcuts();
  }

  async function loadComparison(rawPlace) {
    const place = cleanPlace(rawPlace);
    compareController?.abort();
    const controller = new AbortController();
    compareController = controller;
    $("comparison-section").setAttribute("aria-busy", "true");
    $("compare-refresh").disabled = true;
    $("compare-retry").hidden = true;
    setStatus("compare-status", `Đang tải thời tiết ${place.name} để so sánh…`);
    try {
      const data = await fetchJSON(forecastURL(place), controller.signal);
      if (controller.signal.aborted) return;
      validateWeather(data);
      comparison = { location: place, weather: data };
      remember(place);
      renderComparison();
      setStatus("compare-status", `Đã tải bên B: ${place.name}.`, "success");
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus("compare-status", `${error.message}${comparison ? ` Đang giữ bên B đã tải của ${comparison.location.name}.` : ""}`, "error");
      $("compare-retry").hidden = false;
      $("compare-retry").onclick = () => loadComparison(place);
    } finally {
      if (compareController === controller) {
        $("comparison-section").setAttribute("aria-busy", "false");
        $("compare-refresh").disabled = false;
      }
    }
  }

  async function searchComparison() {
    searchController?.abort();
    const controller = new AbortController();
    searchController = controller;
    const query = $("compare-input").value.trim();
    $("compare-results").replaceChildren();
    $("compare-search-button").disabled = false;
    if (query.length < 2 || query.length > 120) {
      $("compare-input").setAttribute("aria-invalid", "true");
      setStatus("compare-search-status", "Nhập tên địa điểm từ 2 đến 120 ký tự.", "error");
      return;
    }
    $("compare-input").removeAttribute("aria-invalid");
    $("compare-search-button").disabled = true;
    setStatus("compare-search-status", "Đang tìm địa điểm bên B…");
    try {
      const data = await fetchJSON(geocodingURL(query), controller.signal);
      if (controller.signal.aborted) return;
      if (data.results !== undefined && !Array.isArray(data.results)) throw new Error("Danh sách địa điểm trả về không hợp lệ.");
      const valid = (data.results || []).flatMap(item => { try { cleanPlace(item); return [item]; } catch { return []; } });
      if (data.results?.length && !valid.length) throw new Error("Địa điểm trả về thiếu tọa độ hợp lệ.");
      const places = valid.filter(inVietnam).map(cleanPlace);
      $("compare-results").replaceChildren(...places.map(place => {
        const choice = button("", "compare-result", () => loadComparison(place));
        choice.append(node("strong", "", place.name), node("small", "", regionLabel(place)));
        return choice;
      }));
      setStatus("compare-search-status", places.length ? "Chọn đúng tỉnh, thành để so sánh." : "Không tìm thấy địa điểm ở Việt Nam. Thử tên khác hoặc gõ không dấu.");
    } catch (error) {
      if (!controller.signal.aborted) setStatus("compare-search-status", error.message, "error");
    } finally {
      if (searchController === controller) $("compare-search-button").disabled = false;
    }
  }

  $("save-location").addEventListener("click", () => {
    if (!state.weather) return;
    const place = cleanPlace(state.location);
    if (saved.favorites.some(item => keyOf(item) === keyOf(place))) {
      saved.favorites = saved.favorites.filter(item => keyOf(item) !== keyOf(place));
      persist(`Đã bỏ ${place.name} khỏi yêu thích.`);
    } else if (saved.favorites.length === limits.favorites) {
      setStatus("saved-status", "Đã đủ 6 địa điểm yêu thích. Bỏ một nơi trước khi thêm nơi mới.", "error");
    } else {
      saved.favorites.push(place);
      persist(`Đã lưu ${place.name} vào yêu thích.`);
    }
  });
  $("clear-history").addEventListener("click", () => { saved.history = []; persist("Đã xóa lịch sử tra cứu."); });
  $("compare-form").addEventListener("submit", event => { event.preventDefault(); void searchComparison(); });
  $("compare-refresh").addEventListener("click", () => {
    if (!comparison) return;
    void loadWeather(state.location);
    void loadComparison(comparison.location);
  });
  window.MayFeatures = {
    onWeatherLoaded(place) {
      remember(place);
      if (comparison && keyOf(comparison.location) === keyOf(place)) comparison.weather = state.weather;
      renderComparison();
    },
  };
  readSaved();
  renderSaved();
  if (state.weather) window.MayFeatures.onWeatherLoaded(state.location);
})();
