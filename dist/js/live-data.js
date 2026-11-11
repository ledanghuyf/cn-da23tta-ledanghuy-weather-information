"use strict";
// Chỉ đọc phản hồi API. Không có dữ liệu mẫu hoặc số thay thế khi thiếu dữ liệu.
globalThis.WeatherDataTools = (() => {
  function timestamp(data) {
    const time = data?.current?.time, offset = data?.utc_offset_seconds;
    if (typeof time !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(time) || !Number.isFinite(offset) || Math.abs(offset) > 50400) return null;
    const stamp = Date.parse(time + "Z");
    if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0,16) !== time) return null;
    return stamp - offset * 1000;
  }
  function freshness(data, now = Date.now()) {
    const stamp = timestamp(data);
    if (stamp === null) return {kind:"unknown", text:"Chưa xác định được độ mới của dữ liệu."};
    const minutes = Math.floor((now - stamp) / 60000);
    if (minutes < -30) return {kind:"warning",text:"Mốc dữ liệu nằm sau giờ thiết bị. Hãy kiểm tra ngày giờ máy."};
    return {kind:minutes > 90 ? "warning" : "recent", text:minutes > 90 ? `Mốc dữ liệu đã cách ${minutes} phút. Hãy cập nhật trước khi sử dụng.` : `Mốc dữ liệu cách khoảng ${Math.max(0,minutes)} phút.`};
  }
  function airValue(data, key) {
    const expected = key === "us_aqi" ? "USAQI" : "μg/m³";
    const value = data?.current?.[key];
    return data?.current_units?.[key] === expected && Number.isFinite(value) && value >= 0 ? value : null;
  }
  function airBand(value) {
    if (!Number.isFinite(value) || value < 0) return ["Chưa có chỉ số", "unknown"];
    const bands = [[50,"Tốt","good"],[100,"Trung bình","moderate"],[150,"Kém với nhóm nhạy cảm","sensitive"],[200,"Không tốt","unhealthy"],[300,"Rất không tốt","very-unhealthy"],[Infinity,"Nguy hại","hazardous"]];
    return bands.find(([limit])=>value<=limit).slice(1);
  }
  function sharedLocation(search) {
    const q = new URLSearchParams(search), lat = q.get("lat"), lon = q.get("lon");
    if (!lat?.trim() || !lon?.trim()) return null;
    const latitude = Number(lat), longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>90 || Math.abs(longitude)>180) return null;
    return {latitude,longitude,name:(q.get("place")?.trim() || "Địa điểm được chia sẻ").slice(0,120),admin1:"",country:""};
  }
  return {timestamp,freshness,airValue,airBand,sharedLocation};
})();

if (typeof document !== "undefined") (() => {
  let record = null, busy = false, airController = null, airSerial = 0, airRecord = null;
  const tools = WeatherDataTools;
  const text = (id,value) => { $(id).textContent = value; };
  function onLoading() {
    busy = true;
    airController?.abort(); airSerial++; airRecord = null;
    $("air-values").hidden = true; $("air-section").hidden = true;
  }
  function onLoaded(location) {
    busy = false; record = {location:{...location}};
    void loadAir(location);
  }
  function onError() { busy = false; }
  async function loadAir(location) {
    airController?.abort(); const controller = new AbortController(); airController = controller;
    const serial = ++airSerial; airRecord = null;
    $("air-retry").hidden = true;
    $("air-section").hidden = false; $("air-section").setAttribute("aria-busy","true"); $("air-values").hidden = true;
    text("air-status",`Đang lấy chất lượng không khí tại ${location.name}…`);
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.search = new URLSearchParams({latitude:String(location.latitude),longitude:String(location.longitude),current:"us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone",timezone:"auto"});
    try {
      const data = await fetchJSON(url,controller.signal);
      if (serial !== airSerial || controller.signal.aborted) return;
      if (tools.timestamp(data) === null || typeof data.timezone !== "string") throw new Error("Phản hồi thiếu mốc thời gian hợp lệ.");
      // Bắt timezone không hợp lệ trước khi hiển thị bất kỳ số liệu nào.
      new Intl.DateTimeFormat("vi-VN",{timeZone:data.timezone}).format();
      const keys = ["us_aqi","pm2_5","pm10","nitrogen_dioxide","ozone"];
      if (keys.every(key=>tools.airValue(data,key)===null)) throw new Error("Nhà cung cấp chưa có số liệu phù hợp cho địa điểm này.");
      for (const key of keys) text(`air-${key}`,tools.airValue(data,key)===null ? "Chưa có" : formatNumber(tools.airValue(data,key)));
      const [label,band] = tools.airBand(tools.airValue(data,"us_aqi"));
      text("air-band",label); $("air-score").dataset.band=band;
      text("air-status",`${location.name} · ${data.current.time.replace("T"," · ")} · ${data.timezone}. ${tools.freshness(data).text}`);
      $("air-values").hidden = false;
      airRecord = {source:"Open-Meteo / CAMS",requestedUrl:String(url),fetchedAt:new Date().toISOString(),location:{...location},response:data};
    } catch(error) {
      if (serial !== airSerial || controller.signal.aborted) return;
      text("air-status",`Chưa tải được chất lượng không khí tại ${location.name}. ${error.message}`);
      $("air-retry").hidden=false;
    } finally { if (serial === airSerial) $("air-section").setAttribute("aria-busy","false"); }
  }
  $("air-retry").onclick=()=>{if(record && !busy) void loadAir(record.location);};
  // Chỉ cập nhật nhãn thời gian của dữ liệu không khí đã nhận.
  function tick() {
    if (airRecord) text("air-status",`${airRecord.location.name} · ${airRecord.response.current.time.replace("T"," · ")} · ${airRecord.response.timezone}. ${tools.freshness(airRecord.response).text}`);
  }
  setInterval(tick,60000); document.addEventListener("visibilitychange",tick);
  window.MayLive={onLoading,onLoaded,onError};
})();
