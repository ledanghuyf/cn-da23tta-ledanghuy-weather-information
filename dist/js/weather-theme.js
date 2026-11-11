"use strict";
globalThis.MayTheme = (() => {
  const config = MayWeatherConfig;
  function select(current) {
    if (!current || ![0, 1].includes(current.is_day)) return { weather: "default", phase: "unknown", scene: "default" };
    const code = current.weather_code;
    const weather = config.stormCodes.includes(code) ? "storm"
      : config.rainCodes.includes(code) ? "rain"
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
  return { select, apply };
})();
