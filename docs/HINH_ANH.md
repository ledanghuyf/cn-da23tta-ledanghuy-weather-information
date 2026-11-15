# Logo, biểu tượng và hình minh họa — phiên bản 2.1.2

Tên hiển thị thống nhất: **Thời tiết**.

## Các ảnh và biểu tượng đang được website sử dụng

| Tài nguyên trong `dist` | Vị trí sử dụng |
|---|---|
| `assets/favicon.svg?v=2.1.2` | Logo mặt trời dùng chung cho tab trình duyệt (`favicon`), thanh đầu trang (`img.brand-logo`, `34×34`) và chân trang (`img.footer-logo`, `30×30`). |
| `assets/plan-weather.svg?v=2.1.2` | Minh họa lịch và mặt trời ở phần Thời tiết cho hoạt động ngoài trời (`img.feature-illustration`, `40×40`, `loading="lazy"`). |
| `index.html` (`<svg class="icon-definitions">`) & `assets/weather.svg` | Bộ 12 biểu tượng thời tiết (`clear`, `moon`, `partly-cloudy`, `night-cloud`, `cloudy`, `rain`, `night-rain`, `showers`, `storm`, `snow`, `fog`, `unknown`) được nhúng trực tiếp vào `dist/index.html` cùng bộ biểu tượng giao diện `#i-*`, gọi bằng `<use href="#id">` cục bộ (không phụ thuộc tải tệp ngoài hoặc cache cũ). Các `linearGradient` và `filter` dùng tiền tố riêng (`#w-cloud-fill`, `#w-sun-fill`, `#w-moon-fill`, `#w-shadow`) để không trùng ID. |

Logo đại diện website luôn giữ nguyên. Biểu tượng dự báo đại diện tình trạng thời tiết thay đổi theo dữ liệu API ở `#weather-icon`, `#daily-icon`, danh sách dự báo theo giờ (`.hour-tile`), dự báo 7 ngày (`.forecast-icon`) và trạng thái trống (`#empty-view`). Những hình minh họa chức năng là trang trí, không phải dự báo thời tiết.

Tất cả là SVG cục bộ, không tải ảnh từ dịch vụ ngoài. Mọi thẻ `<img>` và `<svg>` đều khai báo rõ `width` và `height` khớp tỷ lệ hiển thị để tránh nhảy bố cục (CLS); các ảnh trang trí có `alt=""` để tránh đọc lặp tiêu đề; liên kết thương hiệu có `aria-label="Thời tiết, trang chính"`. Tất cả tài nguyên tĩnh (`favicon.svg`, `plan-weather.svg`, CSS, JS) dùng chung chuỗi phiên bản `?v=3.0.0`.

## Bố cục máy tính, điện thoại và bản đồ vị trí tổng quát

- **Trên máy tính (`> 760px`)**: Thanh địa điểm ngang dính trên cùng (tìm kiếm, Gần tôi, Bản đồ, địa điểm phổ biến, Đã lưu); nội dung một cột rộng tối đa 1080 px: khối hiện tại căn giữa trên nền trời, thẻ dự báo, lưới 4 ô chỉ số, điều kiện thời tiết và hoạt động ngoài trời.
- **Trên điện thoại (`<= 760px`)**: Bố cục một cột gọn gàng, thanh đầu trang chứa ngăn thu gọn **Chọn địa điểm** (`<details id="location-drawer">`, mở/đóng bằng chuột hoặc phím `Escape`).
- **Bản đồ khu vực (`#place-map`)**: Khi bấm **Bản đồ khu vực**, ứng dụng hiển thị bản đồ tổng quát quanh vị trí đang ở (mức thu phóng vùng `zoom=11`, làm tròn tọa độ 2 chữ số thập phân `~1–2 km`, lược bỏ chi tiết nhà cửa và cây cối) kèm **dấu chấm định vị** ở tâm bản đồ.

## Kiểm tra

Đã kiểm tra tự động bằng Playwright trên Chromium ở các độ rộng `320, 360, 390, 430, 768, 1024, 1440 px`:
- Không có lỗi console hay lỗi mạng.
- Mọi `<img>` có `naturalWidth > 0`, khai báo `width`/`height`, không bị cắt (`clipped: false`).
- Mọi `<svg>` có `width`/`height`; mọi `<use>` trỏ tới `<symbol>` cục bộ tồn tại trong DOM và có kích thước vẽ khác 0 khi hiển thị.
- Không tràn ngang (`scrollWidth <= innerWidth`) ở mọi độ rộng từ 320 px đến 1440 px.
- Chưa kiểm chứng trên điện thoại vật lý và Safari iOS.
