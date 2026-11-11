"use strict";
// Open a fresh device position in Google Maps after an explicit user action.
(() => {
  const button = document.getElementById("place-map");
  const panel = document.getElementById("my-map-result");
  const status = document.getElementById("my-map-status");
  const link = document.getElementById("my-map-link");
  const cancel = document.getElementById("map-cancel");
  let sequence = 0;
  let timer;
  let mapWindow = null;

  function closePendingMap() {
    if (mapWindow && !mapWindow.closed) mapWindow.close();
    mapWindow = null;
  }

  function finish(message) {
    clearTimeout(timer);
    button.disabled = false;
    cancel.hidden = true;
    status.textContent = message;
  }

  cancel.onclick = () => {
    sequence++;
    closePendingMap();
    finish("Đã hủy lấy vị trí.");
  };

  button.onclick = () => {
    const token = ++sequence;
    panel.hidden = false;
    link.hidden = true;
    link.removeAttribute("href");
    closePendingMap();

    if (!window.isSecureContext || !navigator.geolocation) {
      finish("GPS trên điện thoại cần website HTTPS. Địa chỉ HTTP trong mạng Wi-Fi bị trình duyệt chặn trên cả Safari, Chrome và các trình duyệt khác. Hãy mở bản HTTPS của website để xem vị trí hiện tại.");
      return;
    }

    // Open synchronously from the click so popup blockers allow the later map URL.
    mapWindow = window.open("about:blank", "_blank");
    if (mapWindow) mapWindow.document.title = "Đang xác định vị trí…";

    button.disabled = true;
    cancel.hidden = false;
    status.textContent = "Đang lấy vị trí GPS mới… Hãy cho phép truy cập vị trí nếu trình duyệt hỏi.";

    const fail = error => {
      if (token !== sequence) return;
      sequence++;
      closePendingMap();
      const message = ({
        1: "Quyền vị trí đang bị chặn. Hãy cho phép Vị trí trong cài đặt trình duyệt rồi thử lại.",
        2: "Thiết bị chưa cung cấp được tọa độ. Hãy bật dịch vụ vị trí hoặc thử lại ở nơi có tín hiệu GPS tốt hơn.",
        3: "Hết thời gian chờ vị trí. Hãy thử lại ở nơi thoáng hơn hoặc dùng điện thoại có GPS.",
      })[error?.code] || "Chưa lấy được vị trí. Hãy thử lại.";
      finish(message);
    };

    timer = setTimeout(() => fail({ code: 3 }), 35000);

    try {
      navigator.geolocation.getCurrentPosition(position => {
        if (token !== sequence) return;
        const { latitude, longitude, accuracy } = position.coords || {};
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
          fail();
          return;
        }

        const mapUrl = new URL("https://www.google.com/maps/search/");
        mapUrl.searchParams.set("api", "1");
        mapUrl.searchParams.set("query", `${latitude},${longitude}`);
        link.href = mapUrl.href;

        const accuracyText = Number.isFinite(accuracy)
          ? ` (thiết bị ước tính sai số khoảng ±${Math.max(1, Math.round(accuracy))} m)`
          : "";

        if (mapWindow && !mapWindow.closed) {
          mapWindow.location.replace(mapUrl.href);
          mapWindow = null;
          link.hidden = true;
          finish(`Đã mở bản đồ tại vị trí vừa lấy${accuracyText}.`);
        } else {
          link.hidden = false;
          finish(`Đã lấy vị trí${accuracyText}. Bấm liên kết bên dưới để mở Google Maps.`);
        }
      }, fail, { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 });
    } catch {
      fail();
    }
  };
})();
