"use strict";
globalThis.MayAdvice = (() => {
  const cfg = MayWeatherConfig;
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
  // Lời khuyên & trang phục: câu ngắn, nói thẳng, tiêu đề kèm đúng số liệu đang hiển thị.
  // Ngưỡng theo đề tài: nóng ≥ 31°C hoặc UV ≥ 6; mưa ≥ 50% (giờ này hoặc 3 giờ tới) hoặc mã mưa/dông; lạnh < 22°C.
  // Thiếu nhiệt độ thì không kết luận (trả []). Ban đêm không nhắc chống nắng.
  function outfitAdvice(data) {
    const current = data?.current || {}, code = current.weather_code, night = current.is_day === 0;
    const temp = number(data, "current", "temperature_2m", "°C");
    if (temp === null) return [];
    const feels = number(data, "current", "apparent_temperature", "°C");
    const wind = number(data, "current", "wind_speed_10m", "km/h");
    const uv = number(data, "current", "uv_index", "");
    const storm = cfg.stormCodes.includes(code), raining = storm || cfg.rainCodes.includes(code);
    // Khả năng mưa cao nhất từ giờ hiện tại đến 3 giờ tới, và giờ đạt mức đó.
    const times = Array.isArray(data?.hourly?.time) ? data.hourly.time : [];
    const start = times.findIndex(time => String(time).slice(0, 13) === String(current.time || "").slice(0, 13));
    let peak = number(data, "current", "precipitation_probability", "%"), peakAt = null;
    if (start >= 0) for (let i = start; i < Math.min(start + 4, times.length); i++) {
      const chance = number(data, "hourly", "precipitation_probability", "%", i);
      if (chance !== null && (peak === null || chance > peak)) { peak = chance; peakAt = i; }
    }
    const deg = value => `${fmt(Math.round(value))}°`, groups = [];
    const strongUV = uv !== null && uv >= cfg.highUV;
    if (!night && (temp >= 31 || strongUV)) {
      groups.push({ id: "sun", icon: "i-sun", title: strongUV ? `Nắng gắt · UV ${fmt(uv)}` : `Nóng · ${deg(temp)}`, tips: [
        "Mặc áo khoác chống nắng, đội mũ rộng vành hoặc che ô.",
        "Thoa kem chống nắng SPF 50+; đi xe máy thì đeo thêm kính râm, bao tay.",
        "Mang theo nước. Nắng gắt nhất khoảng 10–15 giờ.",
      ] });
    } else if (temp >= 31 || (feels !== null && temp >= 26 && feels - temp >= 3)) {
      groups.push({ id: "humid", icon: "i-temp", title: `Oi bức · cảm giác như ${deg(feels ?? temp)}`, tips: ["Mặc đồ cotton hoặc vải mỏng, thoáng.", "Uống đủ nước, nhất là khi vận động."] });
    }
    if (raining || (peak !== null && peak >= 50)) {
      const title = storm ? "Có dông" : raining ? "Đang mưa"
        : peakAt !== null && peakAt > start ? `Có thể mưa lúc ${times[peakAt].slice(11, 16)} · ${fmt(peak)}%` : `Khả năng mưa ${fmt(peak)}%`;
      const tips = ["Mang áo mưa hoặc ô.", "Đi dép quai hậu hoặc giày chống nước; đường dễ trơn."];
      if (storm) tips.push("Có sấm sét thì vào nhà, đừng trú dưới cây cao hay cột điện.");
      groups.push({ id: "rain", icon: "i-rain", title, tips });
    }
    if (temp < 22) {
      groups.push(temp < 15
        ? { id: "cold", icon: "i-temp", title: `Lạnh · ${deg(temp)}`, tips: ["Mặc áo ấm dày, quàng khăn, đi tất.", "Ra ngoài sáng sớm hoặc tối muộn thì đội mũ len, đeo găng tay."] }
        : { id: "cold", icon: "i-temp", title: `Se lạnh · ${deg(temp)}`, tips: ["Mặc áo khoác mỏng hoặc áo khoác gió.", "Sáng sớm và tối muộn nhớ giữ ấm cổ và tay."] });
    }
    if (!groups.length) {
      groups.push({ id: "mild", icon: night ? "i-temp" : "i-sun", title: `Dễ chịu · ${deg(temp)}`, tips: [temp < 26 ? "Mặc đồ thoáng là được, sáng sớm có thể mang thêm áo mỏng." : "Mặc đồ thoáng là được, không cần mang gì thêm."] });
    }
    if (wind !== null && wind >= cfg.strongWind) {
      groups.push({ id: "wind", icon: "i-wind", title: `Gió mạnh · ${fmt(wind)} km/h`, tips: ["Mặc áo khoác gió, giữ chắc mũ.", "Đi xe máy chậm lại, nhất là khi qua cầu."] });
    }
    return groups;
  }
  return { outfitAdvice, localStamp };
})();
