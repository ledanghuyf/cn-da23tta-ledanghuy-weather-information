"use strict";
// Các ngưỡng dưới đây là tiêu chí tham khảo của ứng dụng.
// Mã WMO: https://open-meteo.com/en/docs#weathervariables
globalThis.MayWeatherConfig = Object.freeze({
  strongWind: 30,
  highUV: 6,
  rainCodes: Object.freeze([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]),
  stormCodes: Object.freeze([95, 96, 97, 99]),
  // Ban ngày, trời quang/ít mây/mây rải rác hiển thị như Thời tiết iPhone: "Nhiều nắng", mặt trời, nền xanh.
  sunnyDayCodes: Object.freeze([0, 1, 2]),
});
