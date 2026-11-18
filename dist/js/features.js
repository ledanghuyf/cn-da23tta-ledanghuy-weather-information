"use strict";

// Các tính năng cá nhân chỉ lưu tên/tọa độ; thời tiết luôn được tải từ API.
(() => {
  const STORAGE_KEY = "may.locations.v1";
  const limits = { favorites: 6, history: 8 };
  const keyOf = (place) => `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
  let saved = { favorites: [], history: [] };

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
      if (message) {
        // Thông báo thành công chỉ hiện 2 giây; nếu đã bị thay bằng thông báo khác (vd. lỗi) thì giữ nguyên.
        setStatus("saved-status", message, "success");
        setTimeout(() => { if ($("saved-status").textContent === message) setStatus("saved-status", ""); }, 2000);
      }
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
    // Nút chỉ còn biểu tượng: đổi ngôi sao + tên đọc cho trình đọc màn hình + gợi ý khi rê chuột.
    $("save-location").querySelector(".action-icon").textContent = active ? "★" : "☆";
    $("save-location").querySelector(".action-label").textContent = active ? "Đã yêu thích" : "Lưu yêu thích";
    $("save-location").title = active ? "Bỏ khỏi yêu thích" : "Lưu yêu thích";
    $("save-location").setAttribute("aria-pressed", String(active));
    $("clear-history").disabled = !saved.history.length;
    if (focusedKey && focusedList) {
      [...$(focusedList).children].find(row => row.dataset.place === focusedKey)?.querySelector(".personal-place")?.focus({ preventScroll: true });
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
  window.MayFeatures = {
    onWeatherLoaded(place) {
      remember(place);
    },
  };
  readSaved();
  renderSaved();
  if (state.weather) window.MayFeatures.onWeatherLoaded(state.location);
})();
