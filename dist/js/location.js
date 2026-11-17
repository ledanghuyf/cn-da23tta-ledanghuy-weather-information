"use strict";
// Lỗi lấy tọa độ khác lỗi tải thời tiết. Không dùng IP hay tọa độ giả thay thế.
(() => {
  const button = $("locate-button"), label = $("locate-label"), status = $("locate-status"), help = $("locate-help");
  const idleLabel = label.textContent;
  let serial = 0, active = false, ownWeatherStart = false, timer = null;
  const messages = {
    denied: "Bạn chưa cho phép định vị hoặc quyền vị trí đang bị chặn. Hãy kiểm tra quyền của trang và thiết bị rồi thử lại.",
    unavailable: "Thiết bị chưa cung cấp được tọa độ (lỗi 2). Kiểm tra dịch vụ Vị trí và quyền truy cập của trình duyệt, rồi thử lại.",
    timeout: "Đã hết thời gian chờ lấy vị trí (lỗi 3). Hãy kiểm tra kết nối, quyền vị trí và bấm Thử định vị lại.",
    unsupported: "Trình duyệt này không hỗ trợ lấy vị trí. Hãy mở trang bằng Chrome/Edge hoặc tìm địa điểm bằng tên.",
    insecure: "Điện thoại đang mở trang HTTP trong mạng Wi-Fi. Trình duyệt chặn GPS trên địa chỉ này. Hãy xuất bản thư mục dist lên website HTTPS rồi mở liên kết HTTPS trên trình duyệt bạn muốn dùng. Tìm địa điểm bằng tên vẫn hoạt động ở đây.",
    policy: "Trang đang bị chặn quyền định vị bởi trình duyệt hoặc khung nhúng. Hãy mở trực tiếp liên kết HTTPS trong trình duyệt và cho phép quyền Vị trí.",
    invalid: "Trình duyệt trả về tọa độ chưa hợp lệ. Hãy thử lại hoặc tìm địa điểm bằng tên.",
    unknown: "Trình duyệt không hoàn tất yêu cầu định vị. Hãy kiểm tra quyền Vị trí hoặc tìm địa điểm bằng tên.",
    weather: "Đã nhận được tọa độ nhưng chưa tải được thời tiết. Xem thông báo ở phần Tổng quan và bấm Thử tải lại.",
    outside: "Vị trí hiện tại của bạn nằm ngoài Việt Nam. Ứng dụng chỉ hỗ trợ địa điểm ở Việt Nam, hãy tìm một nơi bằng tên.",
  };
  function finish() {
    clearTimeout(timer); timer = null; active = false;
    button.disabled = false; status.dataset.pending = "false"; $("locate-cancel").hidden = true;
  }
  function fail(kind) {
    finish(); serial++; status.dataset.error = kind;
    status.textContent = messages[kind] || messages.unknown;
    label.textContent = "Thử định vị lại";
    if (kind === "outside") return; // không phải lỗi GPS nên không mở hướng dẫn xử lý định vị
    help.hidden = false; help.open = true;
    $("locate-url").value = `${location.origin}${location.pathname}`;
  }
  function cancel(message = "Đã hủy định vị. Bạn có thể thử lại hoặc tìm địa điểm bằng tên.") {
    if (ownWeatherStart || !active) return;
    finish(); serial++; label.textContent = idleLabel; status.textContent = message;
  }
  function request() {
    if (active) return;
    const token = ++serial;
    help.hidden = true; status.dataset.error = ""; $("locate-copy-status").textContent = "";
    if (!window.isSecureContext) { fail("insecure"); return; }
    if (!navigator.geolocation) { fail("unsupported"); return; }
    const policy = document.permissionsPolicy || document.featurePolicy;
    if (policy?.allowsFeature && !policy.allowsFeature("geolocation")) { fail("policy"); return; }
    active = true; button.disabled = true; status.dataset.pending = "true"; label.textContent = "Đang lấy vị trí…";
    $("locate-cancel").hidden = false;
    status.textContent = "Hãy cho phép Vị trí nếu trình duyệt hỏi. Đang chờ tọa độ, tối đa khoảng 35 giây…";
    // Một số trình duyệt nhúng không gọi cả success/error. Không để nút treo mãi.
    timer = setTimeout(() => { if (token === serial && active) fail("timeout"); }, 35000);
    let receivedPosition = false;
    const isCurrent = () => token === serial && active && !receivedPosition;
    const onError = error => { if (!isCurrent()) return; fail(({1:"denied",2:"unavailable",3:"timeout"})[error?.code] || "unknown"); };
    const onPosition = async position => {
      if (!isCurrent()) return;
      receivedPosition = true; clearTimeout(timer); timer = null;
      const coords = position?.coords;
      if (!Number.isFinite(coords?.latitude) || !Number.isFinite(coords?.longitude) || Math.abs(coords.latitude) > 90 || Math.abs(coords.longitude) > 180) { fail("invalid"); return; }
      // Keep full precision; rounding to 2 decimals can move the forecast hundreds of metres.
      const latitude = coords.latitude, longitude = coords.longitude;
      const accuracy = Number.isFinite(coords.accuracy) ? Math.max(1, Math.round(coords.accuracy)) : null;
      status.dataset.accuracy = accuracy === null ? "" : String(accuracy);
      $("locate-cancel").hidden = true; label.textContent = "Đang tải thời tiết…";
      status.textContent = "Đã nhận được vị trí gần bạn. Đang xác định tên nơi và tải thời tiết…";
      const place = await nameCoordinates(latitude, longitude);
      if (token !== serial) return; // đã hủy trong lúc tra tên
      try {
        ownWeatherStart = true;
        const pending = loadWeather({ ...place, vietnamOnly: true });
        ownWeatherStart = false;
        const weather = await pending;
        if (token !== serial) return;
        if (!weather) { fail(state.lastError?.outside ? "outside" : "weather"); return; }
        finish(); label.textContent = idleLabel;
        status.textContent = accuracy === null
          ? "Đã tải thời tiết theo vị trí của bạn."
          : `Đã tải thời tiết theo vị trí của bạn (thiết bị ước tính sai số khoảng ±${accuracy} m).`;
      } catch {
        ownWeatherStart = false;
        if (token === serial) fail("weather");
      }
    };
    try {
      navigator.geolocation.getCurrentPosition(onPosition, onError, { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 });
    } catch (error) { onError({ code: error?.name === "SecurityError" ? 1 : 0 }); }
  }
  button.addEventListener("click", request);
  $("locate-cancel").addEventListener("click", () => cancel());
  $("locate-search").addEventListener("click", () => { $("location-input").focus(); $("location-input").scrollIntoView({block:"center",behavior:"instant"}); });
  $("locate-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("locate-url").value); $("locate-copy-status").textContent = "Đã sao chép. Dán địa chỉ vào trình duyệt bạn đang dùng."; }
    catch { $("locate-url").focus(); $("locate-url").select(); $("locate-copy-status").textContent = "Hãy nhấn Ctrl+C để sao chép địa chỉ đã chọn."; }
  });
  window.MayLocation = { cancel };
})();
