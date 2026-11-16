"use strict";
globalThis.MayTheme = (() => {
  const config = MayWeatherConfig;
  // Tỉ lệ thời gian có nắng (0–1) trong một khoảng; dữ liệu thiếu hoặc vô lý trả NaN.
  const ratio = (seconds, span) =>
    Number.isFinite(seconds) && Number.isFinite(span) && span > 0 && seconds >= 0 && seconds <= span ? seconds / span : NaN;
  // Mã WMO của Open-Meteo xếp "u ám" (mã 3) theo tổng lượng mây, kể cả mây ti mỏng mà nắng vẫn xuyên qua.
  // Rà soát 60 tỉnh thành 13–16/11/2026: 80% giờ ban ngày mang mã 3 vẫn có ≥ 45 phút nắng.
  // Vì vậy ban ngày, khi không mưa/sương/dông, dùng thời gian nắng để chọn trạng thái như Thời tiết iPhone.
  function sky(code, isDay, sun) {
    if (isDay !== 1 || ![0, 1, 2, 3].includes(code)) return null;
    if (config.sunnyDayCodes.includes(code)) return "sunny";
    if (!Number.isFinite(sun)) return "cloudy";
    return sun >= 0.5 ? "sunny" : sun >= 0.2 ? "partly" : "cloudy";
  }
  function select(current) {
    if (!current || ![0, 1].includes(current.is_day)) return { weather: "default", phase: "unknown", scene: "default" };
    const code = current.weather_code;
    const state = sky(code, current.is_day, ratio(current.sunshine_duration, current.interval));
    const weather = config.stormCodes.includes(code) ? "storm"
      : config.rainCodes.includes(code) ? "rain"
      : state ? state
      : [0, 1].includes(code) ? "sunny"
      : [2, 3, 45, 48, 71, 73, 75, 77, 85, 86].includes(code) ? "cloudy" : "default";
    const phase = current.is_day === 0 ? "night" : "day";
    return { weather, phase, scene: phase === "night" ? "night" : weather === "sunny" ? "day" : weather };
  }
  function apply(current = null) {
    const theme = select(current);
    document.body.dataset.weather = theme.weather;
    document.body.dataset.phase = theme.phase;
    const panel = document.getElementById("current-panel");
    panel.dataset.scene = theme.scene;
    panel.dataset.weather = theme.weather;
    return theme;
  }
  return { select, apply, sky, ratio };
})();
