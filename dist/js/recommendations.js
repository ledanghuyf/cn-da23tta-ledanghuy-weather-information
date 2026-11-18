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
  // Mức theo nhiệt độ cảm nhận (apparent_temperature đã gộp nhiệt độ, độ ẩm, gió; thiếu thì dùng nhiệt độ):
  //   Lạnh < 20°C · Mát 20–26°C · Nóng ≥ 27°C (27°C là mốc "cần chú ý" của chỉ số nhiệt NOAA). Trên 30°C lời khuyên chống nóng mạnh hơn.
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
    const level = f < 20 ? "cold" : f <= 26 ? "cool" : "hot", veryHot = f > 30;
    const label = { cold: "Lạnh", cool: "Mát", hot: "Nóng" }[level];

    const clothes = {
      cold: f < 15 ? "Áo khoác dày hoặc áo len, khăn quàng, quần dài và tất." : "Áo khoác nhẹ hoặc áo len mỏng, quần dài; giữ ấm cổ khi ra ngoài.",
      cool: f < 23 ? "Áo dài tay mỏng, hoặc áo thun kèm áo khoác nhẹ; quần dài." : "Áo thun hoặc sơ mi mỏng; sáng sớm, tối muộn mang thêm áo khoác nhẹ.",
      hot: (veryHot ? "Đồ mỏng, sáng màu, vải cotton hoặc linen thấm hút; tránh đồ tối màu, bó sát."
        : humid ? "Áo thun cotton hoặc linen, quần thoáng; trời ẩm nên chọn vải thấm hút mồ hôi." : "Áo thun, quần thoáng, vải nhẹ là vừa.")
        + (strongUV ? " Ra nắng thì mặc thêm áo khoác chống nắng." : ""),
    }[level];

    const items = [];
    if (storm) items.push("Đang có dông: mang áo mưa, không dùng ô khi có sấm sét");
    else if (raining) items.push("Đang mưa: mang ô hoặc áo mưa");
    else if (wetSoon) items.push(`Mang ô hoặc áo mưa, khả năng mưa ${fmt(peak)}%${when}`);
    if (strongUV) items.push(`Che nắng: mũ rộng vành, kính râm, kem chống nắng SPF 50+ (UV ${fmt(uv)})`);

    let activity;
    if (storm) activity = "Ở trong nhà, tránh nơi trống trải và cây cao khi có sấm sét.";
    else if (raining) activity = night ? "Hạn chế ra ngoài tối nay, đường dễ trơn; đồ phơi nên đem vào." : "Không nên phơi đồ ngoài trời; ưu tiên hoạt động trong nhà.";
    else if (wetSoon) activity = `Có thể mưa${when}: phơi đồ dưới mái che, đi dạo nhớ mang ô.`;
    else if (night) activity = level === "cold" ? "Tối lạnh: ra ngoài nhớ mặc ấm, tập trong nhà dễ chịu hơn."
      : veryHot ? "Tối vẫn oi: đi dạo nhẹ và uống đủ nước." : "Buổi tối dễ chịu, hợp đi dạo hoặc tập nhẹ ngoài trời.";
    else if (veryHot || strongUV) activity = "Tránh vận động ngoài trời khoảng 10–15 giờ; đi dạo, tập luyện vào sáng sớm hoặc chiều mát. Nắng tốt để phơi đồ.";
    else activity = (level === "cold" ? "Trời se lạnh, hợp đi bộ nhanh." : "Thời tiết hợp đi dạo, tập thể dục ngoài trời.")
      + (humid ? ` Độ ẩm cao (${fmt(humidity)}%), đồ phơi lâu khô.` : " Trời khô ráo, phơi đồ nhanh khô.");
    if (wind !== null && wind >= cfg.strongWind) activity += ` Gió mạnh (${fmt(wind)} km/h): cẩn thận khi đi xe máy.`;

    return {
      level, feels, title: `${label} · ${deg(temp)}`,
      detail: `Cảm giác ${deg(feels)}${humidity === null ? "" : ` · Độ ẩm ${fmt(humidity)}%`}`,
      lines: [
        { kind: "clothes", icon: "i-shirt", label: "Trang phục", text: clothes },
        { kind: "items", icon: "i-bag", label: "Vật dụng", text: items.length ? `${items.join(". ")}.` : "Không cần mang thêm gì." },
        { kind: "activity", icon: "i-walk", label: "Hoạt động", text: activity },
      ],
    };
  }
  return { outfitAdvice, localStamp };
})();
