"use strict";
// Các ngưỡng dưới đây là tiêu chí tham khảo của ứng dụng.
// Mã WMO: https://open-meteo.com/en/docs#weathervariables
globalThis.MayWeatherConfig = Object.freeze({
  coldFeelsLike: 18,
  hotFeelsLike: 32,
  highRainProbability: 60,
  strongWind: 30,
  highUV: 6,
  forecastHours: 24,
  maxSlots: 3,
  rainCodes: Object.freeze([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]),
  stormCodes: Object.freeze([95, 96, 97, 99]),
  // Ban ngày, trời quang/ít mây/mây rải rác hiển thị như Thời tiết iPhone: "Nhiều nắng", mặt trời, nền xanh.
  sunnyDayCodes: Object.freeze([0, 1, 2]),
  // Trời quang/mây thuộc nhóm ưu tiên; mưa nhẹ/vừa chỉ thuộc nhóm cần cân nhắc.
  outdoorCodes: Object.freeze([0, 1, 2, 3]),
  // Có thể cân nhắc mưa nhẹ/vừa; không đưa giông, mưa lớn, mưa đóng băng vào gợi ý.
  cautionCodes: Object.freeze([51, 53, 61, 63, 80, 81]),
  outdoorLimits: Object.freeze({ minFeelsLike: 5, maxFeelsLike: 38, maxWind: 30, maxUV: 8 }),
  activities: Object.freeze({
    walk: Object.freeze({
      label: "Đi bộ", minFeelsLike: 12, maxFeelsLike: 32, maxWind: 25, maxRain: 40, maxUV: 6, idealFeelsLike: 23,
      heatTip: "Đi chậm, chọn đường có bóng mát và mang nước.",
      rainTip: "Chọn đường có mái che và chú ý mặt đường trơn.",
      windTip: "Ưu tiên tuyến đường kín gió.",
    }),
    run: Object.freeze({
      label: "Chạy bộ", minFeelsLike: 12, maxFeelsLike: 28, maxWind: 22, maxRain: 30, maxUV: 6, idealFeelsLike: 20,
      stopFeelsLike: 34,
      heatTip: "Chạy nhẹ hơn hoặc chuyển sang giờ mát hơn.",
      rainTip: "Giảm tốc độ và tránh bề mặt trơn.",
      windTip: "Chọn đường chạy kín gió và giảm cường độ.",
    }),
    cycle: Object.freeze({
      label: "Đạp xe", minFeelsLike: 12, maxFeelsLike: 30, maxWind: 18, maxRain: 25, maxUV: 6, idealFeelsLike: 23,
      stopFeelsLike: 36, stopWind: 25, stopRainCodes: Object.freeze([63, 81]),
      heatTip: "Chọn tuyến ngắn, có chỗ nghỉ và tránh đoạn phơi nắng lâu.",
      rainTip: "Giảm tốc và chừa thêm khoảng cách phanh.",
      windTip: "Tránh đoạn đường trống hoặc cầu có gió ngang.",
    }),
  }),
});
