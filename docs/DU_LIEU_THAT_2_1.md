# Thời tiết 2.1.0 — dữ liệu có nguồn, 03/11/2026

## “Dữ liệu thật” nghĩa là gì?

Trang sử dụng JSON nhận trực tiếp từ Open-Meteo khi tra cứu; không sinh ngẫu nhiên nhiệt độ, không dùng bản mẫu khi mất mạng. Địa điểm mặc định Vĩnh Long và danh sách địa điểm nhanh là cấu hình tọa độ, không phải dữ liệu thời tiết giả. Hình mặt trời/mây/mưa là minh họa ánh xạ từ mã API.

Điều kiện hiện tại của Open-Meteo là **ước tính từ mô hình**, không phải số đo trực tiếp ở nhà người xem. Các giờ và ngày tiếp theo là dự báo. API thật không đồng nghĩa dự báo chính xác 100%. Chất lượng không khí cũng là dữ liệu mô hình CAMS qua Open-Meteo; thang hiển thị là **US AQI**, không phải VN AQI.

Không có dữ liệu mô phỏng trong `dist/`. Các bộ dữ liệu giả lập ở `tests/` chỉ dùng để kiểm tra lỗi mạng, giông, nhiệt độ và các trường hợp thiếu dữ liệu; máy chủ chỉ phục vụ `dist/`, website không tải các tệp kiểm thử.

## Chức năng hiện có

- Tìm địa điểm, chọn đúng tỉnh/quốc gia; định vị có xin quyền; địa điểm nhanh, yêu thích và lịch sử.
- Hiện tại: nhiệt độ, cảm nhận, độ ẩm, gió, giáng thủy, ngày/đêm.
- Dự báo 7 ngày, chọn ngày, biểu đồ ngày; dự báo theo giờ với biểu đồ nhiệt độ/mưa/gió và chi tiết từng giờ.
- Mặt trời mọc/lặn, độ dài ban ngày, UV, mây, tầm nhìn, áp suất, hướng gió/gió giật khi API cung cấp.
- Gợi ý hoạt động theo dữ liệu và tiêu chí công khai; so sánh thời tiết hiện tại hai nơi.
- Logo đồng bộ, giao diện theo thời tiết, hỗ trợ màn hình nhỏ và giảm chuyển động.

## Bổ sung trong 2.1

1. **Chất lượng không khí:** US AQI, PM2.5, PM10, NO₂, ozone; thời điểm, địa điểm, nguồn CAMS/Open-Meteo. Thiếu chỉ số không suy thành 0 hoặc “Tốt”. Lỗi có nút thử lại riêng. Không khí luôn ghi rõ là mốc hiện tại, độc lập với ngày dự báo được chọn.
2. **Nguồn và độ mới:** tọa độ tìm kiếm, tọa độ ô lưới API, mốc dữ liệu, giờ tải về; cảnh báo mốc cũ hơn 90 phút hoặc giờ thiết bị bất thường. Ngưỡng 90 phút là tiêu chí giao diện, không phải cam kết của nhà cung cấp. Cập nhật thất bại ghi rõ dữ liệu giữ lại.
3. **Tự cập nhật:** bật bằng checkbox, mỗi 15 phút khi trang đang được xem và có kết nối. Không tự gọi liên tục khi tab ẩn hoặc ngoại tuyến. Tần suất này là tần suất lấy lại dữ liệu, không bảo đảm mô hình nguồn có bản mới sau mỗi 15 phút.
4. **Chia sẻ địa điểm:** tạo liên kết tọa độ/tên, kiểm tra đầu vào khi mở lại. Liên kết localhost chỉ dùng trên máy chạy máy chủ; chia sẻ liên thiết bị cần website được đưa lên HTTPS công khai. Chỉ sao chép liên kết khi người dùng bấm, không tự gửi cho ai.
5. **Xem trên bản đồ:** mở OpenStreetMap với tọa độ địa điểm đã chọn; đây là bản đồ vị trí, không phải radar mưa.
6. **Tải JSON:** phản hồi gốc, URL yêu cầu, địa điểm và giờ nhận của thời tiết/không khí để đối chiếu số liệu. Nút mở API gọi dữ liệu tại thời điểm mở nên có thể mới hơn JSON đã hiển thị.
7. **Mã thời tiết chưa biết:** dùng biểu tượng dấu hỏi trung tính; không tự vẽ mây và khiến người dùng hiểu nhầm.

