"use strict";
globalThis.MayAdvice = (() => {
  const cfg = MayWeatherConfig;
  const HOUR = 3600000;
  const fmt = value => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
  // API trả ISO địa phương với offset cố định trong một phản hồi. Gắn Z chỉ
  // để làm số học trên trục giờ này; tuyệt đối không dùng múi giờ máy người xem.
  function localStamp(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
    const stamp = Date.parse(`${value}:00Z`);
    return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 16) === value ? stamp : NaN;
  }
  function number(data, group, key, unit, index = null) {
    if (data?.[`${group}_units`]?.[key] !== unit) return null;
    const value = index === null ? data?.[group]?.[key] : data?.[group]?.[key]?.[index];
    return Number.isFinite(value) ? value : null;
  }
  function currentAdvice(data) {
    const current = data?.current || {};
    const feels = number(data, "current", "apparent_temperature", "°C");
    const rain = number(data, "current", "precipitation_probability", "%");
    const wind = number(data, "current", "wind_speed_10m", "km/h");
    const uv = number(data, "current", "uv_index", "");
    const precipitation = number(data, "current", "precipitation", "mm");
    const items = [];
    const add = (id, title, reason) => items.push({ id, title, reason });
    if (cfg.stormCodes.includes(current.weather_code)) {
      add("storm", "Ưu tiên ở trong nhà khi có giông", "Thông tin thời tiết hiện tại báo giông. Hoãn hoạt động ngoài trời trong điều kiện này.");
    }
    if (cfg.rainCodes.includes(current.weather_code) || cfg.stormCodes.includes(current.weather_code) || precipitation > 0) {
      add("rain", "Chuẩn bị ô hoặc áo mưa", `Dữ liệu hiện tại ${cfg.rainCodes.includes(current.weather_code) || cfg.stormCodes.includes(current.weather_code) ? "báo mưa hoặc giông" : `vừa ghi nhận lượng mưa ${fmt(precipitation)} mm`}.${cfg.stormCodes.includes(current.weather_code) ? " Khi có giông, ưu tiên trú trong nhà." : ""}`);
    } else if (rain !== null && rain >= cfg.highRainProbability && rain <= 100) {
      add("rain-risk", "Mang theo ô hoặc áo mưa", `Xác suất giáng thủy tại mốc hiện tại là ${fmt(rain)}%, đạt ngưỡng tham khảo ${cfg.highRainProbability}%. Đây là xác suất, không khẳng định đang mưa.`);
    }
    if (feels !== null && feels <= cfg.coldFeelsLike) add("cold", "Mang thêm áo khoác", `Nhiệt độ cảm nhận ${fmt(feels)}°C, ở mức ≤ ${cfg.coldFeelsLike}°C của ứng dụng.`);
    if (feels !== null && feels >= cfg.hotFeelsLike) add("heat", "Mang mũ, uống đủ nước", `Nhiệt độ cảm nhận ${fmt(feels)}°C, đạt ngưỡng nóng ${cfg.hotFeelsLike}°C. Ưu tiên chỗ mát khi ra ngoài.`);
    if (wind !== null && wind >= cfg.strongWind) add("wind", "Cân nhắc hoãn hoạt động ngoài trời", `Gió ${fmt(wind)} km/h, đạt ngưỡng ${cfg.strongWind} km/h của ứng dụng.`);
    if (uv !== null && uv >= cfg.highUV) add("uv", "Ưu tiên bóng râm, mang mũ", `Chỉ số UV ${fmt(uv)}, đạt ngưỡng tham khảo ${cfg.highUV}.`);
    return items;
  }
  function hourlyRows(data) {
    const hourly = data?.hourly;
    if (!Array.isArray(hourly?.time)) return [];
    const seen = new Set();
    return hourly.time.map((time, index) => {
      const stamp = localStamp(time);
      // Không nối nhầm khi mảng bị lệch độ dài, không ép null về 0.
      const value = (key, unit) => Array.isArray(hourly[key]) && hourly[key].length === hourly.time.length
        ? number(data, "hourly", key, unit, index) : null;
      const row = { time, stamp, feels: value("apparent_temperature", "°C"), rain: value("precipitation_probability", "%"),
        wind: value("wind_speed_10m", "km/h"), code: value("weather_code", "wmo code"), day: value("is_day", ""), uv: value("uv_index", ""),
        sun: globalThis.MayTheme ? MayTheme.ratio(value("sunshine_duration", "s") ?? NaN, 3600) : NaN };
      row.valid = Number.isFinite(stamp) && !seen.has(stamp) && row.feels !== null && row.rain !== null && row.rain >= 0 && row.rain <= 100 &&
        row.wind !== null && row.wind >= 0 && Number.isInteger(row.code) && [0, 1].includes(row.day);
      if (Number.isFinite(stamp)) seen.add(stamp);
      if (row.uv !== null && row.uv < 0) row.uv = null;
      return row;
    });
  }
  function assess(slot, profile) {
    const { codes, wind, rain, minFeels, maxFeels, uvPeak } = slot;
    const limits = cfg.outdoorLimits;
    const blockers = [], notes = [];
    const stopHeat = profile.stopFeelsLike ?? limits.maxFeelsLike;
    const stopWind = profile.stopWind ?? limits.maxWind;
    const activity = profile.label.toLowerCase();
    if (codes.some(code => cfg.stormCodes.includes(code))) blockers.push("Dự báo có giông. Ưu tiên hoạt động trong nhà.");
    else if (codes.some(code => [55, 65, 82, 56, 57, 66, 67].includes(code))) blockers.push("Dự báo có mưa lớn, mưa phùn dày hoặc mưa đóng băng.");
    else if (codes.some(code => !cfg.outdoorCodes.includes(code) && !cfg.cautionCodes.includes(code))) blockers.push("Dự báo có sương mù, tuyết hoặc tình trạng chưa xác định.");
    else if (codes.some(code => profile.stopRainCodes?.includes(code))) blockers.push("Dự báo mưa vừa hoặc mưa rào vừa. Nên dời giờ đạp xe vì mặt đường có thể trơn và tầm nhìn giảm.");
    if (wind >= stopWind) blockers.push(`Gió lên tới ${fmt(wind)} km/h, đạt ngưỡng hoãn ${activity} (${stopWind} km/h).`);
    if (maxFeels >= stopHeat) blockers.push(`Cảm nhận lên tới ${fmt(maxFeels)} °C, đạt ngưỡng hoãn ${activity} (${stopHeat} °C).`);
    if (minFeels < limits.minFeelsLike) blockers.push(`Cảm nhận xuống dưới ${limits.minFeelsLike} °C, quá lạnh theo tiêu chí của ứng dụng.`);
    if (uvPeak !== null && uvPeak >= limits.maxUV) blockers.push(`UV đạt ${fmt(uvPeak)}. Chọn giờ khác có UV thấp hơn.`);
    if (codes.some(code => cfg.cautionCodes.includes(code))) notes.push(`Dự báo có mưa. ${profile.rainTip}`);
    else if (rain > profile.maxRain) notes.push(`Xác suất mưa ${fmt(rain)}%, cao hơn mức ưu tiên ${profile.maxRain}% cho ${activity}. ${profile.rainTip}`);
    if (maxFeels > profile.maxFeelsLike) notes.push(`Cảm nhận ${fmt(maxFeels)} °C, cao hơn mức ưu tiên ${profile.maxFeelsLike} °C cho ${activity}. ${profile.heatTip}`);
    if (minFeels < profile.minFeelsLike) notes.push(`Cảm nhận dưới ${profile.minFeelsLike} °C. Mặc đủ ấm trước khi ra ngoài.`);
    if (wind >= profile.maxWind) notes.push(`Gió ${fmt(wind)} km/h, đạt mức cần cân nhắc cho ${activity} (${profile.maxWind} km/h). ${profile.windTip}`);
    if (uvPeak !== null && uvPeak >= profile.maxUV) notes.push(`UV đạt ${fmt(uvPeak)}. Chọn chỗ có bóng râm hoặc đổi sang giờ có UV thấp hơn.`);
    return { level: blockers.length ? "blocked" : notes.length ? "caution" : "favorable", notes, blockers };
  }
  function chooseSlots(data, activity = "walk", selectedDate = "") {
    const profile = cfg.activities[activity] || cfg.activities.walk;
    const now = localStamp(data?.current?.time);
    if (!Number.isFinite(now)) return { slots: [], allSlots: [], status: "missing", incomplete: true, reasons: [] };
    const dayStart = selectedDate ? localStamp(`${selectedDate}T00:00`) : null;
    if (selectedDate && !Number.isFinite(dayStart)) return { slots: [], allSlots: [], status: "missing", incomplete: true, reasons: [] };
    const startTime = selectedDate ? Math.max(now, dayStart) : now;
    const horizon = selectedDate ? dayStart + 24 * HOUR : now + cfg.forecastHours * HOUR;
    const rows = hourlyRows(data);
    const future = rows.filter(row => row.stamp >= startTime && row.stamp <= horizon);
    const candidates = [];
    const allSlots = [];
    let evaluated = 0;
    let daytime = 0;
    const exclusions = new Map();
    const record = (key, values = []) => {
      const reason = exclusions.get(key) || { count: 0, values: [] };
      reason.count++; reason.values.push(...values); exclusions.set(key, reason);
    };
    for (let i = 0; i < future.length - 1; i++) {
      const start = future[i], end = future[i + 1];
      if (end.stamp - start.stamp !== HOUR || !start.valid || !end.valid) continue;
      evaluated++;
      if (start.day === 1 && end.day === 1) {
        daytime++;
        const pair = [start, end];
        if (pair.some(row => cfg.stormCodes.includes(row.code))) record("storm");
        else if (pair.some(row => cfg.rainCodes.includes(row.code))) record("rain");
        else if (pair.some(row => !cfg.outdoorCodes.includes(row.code))) record("condition");
        if (pair.some(row => row.rain > profile.maxRain)) record("probability", pair.filter(row => row.rain > profile.maxRain).map(row => row.rain));
        if (pair.some(row => row.feels > profile.maxFeelsLike)) record("heat", pair.filter(row => row.feels > profile.maxFeelsLike).map(row => row.feels));
        if (pair.some(row => row.feels < profile.minFeelsLike)) record("cold", pair.filter(row => row.feels < profile.minFeelsLike).map(row => row.feels));
        if (pair.some(row => row.wind >= Math.min(profile.maxWind, cfg.strongWind))) record("wind", pair.map(row => row.wind));
        if (pair.some(row => row.uv !== null && row.uv >= profile.maxUV)) record("uv", pair.filter(row => row.uv !== null).map(row => row.uv));
      }
      // Cả đầu và cuối giờ phải là ban ngày và đủ dữ liệu hợp lệ.
      if (start.day !== 1 || end.day !== 1) continue;
      const rain = Math.max(start.rain, end.rain), wind = Math.max(start.wind, end.wind);
      const uv = start.uv !== null && end.uv !== null ? Math.max(start.uv, end.uv) : null;
      const facts = { rain, wind, uv, uvPeak: uv ?? start.uv ?? end.uv,
        minFeels: Math.min(start.feels, end.feels), maxFeels: Math.max(start.feels, end.feels), codes: [start.code, end.code], suns: [start.sun, end.sun] };
      const slot = { start: start.time, end: end.time, stamp: start.stamp, ...facts, ...assess(facts, profile),
        score: rain + Math.max(Math.abs(start.feels - profile.idealFeelsLike), Math.abs(end.feels - profile.idealFeelsLike)) * 2 + wind + (uv ?? profile.maxUV) };
      allSlots.push(slot);
      if (slot.level !== "blocked") candidates.push(slot);
    }
    // Ưu tiên ít mưa, nhiệt độ gần mức mong muốn, gió/UV thấp; đồng điểm chọn giờ sớm.
    candidates.sort((a, b) => Number(a.level === "caution") - Number(b.level === "caution") || a.score - b.score || a.stamp - b.stamp);
    const slots = candidates.slice(0, cfg.maxSlots).sort((a, b) => a.stamp - b.stamp);
    const expected = Math.max(0, Math.floor((horizon - Math.ceil(startTime / HOUR) * HOUR) / HOUR));
    const reasons = [...exclusions].sort((a, b) => b[1].count - a[1].count).slice(0, 2).map(([key, reason]) => {
      const max = reason.values.length ? fmt(Math.max(...reason.values)) : "", min = reason.values.length ? fmt(Math.min(...reason.values)) : "";
      const descriptions = {
        storm: "Dự báo có giông", rain: "Dự báo có mưa", condition: "Có sương mù, tuyết hoặc tình trạng chưa phù hợp để gợi ý",
        probability: `Khả năng mưa lên tới ${max}% (mức chọn giờ: ≤ ${profile.maxRain}%)`,
        heat: `Cảm nhận lên tới ${max}°C (mức chọn giờ: ≤ ${profile.maxFeelsLike}°C)`,
        cold: `Cảm nhận xuống tới ${min}°C (mức chọn giờ: ≥ ${profile.minFeelsLike}°C)`,
        wind: `Gió lên tới ${max} km/h (mức chọn giờ: < ${Math.min(profile.maxWind, cfg.strongWind)} km/h)`,
        uv: `UV lên tới ${max} (mức chọn giờ: < ${profile.maxUV})`,
      };
      return `${descriptions[key]} · ${reason.count}/${daytime} khung ban ngày đã kiểm tra.`;
    });
    if (!daytime && evaluated) reasons.push("Chưa có khung đủ một giờ ban ngày với dữ liệu đầy đủ trong khoảng dự báo này.");
    return { slots, allSlots, status: slots.length ? "ok" : evaluated ? "none" : "missing", incomplete: evaluated < expected, reasons };
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const levelLabels = { favorable: "Thuận lợi", caution: "Cần cân nhắc", blocked: "Không khuyến nghị" };
  const levelLabel = (level, uv) => level === "favorable" && uv === null ? "Có thể phù hợp" : levelLabels[level];
  const slotLabel = slot => `${slot.start.slice(11)}–${slot.end.slice(11)} · ${slot.start.slice(8, 10)}/${slot.start.slice(5, 7)}`;
  function renderAssessment(detail, slot, profile) {
    const conditions = [...new Set(slot.codes.map((code, i) => describeWeather(code, 1, slot.suns?.[i] ?? NaN).label))].join(" / ");
    const feels = slot.minFeels === slot.maxFeels ? fmt(slot.minFeels) : `${fmt(slot.minFeels)}–${fmt(slot.maxFeels)}`;
    const heading = element("div", "activity-result-heading");
    heading.append(element("h4", "", `${profile.label} · ${slotLabel(slot)}`), element("span", "slot-level", levelLabel(slot.level, slot.uv)));
    const metrics = element("dl", "activity-metrics");
    for (const [label, value] of [
      ["Cảm nhận", `${feels} °C`],
      ["Xác suất mưa tối đa", `${fmt(slot.rain)}%`],
      ["Gió tối đa", `${fmt(slot.wind)} km/h`],
      ["UV tối đa", slot.uv === null ? "Chưa có dữ liệu" : fmt(slot.uv)],
    ]) {
      const metric = element("div", "");
      metric.append(element("dt", "", label), element("dd", "", value));
      metrics.append(metric);
    }
    const notes = slot.blockers.length ? slot.blockers : slot.notes;
    detail.dataset.level = slot.level;
    detail.append(heading, element("p", "activity-condition", conditions), metrics);
    if (notes.length) {
      const list = element("ul", "hour-notes");
      list.append(...notes.map(note => element("li", "", note)));
      detail.append(list);
    } else {
      detail.append(element("p", "", "Nhiệt độ cảm nhận, xác suất mưa và gió nằm trong mức ưu tiên của hoạt động này."));
    }
    const basis = slot.uv === null
      ? "Chưa đủ dữ liệu UV để đánh giá yếu tố này. Giờ hiển thị theo địa phương."
      : "Đánh giá tham khảo theo dự báo. Giờ hiển thị theo địa phương.";
    const comparison = element("div", "activity-comparison");
    const choices = element("ul", "activity-levels");
    for (const other of Object.values(cfg.activities)) {
      const { level } = other === profile ? slot : assess(slot, other);
      const choice = element("li", "");
      choice.dataset.level = level;
      if (other === profile) choice.dataset.selected = "true";
      choice.append(element("strong", "", other.label), element("span", "slot-level", levelLabel(level, slot.uv)));
      choices.append(choice);
    }
    comparison.append(element("h5", "", "So sánh cùng khung giờ"), choices);
    detail.append(comparison, element("p", "slot-uv activity-result-note", basis));
  }
  function render(data, location, activity = "", { keepHour = false } = {}) {
    const byId = id => document.getElementById(id);
    const profile = cfg.activities[activity];
    const daySelect = byId("activity-date");
    const today = data.current.time.slice(0, 10);
    const dates = (data.daily?.time || []).slice(0, 7).filter(date => date > today && Number.isFinite(localStamp(`${date}T00:00`)));
    let selectedDate = dates.includes(daySelect.value) ? daySelect.value : "";
    // Buổi tối hôm nay đã hết giờ ban ngày: tự xem ngày mai thay vì bắt người dùng tự đổi (trừ khi họ đã tự chọn ngày).
    // Gồm cả lần vẽ lại sau đó (ngày mai đã được tự chọn) để câu giải thích không biến mất.
    const autoNext = (!selectedDate || selectedDate === dates[0]) && !daySelect.dataset.userPicked && dates.length > 0 &&
      !chooseSlots(data, activity, today).allSlots.length && chooseSlots(data, activity, dates[0]).allSlots.length > 0;
    if (autoNext) selectedDate = dates[0];
    const option = (value, label) => { const item = element("option", "", label); item.value = value; return item; };
    daySelect.replaceChildren(option("", "Hôm nay"),
      ...dates.map(date => option(date, `${date.slice(8)}/${date.slice(5, 7)}`)));
    daySelect.value = selectedDate;
    const period = selectedDate ? `ngày ${selectedDate.slice(8)}/${selectedDate.slice(5, 7)}` : "hôm nay";
    byId("activity-period").textContent = `Dự báo cho ${period}`;
    byId("advice-location").textContent = `${location.name} · Giờ địa phương`;
    const items = currentAdvice(data);
    byId("current-advice").replaceChildren(...items.map(item => {
      const card = element("article", "advice-card"); card.dataset.advice = item.id;
      card.append(element("h5", "", item.title), element("p", "", item.reason)); return card;
    }));
    const result = chooseSlots(data, activity, selectedDate || today);
    // Giữ giờ khi đổi loại hoạt động nếu khung giờ vẫn còn trong ngày đang xem.
    const hourSelect = byId("activity-hour");
    const previousHour = keepHour ? hourSelect.value : "";
    const detail = byId("activity-hour-detail");
    const method = document.querySelector(".advice-method");
    const showHour = () => {
      const slot = result.allSlots.find(item => item.start === hourSelect.value);
      const hasAssessment = Boolean(slot && profile);
      detail.replaceChildren();
      detail.hidden = !hasAssessment;
      method.hidden = !hasAssessment;
      byId("activity-status").hidden = hasAssessment;
      const autoNote = autoNext ? `Hôm nay đã hết giờ ban ngày nên đang xem ${period}. ` : "";
      byId("activity-status").textContent = !result.allSlots.length
        ? `Chưa có khung giờ ban ngày để đánh giá (${period}). Hãy chọn ngày khác.`
        : autoNote + (!slot && !profile ? "Chọn giờ và hoạt động để xem dự báo cho kế hoạch của bạn."
          : !slot ? "Chọn một khung giờ ban ngày để xem đánh giá."
            : "Chọn hoạt động bạn muốn thực hiện vào giờ này.");
      if (hasAssessment) renderAssessment(detail, slot, profile);
    };
    hourSelect.replaceChildren(option("", result.allSlots.length ? "Chọn giờ" : "Chưa có giờ"),
      ...result.allSlots.map(slot => option(slot.start, `${slot.start.slice(11)}–${slot.end.slice(11)}`)));
    hourSelect.value = result.allSlots.some(slot => slot.start === previousHour) ? previousHour : "";
    hourSelect.disabled = !result.allSlots.length;
    hourSelect.onchange = showHour; showHour();
    byId("activity-hour-picker").hidden = false;
    byId("advice-current-block").hidden = !profile || Boolean(selectedDate) || !items.length;
    byId("advice-current-block").open = false;
    if (!profile) return;
    const stopHeat = profile.stopFeelsLike ?? cfg.outdoorLimits.maxFeelsLike;
    const stopWind = profile.stopWind ?? cfg.outdoorLimits.maxWind;
    byId("activity-criteria").textContent = `Ứng dụng đối chiếu dự báo ở đầu và cuối giờ. Mức ưu tiên cho ${profile.label.toLowerCase()} là cảm nhận ${profile.minFeelsLike}–${profile.maxFeelsLike} °C, xác suất mưa tối đa ${profile.maxRain}%, gió dưới ${profile.maxWind} km/h và UV dưới ${profile.maxUV} khi có dữ liệu. Ngưỡng hoãn gồm cảm nhận từ ${stopHeat} °C hoặc gió từ ${stopWind} km/h.`
      + (profile.stopRainCodes ? " Mưa vừa cũng nằm trong nhóm nên hoãn đạp xe." : "")
      + " Giông và mưa lớn áp dụng mức không khuyến nghị cho cả ba hoạt động. Các ngưỡng là tiêu chí tham khảo của ứng dụng.";
  }
  return { currentAdvice, hourlyRows, chooseSlots, localStamp, render };
})();
