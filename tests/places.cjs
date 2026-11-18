// Đổi địa điểm trong kiểm thử: trang không còn nút địa điểm mẫu nên gọi thẳng loadWeather như khi chọn một kết quả tìm kiếm.
// Không trả về promise để kiểm thử "phản hồi treo" vẫn chạy tiếp được.
const PLACES = [
  { name: 'Vĩnh Long', admin1: 'Vĩnh Long', country: 'Việt Nam', latitude: 10.2537, longitude: 105.9722 },
  { name: 'Hà Nội', admin1: 'Hà Nội', country: 'Việt Nam', latitude: 21.0245, longitude: 105.84117 },
  { name: 'TP. Hồ Chí Minh', admin1: 'TP. Hồ Chí Minh', country: 'Việt Nam', latitude: 10.82302, longitude: 106.62965 },
  { name: 'Đà Nẵng', admin1: 'Đà Nẵng', country: 'Việt Nam', latitude: 16.06778, longitude: 108.22083 },
];
module.exports = (page, index) => page.evaluate(place => { loadWeather(place); }, PLACES[index]);
