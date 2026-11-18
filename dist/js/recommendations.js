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
  // Gợi ý theo thời tiết (trang phục, vật dụng, hoạt động) từ dữ liệu Open-Meteo hiện tại (+ khả năng mưa 3 giờ tới).
  // Mức theo ngưỡng khí tượng Việt Nam, dùng số liệu cả ngày hôm nay:
  //   Nóng: nhiệt độ cao nhất trong ngày > 35°C ("nắng nóng" — Quyết định 18/2021/QĐ-TTg, Điều 5 khoản 21).
  //   Lạnh: nhiệt độ trung bình ngày < 15°C ("rét đậm" — Thông tư 41/2016/TT-BTNMT); < 13°C là "rét hại" (QĐ 18/2021, khoản 18).
  //   Còn lại: Bình thường. Nhiệt độ TB ngày lấy daily.temperature_2m_mean, thiếu thì (cao nhất + thấp nhất) / 2.
  // Trang phục/hoạt động vẫn theo nhiệt độ cảm nhận (apparent_temperature) để cụ thể trong từng mức.
  // Trả { level, title, detail, lines: [trang phục, vật dụng, hoạt động] }; thiếu nhiệt độ thì null (không đoán).
  function outfitAdvice(data) {
    const current = data?.current || {}, code = current.weather_code, night = current.is_day === 0;
    const temp = number(data, "current", "temperature_2m", "°C");
    if (temp === null) return null;
    const feels = number(data, "current", "apparent_temperature", "°C") ?? temp;
    const humidity = number(data, "current", "relative_humidity_2m", "%");
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
    const deg = value => `${fmt(Math.round(value))}°`, f = Math.round(feels);
    const humid = humidity !== null && humidity >= 75, strongUV = !night && uv !== null && uv >= cfg.highUV;
    const wetSoon = raining || (peak !== null && peak >= 40);
    const when = peakAt !== null && peakAt > start ? ` lúc ${times[peakAt].slice(11, 16)}` : "";
    const tmax = number(data, "daily", "temperature_2m_max", "°C", 0), tmin = number(data, "daily", "temperature_2m_min", "°C", 0);
    const mean = number(data, "daily", "temperature_2m_mean", "°C", 0) ?? (tmax !== null && tmin !== null ? (tmax + tmin) / 2 : temp);
    const high = tmax ?? temp;
    const level = high > 35 ? "hot" : mean < 15 ? "cold" : "normal";
    const label = { cold: "Lạnh", normal: "Bình thường", hot: "Nóng" }[level];
    const official = level === "hot" ? `Nắng nóng: cao nhất hôm nay ${deg(high)}` : level === "cold" ? `${mean < 13 ? "Rét hại" : "Rét đậm"}: trung bình hôm nay ${deg(mean)}`
      : tmax !== null && tmin !== null ? `Hôm nay ${deg(tmin)}–${deg(tmax)}` : "";
    const veryHot = f > 30 || level === "hot", chilly = level === "cold" || f < 20;

    const clothes = (level === "cold" ? (mean < 13 ? "Áo khoác dày hoặc áo len, khăn quàng, găng tay và tất; giữ ấm khi ra ngoài." : "Áo ấm hoặc áo khoác dày, quần dài; giữ ấm cổ, tay chân.")
      : veryHot ? "Đồ mỏng, sáng màu, vải cotton hoặc linen thấm hút; tránh đồ tối màu, bó sát."
      : f < 20 ? "Áo khoác nhẹ hoặc áo len mỏng, quần dài; giữ ấm cổ khi ra ngoài."
      : f < 23 ? "Áo dài tay mỏng, hoặc áo thun kèm áo khoác nhẹ; quần dài."
      : f <= 26 ? "Áo thun hoặc sơ mi mỏng; sáng sớm, tối muộn mang thêm áo khoác nhẹ."
      : humid ? "Áo thun cotton hoặc linen, quần thoáng; trời ẩm nên chọn vải thấm hút mồ hôi." : "Áo thun, quần thoáng, vải nhẹ là vừa.")
      + (strongUV && level !== "cold" ? " Ra nắng thì mặc thêm áo khoác chống nắng." : "");

    const items = [];
    if (storm) items.push("Đang có dông: mang áo mưa, không dùng ô khi có sấm sét");
    else if (raining) items.push("Đang mưa: mang ô hoặc áo mưa");
    else if (wetSoon) items.push(`Mang ô hoặc áo mưa, khả năng mưa ${fmt(peak)}%${when}`);
    if (strongUV) items.push(`Che nắng: mũ rộng vành, kính râm, kem chống nắng SPF 50+ (UV ${fmt(uv)})`);

    let activity;
    if (storm) activity = "Ở trong nhà, tránh nơi trống trải và cây cao khi có sấm sét.";
    else if (raining) activity = night ? "Hạn chế ra ngoài tối nay, đường dễ trơn; đồ phơi nên đem vào." : "Không nên phơi đồ ngoài trời; ưu tiên hoạt động trong nhà.";
    else if (wetSoon) activity = `Có thể mưa${when}: phơi đồ dưới mái che, đi dạo nhớ mang ô.`;
    else if (night) activity = chilly ? "Tối lạnh: ra ngoài nhớ mặc ấm, tập trong nhà dễ chịu hơn."
      : veryHot ? "Tối vẫn oi: đi dạo nhẹ và uống đủ nước." : "Buổi tối dễ chịu, hợp đi dạo hoặc tập nhẹ ngoài trời.";
    else if (veryHot || strongUV) activity = "Tránh vận động ngoài trời khoảng 10–15 giờ; đi dạo, tập luyện vào sáng sớm hoặc chiều mát. Nắng tốt để phơi đồ.";
    else activity = (chilly ? "Trời se lạnh, hợp đi bộ nhanh." : "Thời tiết hợp đi dạo, tập thể dục ngoài trời.")
      + (humid ? ` Độ ẩm cao (${fmt(humidity)}%), đồ phơi lâu khô.` : " Trời khô ráo, phơi đồ nhanh khô.");
    if (wind !== null && wind >= cfg.strongWind) activity += ` Gió mạnh (${fmt(wind)} km/h): cẩn thận khi đi xe máy.`;

    return {
      // scale: con số quyết định mức (cao nhất khi nóng, trung bình ngày khi lạnh/bình thường) để đặt chấm trên thang.
      level, feels, scale: level === "hot" ? high : mean, title: `${label} · ${deg(temp)}`,
      detail: [official, `Cảm giác ${deg(feels)}`, humidity === null ? "" : `Độ ẩm ${fmt(humidity)}%`].filter(Boolean).join(" · "),
      lines: [
        { kind: "clothes", icon: "i-shirt", label: "Trang phục", text: clothes },
        { kind: "items", icon: "i-bag", label: "Vật dụng", text: items.length ? `${items.join(". ")}.` : "Không cần mang thêm gì." },
        { kind: "activity", icon: "i-walk", label: "Hoạt động", text: activity },
      ],
    };
  }
  return { outfitAdvice, localStamp };
})();