## Nguồn và API

- Tra cứu: `https://geocoding-api.open-meteo.com/v1/search` (GeoNames).
- Thời tiết: `https://api.open-meteo.com/v1/forecast`.
- Không khí: `https://air-quality-api.open-meteo.com/v1/air-quality`.
- [Tài liệu thời tiết](https://open-meteo.com/en/docs): điều kiện hiện tại, đơn vị và mã thời tiết.
- [Tài liệu không khí](https://open-meteo.com/en/docs/air-quality-api): dữ liệu CAMS, thang US AQI và đơn vị.

Không có khóa API bí mật trong mã trình duyệt. Gợi ý hoạt động là tính toán từ dữ liệu API, không phải cảnh báo do cơ quan khí tượng phát hành.

## Cách chạy và demo

Mở thư mục ThoiTiet_LeDangHuy vừa giải nén từ ZIP hoàn thiện trong VS Code, chạy `node scripts/serve.cjs`, truy cập `http://localhost:5500/`. Nếu máy chủ đã chạy thì Ctrl+F5. Có thể dùng `CHAY_UNG_DUNG.cmd`. Cần Internet; giao diện không thay dữ liệu lỗi bằng bản mẫu.

Demo: tìm một địa điểm → mở “Nguồn và thời điểm…” → tải JSON và đối chiếu nhiệt độ → xem giờ/ngày khác → mở “Không khí” → đổi sang Hà Nội để thấy cả thời tiết và AQI cập nhật → thử chia sẻ và mở liên kết → bật tự cập nhật nếu cần. Tắt mạng để kiểm tra thông báo giữ dữ liệu cũ, sau đó bật mạng và cập nhật lại.

## Kiểm chứng

Ngày 03/11/2026: **28/28 kiểm thử logic**, **55/55 nhóm trình duyệt cũ**, **13/13 nhóm trình duyệt mới** đạt; tổng 68 nhóm trình duyệt, gồm 9 nhóm gọi API thật. Hai nhóm API thật mới đối chiếu Vĩnh Long và Hà Nội. Đã kiểm tra lỗi HTTP, thiếu dữ liệu/đơn vị, đổi địa điểm liên tiếp, xuất JSON, liên kết có đầu vào không hợp lệ, tự cập nhật/ngoại tuyến, mã thời tiết lạ và bố cục 320–1440 px.

Chạy lại: `npm install`, rồi `npm test` (cần Node, Chrome và Internet). `npm run test:logic` không cần mạng; `npm run test:live` kiểm tra riêng phần mới. Minh chứng: `docs/evidence-live/results.json`, `api-real.json`, ảnh `*-api-that*.png`. Ảnh `*-mophong-*.png` chỉ là kiểm thử, không phải thời tiết thực tế.

## Tệp sửa

`dist/index.html`, `dist/js/app.js`, `dist/assets/weather.svg`, `package.json`, `CHAY_UNG_DUNG.cmd`, `tests/browser.cjs`, `README.md`, `docs/KIEM_THU.md`. Thêm `dist/js/live-data.js`, `dist/css/live-data.css`, `tests/live-data.test.cjs`, `tests/live-browser.cjs`, tài liệu và minh chứng mới.

## Giới hạn còn thực tế

Chưa tích hợp radar mưa, cảnh báo thiên tai chính thức, tài khoản hay thông báo nền. Những chức năng này cần nguồn dữ liệu/cơ chế riêng; không đưa màn hình giả hoặc thông báo bịa để làm như đã có. Định vị phụ thuộc quyền và dịch vụ của thiết bị. Chưa kiểm tra điện thoại vật lý, Safari hoặc Firefox, và chưa đo độ chính xác khí tượng ngoài thực địa. Báo cáo Word đã được cập nhật ngày 03/11/2026. Dùng README, báo cáo và bảng DOI_CHIEU_DE_CUONG_03_11.md của bản bàn giao để xem phạm vi hiện tại.
