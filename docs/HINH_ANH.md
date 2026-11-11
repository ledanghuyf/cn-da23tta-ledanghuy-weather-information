# Logo và hình minh họa — 26/10/2026

Tên hiển thị thống nhất: **Thời tiết**.

## Các ảnh đang được website sử dụng

| Tệp trong dist | Vị trí sử dụng |
|---|---|
| `assets/favicon.svg` | Logo mặt trời dùng chung cho tab trình duyệt, thanh bên, đầu trang và chân trang. |
| `assets/plan-weather.svg` | Minh họa lịch và mặt trời ở phần Lên lịch cùng thời tiết. |
| `assets/compare-weather.svg` | Minh họa bản đồ, hai địa điểm và mây ở phần So sánh thời tiết hai nơi. |
| `assets/weather.svg` | Bộ biểu tượng dự báo: nắng, mây, mưa, giông, sương mù, tuyết, ban đêm. Dùng chung ở tổng quan, dự báo giờ/ngày và so sánh; hình mặt trời trong Nhịp mặt trời cũng lấy từ bộ này. |

Logo đại diện website nên luôn giữ nguyên. Biểu tượng dự báo đại diện tình trạng thời tiết nên thay đổi theo dữ liệu API. Những hình minh họa chức năng là trang trí, không phải dự báo thời tiết.

Tất cả là SVG cục bộ, không cần tải ảnh từ dịch vụ khác. Các ảnh trang trí có alt rỗng để tránh đọc lặp tiêu đề; logo liên kết có tên truy cập “Thời tiết, trang chính”. Không thêm chuyển động. Kích thước được khai báo trước để giữ bố cục ổn định.

## Thay đổi và cách chạy

Sửa `dist/index.html`, thêm `dist/css/branding.css`, hai hình minh họa mới và dùng chung logo có sẵn. Không sửa logic gọi API, chức năng tìm địa điểm hay gợi ý.

Bản đang chạy đã được cập nhật tại `D:\ChuyenNganh\ThoiTiet_LeDangHuy`. Mở thư mục này bằng VS Code, chạy `node scripts/serve.cjs`, truy cập `http://localhost:5500/`. Nếu máy chủ đã chạy, chỉ cần Ctrl+F5. Các đường dẫn logo/CSS có mã phiên bản để tránh dùng ảnh cũ trong bộ nhớ đệm.

Muốn đổi logo sau này, sửa **một tệp** `dist/assets/favicon.svg`; tất cả vị trí thương hiệu sẽ cùng lấy hình đó. Bộ dự báo trong `weather.svg` chứa các symbol nên không dùng trực tiếp như một ảnh thông thường; trang gọi từng symbol theo mã thời tiết.

## Kiểm tra

Đã kiểm tra bản localhost đang phục vụ thư mục ổ D ở 1440, 390 và 320 px: các ảnh tải được, logo không vượt thanh bên, trang không tràn ngang, không có lỗi JavaScript. Sáu tình huống mô phỏng nắng, mây, mưa, giông, đêm quang và đêm mưa hiển thị đúng biểu tượng. Các ảnh minh chứng trong `evidence-branding/` dùng dữ liệu mô phỏng, không phải thời tiết thực tế. Chưa thử thiết bị di động vật lý.
