// Chỉ dùng trong kiểm thử, không được trang ứng dụng tải.
module.exports = function weatherFixture(base = {}) {
  const data = structuredClone(base);
  data.timezone = 'Asia/Ho_Chi_Minh';
  data.current = {time:'2026-10-09T14:15',temperature_2m:25,relative_humidity_2m:70,wind_speed_10m:10,apparent_temperature:25,precipitation:0,weather_code:0,is_day:1,precipitation_probability:10,uv_index:3};
  data.current_units = {temperature_2m:'°C',relative_humidity_2m:'%',wind_speed_10m:'km/h',apparent_temperature:'°C',precipitation:'mm',precipitation_probability:'%',uv_index:''};
  data.hourly_units = {apparent_temperature:'°C',precipitation_probability:'%',weather_code:'wmo code',wind_speed_10m:'km/h',is_day:'',uv_index:''};
  data.hourly = {time:[],apparent_temperature:[],precipitation_probability:[],weather_code:[],wind_speed_10m:[],is_day:[],uv_index:[]};
  for(let i=0;i<168;i++){
    const date=new Date(Date.UTC(2026,9,9,i));
    data.hourly.time.push(date.toISOString().slice(0,16));
    data.hourly.apparent_temperature.push(25);data.hourly.precipitation_probability.push(10);
    data.hourly.weather_code.push(0);data.hourly.wind_speed_10m.push(10);
    data.hourly.is_day.push(date.getUTCHours()>=6&&date.getUTCHours()<18?1:0);data.hourly.uv_index.push(3);
  }
  return data;
};
