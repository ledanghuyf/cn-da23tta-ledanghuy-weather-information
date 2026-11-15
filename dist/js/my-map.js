"use strict";
// Mở thẳng tab Google Maps mới ở mức thu phóng tổng quát (11z) kèm chấm đỏ vị trí khi bấm "Bản đồ khu vực".
(() => {
  const button = document.getElementById("place-map");
  const panel = document.getElementById("my-map-result");
  const status = document.getElementById("my-map-status");
  const overview = document.getElementById("my-map-overview");
  const link = document.getElementById("my-map-link");
  const cancel = document.getElementById("map-cancel");
  let sequence = 0;
  let timer;
  let mapWindow = null;

  function closePendingMap() {
    if (mapWindow && !mapWindow.closed) mapWindow.close();
    mapWindow = null;
  }

  function finish(message = "") {
    clearTimeout(timer);
    button.disabled = false;
    cancel.hidden = true;
    status.textContent = message;
    status.hidden = !message;
    if (!message && overview.hidden && link.hidden) {
      panel.hidden = true;
    }
  }

  cancel.onclick = () => {
    sequence++;
    closePendingMap();
    overview.hidden = true;
    link.hidden = true;
    finish("");
  };

  button.onclick = () => {
    const token = ++sequence;
    overview.hidden = true;
    overview.replaceChildren();
    link.hidden = true;
    link.removeAttribute("href");
    closePendingMap();

    if (!window.isSecureContext || !navigator.geolocation) {
      panel.hidden = false;
      finish("GPS trên điện thoại cần website HTTPS. Địa chỉ HTTP trong mạng Wi-Fi bị trình duyệt chặn trên cả Safari, Chrome và các trình duyệt khác. Hãy mở bản HTTPS của website để xem vị trí hiện tại.");
      return;
    }

    // Mở tab mới ngay trong sự kiện click để trình duyệt không chặn cửa sổ bật lên.
    mapWindow = window.open("about:blank", "_blank");
    if (mapWindow) {
      try {
        mapWindow.document.title = "Đang mở Google Maps…";
      } catch {}
    }

    button.disabled = true;
    panel.hidden = false;
    cancel.hidden = false;
    status.hidden = true;
    status.textContent = "";

    const fail = error => {
      if (token !== sequence) return;
      sequence++;
      closePendingMap();
      overview.hidden = true;
      link.hidden = true;
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
        const { latitude, longitude } = position.coords || {};
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
          fail();
          return;
        }

        // Làm tròn 2 chữ số thập phân (~1,1 km) và mở thẳng trang Google Maps mới ở mức thu phóng tổng quát 11z kèm chấm đỏ
        const latOverview = Number(latitude.toFixed(2));
        const lonOverview = Number(longitude.toFixed(2));
        const coordPair = `${latOverview},${lonOverview}`;
        const mapUrl = new URL(`https://www.google.com/maps/place/${coordPair}/@${coordPair},11z`);
        link.href = mapUrl.href;
        link.hidden = true;

        if (mapWindow && !mapWindow.closed) {
          mapWindow.location.replace(mapUrl.href);
          mapWindow = null;
        } else {
          window.open(mapUrl.href, "_blank", "noopener,noreferrer");
        }

        finish("");
      }, fail, { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 });
    } catch {
      fail();
    }
  };
})();
