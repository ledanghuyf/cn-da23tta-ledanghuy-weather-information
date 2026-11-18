"use strict";
// Vị trí là bắt buộc: mở trang là tự định vị; chưa có vị trí thì không hiện thời tiết và khóa ô tìm kiếm.
// Có vị trí rồi: hiện thời tiết nơi đang đứng (hoặc nơi trong link chia sẻ) và gợi ý xã/phường lân cận khi bấm vào ô tìm kiếm.
(() => {
  const retry = $("locate-retry"), input = $("location-input");
  const messages = {
    denied: "Bạn chưa cho phép truy cập vị trí. Hãy bật quyền Vị trí cho trang này trong cài đặt trình duyệt rồi bấm Thử lại.",
    unavailable: "Thiết bị chưa lấy được vị trí. Hãy bật dịch vụ Vị trí (GPS) rồi bấm Thử lại.",
    timeout: "Lấy vị trí quá lâu. Hãy kiểm tra GPS, kết nối mạng rồi bấm Thử lại.",
    unsupported: "Trình duyệt này không hỗ trợ lấy vị trí. Hãy mở trang bằng Chrome, Edge hoặc Safari.",
    insecure: "Trình duyệt chỉ cho lấy vị trí trên trang HTTPS. Hãy mở trang bằng địa chỉ bắt đầu bằng https://.",
    policy: "Trang đang bị chặn quyền vị trí (ví dụ khi được nhúng trong trang khác). Hãy mở trực tiếp trang trong trình duyệt.",
    invalid: "Thiết bị trả về vị trí không hợp lệ. Hãy bấm Thử lại.",
    outside: "Vị trí hiện tại của bạn nằm ngoài Việt Nam. Ứng dụng chỉ hỗ trợ địa điểm ở Việt Nam.",
    unknown: "Chưa lấy được vị trí. Hãy kiểm tra quyền Vị trí rồi bấm Thử lại.",
  };
  let serial = 0, timer = null;

  function lockSearch(locked) {
    input.disabled = locked; $("search-button").disabled = locked;
    input.placeholder = locked ? "Cho phép vị trí để bắt đầu" : "Tìm địa điểm ở Việt Nam…";
  }
  function fail(kind) {
    clearTimeout(timer); serial++;
    $("weather-content").dataset.locate = kind;
    $("empty-title").textContent = kind === "outside" ? "Bạn đang ở ngoài Việt Nam" : "Cần vị trí của bạn để xem thời tiết";
    $("empty-message").textContent = messages[kind] || messages.unknown;
    setStatus("weather-status", messages[kind] || messages.unknown, "error");
    $("weather-content").setAttribute("aria-busy", "false");
    retry.hidden = false;
  }
  function locate() {
    const token = ++serial;
    retry.hidden = true; lockSearch(true); delete $("weather-content").dataset.locate;
    $("weather-content").setAttribute("aria-busy", "true");
    $("empty-title").textContent = "Đang xác định vị trí của bạn";
    $("empty-message").textContent = "Hãy cho phép truy cập Vị trí khi trình duyệt hỏi. Ứng dụng cần vị trí để hiện thời tiết nơi bạn đang ở.";
    setStatus("weather-status", "Đang xác định vị trí của bạn…");
    if (!window.isSecureContext) return fail("insecure");
    if (!navigator.geolocation) return fail("unsupported");
    const policy = document.permissionsPolicy || document.featurePolicy;
    if (policy?.allowsFeature && !policy.allowsFeature("geolocation")) return fail("policy");
    // Một số trình duyệt nhúng không gọi cả hai hàm trả về: không để trang chờ mãi.
    timer = setTimeout(() => { if (token === serial) fail("timeout"); }, 35000);
    const onError = error => { if (token === serial) fail(({ 1: "denied", 2: "unavailable", 3: "timeout" })[error?.code] || "unknown"); };
    const onPosition = async position => {
      if (token !== serial) return;
      clearTimeout(timer);
      const { latitude, longitude } = position?.coords || {};
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return fail("invalid");
      if (!MayVietnam.contains(latitude, longitude)) return fail("outside");
      setStatus("weather-status", "Đã có vị trí. Đang xác định tên nơi và tải thời tiết…");
      const here = await nameCoordinates(latitude, longitude);
      if (token !== serial) return;
      state.here = here; nearby = null; lockSearch(false);
      const shared = WeatherDataTools.sharedLocation(window.location.search);
      // Link chia sẻ mở nơi trong link; link trỏ ra nước ngoài thì về nơi đang đứng.
      if (!(shared && (await loadWeather({ ...shared, vietnamOnly: true }) || !state.lastError?.outside))) await loadWeather({ ...here, vietnamOnly: true });
      if (token === serial) void loadNearby(); // tải sẵn gợi ý lân cận để bấm vào ô tìm kiếm là có ngay
    };
    try { navigator.geolocation.getCurrentPosition(onPosition, onError, { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }); }
    catch (error) { onError({ code: error?.name === "SecurityError" ? 1 : 0 }); }
  }
  retry.addEventListener("click", locate);

  // Gợi ý "Gần bạn": nơi đang đứng + xã/phường lân cận. Tra ngược OSM (zoom 10 = cấp xã/phường) tại 6 điểm cách ~6 km
  // quanh vị trí (mỗi lần gọi cách nhau 1 giây theo chính sách Nominatim). Tải sẵn ngay sau khi có thời tiết, hiện cả danh sách
  // một lần khi tra xong, và nhớ trên máy 7 ngày theo ô ~1 km để lần sau có ngay, không phải tra lại.
  let nearby = null, opened = false; // opened: người dùng đã bấm vào ô tìm kiếm (tải sẵn không tự bật bảng gợi ý)
  const NEARBY_KEY = "may.nearby.v1", WEEK = 7 * 864e5;
  const areaKey = here => `${here.latitude.toFixed(2)},${here.longitude.toFixed(2)}`;
  function cachedNearby(here) {
    try {
      const saved = JSON.parse(localStorage.getItem(NEARBY_KEY));
      if (saved?.key !== areaKey(here) || !(Date.now() - saved.at < WEEK) || !Array.isArray(saved.places)) return null;
      return saved.places.filter(place => { try { validateLocation(place); return true; } catch { return false; } });
    } catch { return null; } // dữ liệu hỏng hoặc trình duyệt chặn lưu trữ: tra lại
  }
  function saveNearby(here, places) {
    if (!places.length) return; // không nhớ kết quả rỗng (có thể do mạng lỗi)
    try { localStorage.setItem(NEARBY_KEY, JSON.stringify({ key: areaKey(here), at: Date.now(), places })); } catch { /* chặn lưu trữ: chỉ nhớ trong phiên */ }
  }
  function button(place, label) {
    const item = document.createElement("button");
    item.type = "button"; item.className = "result-button";
    const name = document.createElement("span"), region = document.createElement("span");
    name.className = "result-name"; name.textContent = label ? `${label} · ${place.name}` : place.name;
    region.className = "result-region"; region.textContent = regionLabel(place);
    item.append(name, region);
    item.addEventListener("click", () => loadWeather(place));
    return item;
  }
  function renderNearby() {
    const show = opened && Boolean(state.here) && !input.value.trim();
    $("nearby").hidden = !show;
    if (!show) { $("nearby-list").replaceChildren(); return; } // không để nút gợi ý ẩn lẫn vào kết quả tìm kiếm
    $("nearby-list").replaceChildren(button(state.here, "Vị trí hiện tại"), ...(nearby?.done ? nearby.places : []).map(place => button(place)));
    $("nearby-status").textContent = !nearby || nearby.done ? (nearby?.done && !nearby.places.length ? "Chưa tìm được xã, phường lân cận." : "") : "Đang tìm các xã, phường lân cận…";
  }
  async function loadNearby() {
    const here = state.here;
    if (!here || nearby) return;
    const cached = cachedNearby(here);
    if (cached) { nearby = { places: cached, done: true }; renderNearby(); return; }
    const mine = nearby = { places: [], done: false };
    renderNearby();
    const km = 6, lat0 = here.latitude, lon0 = here.longitude, found = [];
    for (let i = 0; i < 6 && nearby === mine; i++) {
      const angle = i * Math.PI / 3;
      const lat = lat0 + km / 111 * Math.cos(angle), lon = lon0 + km / 111 * Math.sin(angle) / Math.cos(lat0 * Math.PI / 180);
      try {
        const place = MayVietnam.fromOSM(await nominatimJSON("reverse", { lat: lat.toFixed(5), lon: lon.toFixed(5), zoom: "10" }, new AbortController().signal), true);
        if (place && place.name !== here.name && !found.some(p => p.name === place.name)) found.push(place);
      } catch { /* điểm lỗi hoặc bị giới hạn: bỏ qua, thử điểm tiếp theo */ }
    }
    if (nearby !== mine) return;
    mine.places = found; mine.done = true; saveNearby(here, found); renderNearby();
  }
  const openNearby = () => { opened = true; renderNearby(); void loadNearby(); };
  input.addEventListener("focus", openNearby);
  $("search-form").addEventListener("submit", () => { if (!input.value.trim()) openNearby(); }); // bấm Tìm khi ô trống: hiện gợi ý thay vì báo lỗi
  input.addEventListener("input", renderNearby);

  lockSearch(true);
  document.addEventListener("DOMContentLoaded", locate, { once: true });
})();
