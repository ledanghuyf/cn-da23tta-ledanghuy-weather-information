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
      if (shared && (await loadWeather({ ...shared, vietnamOnly: true }) || !state.lastError?.outside)) return;
      await loadWeather({ ...here, vietnamOnly: true });
    };
    try { navigator.geolocation.getCurrentPosition(onPosition, onError, { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }); }
    catch (error) { onError({ code: error?.name === "SecurityError" ? 1 : 0 }); }
  }
  retry.addEventListener("click", locate);

  // Gợi ý "Gần bạn": nơi đang đứng + xã/phường lân cận. Tra ngược OSM (zoom 10 = cấp xã/phường) tại 6 điểm cách ~6 km
  // quanh vị trí; mỗi lần gọi cách nhau 1 giây nên danh sách hiện dần. Chỉ tra khi người dùng bấm vào ô tìm kiếm, nhớ trong phiên.
  let nearby = null;
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
    const show = Boolean(state.here) && !input.value.trim();
    $("nearby").hidden = !show;
    if (!show) { $("nearby-list").replaceChildren(); return; } // không để nút gợi ý ẩn lẫn vào kết quả tìm kiếm
    $("nearby-list").replaceChildren(button(state.here, "Vị trí hiện tại"), ...(nearby?.places || []).map(place => button(place)));
    $("nearby-status").textContent = !nearby || nearby.done ? (nearby?.done && !nearby.places.length ? "Chưa tìm được xã, phường lân cận." : "") : "Đang tìm các xã, phường lân cận…";
  }
  async function loadNearby() {
    const here = state.here;
    if (!here || nearby) return;
    const mine = nearby = { places: [], done: false };
    renderNearby();
    const km = 6, lat0 = here.latitude, lon0 = here.longitude;
    for (let i = 0; i < 6 && nearby === mine; i++) {
      if (input.value.trim()) { nearby = null; return; } // người dùng đang gõ tìm: nhường lượt gọi cho tìm kiếm, lần bấm sau tra tiếp
      const angle = i * Math.PI / 3;
      const lat = lat0 + km / 111 * Math.cos(angle), lon = lon0 + km / 111 * Math.sin(angle) / Math.cos(lat0 * Math.PI / 180);
      try {
        const place = MayVietnam.fromOSM(await nominatimJSON("reverse", { lat: lat.toFixed(5), lon: lon.toFixed(5), zoom: "10" }, new AbortController().signal), true);
        if (nearby === mine && place && place.name !== here.name && !mine.places.some(p => p.name === place.name)) { mine.places.push(place); renderNearby(); }
      } catch { /* điểm lỗi hoặc bị giới hạn: bỏ qua, thử điểm tiếp theo */ }
    }
    if (nearby === mine) { mine.done = true; renderNearby(); }
  }
  input.addEventListener("focus", () => { renderNearby(); void loadNearby(); });
  input.addEventListener("input", renderNearby);

  lockSearch(true);
  document.addEventListener("DOMContentLoaded", locate, { once: true });
})();
