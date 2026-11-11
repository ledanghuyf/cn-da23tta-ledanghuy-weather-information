# Xem thời tiết theo ngày — Mây 1.5.0

Hoàn thành và kiểm thử ngày 23/10/2026.

## Cách chạy và demo

1. Mở `CHAY_UNG_DUNG.cmd` hoặc chạy `npm start`, rồi mở http://localhost:5500. Nếu trang đã mở, nhấn Ctrl+F5.
2. Tại đầu trang, bấm **Xem thời tiết ngày**. Danh sách có **Hiện tại** và 7 ngày dự báo, tính theo múi giờ địa điểm đang xem.
3. Chọn một ngày: tiêu đề và tổng quan đổi thành **Dự báo theo ngày**, hiển thị nhiệt độ cao nhất/thấp nhất, tình trạng thời tiết, xác suất mưa cao nhất, gió mạnh nhất, tổng giáng thủy và UV cao nhất.
4. Cuộn xuống gợi ý hoạt động: ngày đã chọn ở đầu trang được áp dụng cho gợi ý. Có thể chọn hoạt động hoặc xem riêng một ngày khác tại ô Xem ngày của phần gợi ý.
5. Đổi địa điểm: ngày tổng quan vẫn được giữ nếu còn thuộc 7 ngày của phản hồi mới. Ngày hết hạn tự trở về Hiện tại.
6. Chọn **Hiện tại** để trở về nhiệt độ, độ ẩm, gió, cảm nhận và giáng thủy tại mốc hiện tại. Phần so sánh hai địa điểm luôn ghi rõ là so sánh hiện tại, độc lập với ngày dự báo.

Giới hạn là 7 ngày được nhà cung cấp trả về, không phải lịch thời tiết vô hạn hoặc dữ liệu quá khứ. Không cần gọi thêm API khi đổi ngày trong cùng dữ liệu đã tải.

## Dữ liệu và giao diện

- Dùng `daily.temperature_2m_max/min`, `weather_code`, `precipitation_probability_max` có sẵn; bổ sung `wind_speed_10m_max`, `precipitation_sum`, `uv_index_max` trong cùng yêu cầu API.
- Kiểm tra đơn vị, độ dài mảng, giá trị số và miền hợp lệ cho các chỉ số bổ sung. Thiếu/sai dữ liệu sẽ hiện **Chưa có dữ liệu**, không lấy số hiện tại thay vào.
- Tổng quan ngày không có một nhiệt độ duy nhất: hiển thị rõ cao/thấp trong ngày. Mã thời tiết ngày của Open-Meteo là tình trạng nghiêm trọng nhất của ngày, nên nhãn giải thích đây là tổng quan, không mô tả mọi giờ đều giống nhau.
- Nền và biểu tượng của trang dự báo là biểu trưng cho cả ngày; không gắn nhãn Ban ngày/Ban đêm như dữ liệu hiện tại. Quay lại Hiện tại phục hồi chủ đề theo `current.is_day` và mã thời tiết hiện tại.
- Ô chọn ngày có nhãn, điều khiển bằng bàn phím và hiển thị cả trên điện thoại. Khi đang tải hoặc tải lỗi, không cho đổi ngày trên dữ liệu chưa xác nhận.
- Gợi ý hiện tại tạm ẩn khi đang xem tổng quan một ngày, tránh lẫn thông tin hiện tại với tương lai. Gợi ý hoạt động vẫn ghi ngày và số liệu theo giờ cụ thể.

## Tệp thay đổi

`dist/js/daily-view.js` và `dist/css/daily-view.css` là hai tệp mới, tách logic/chủ đề tổng quan ngày. `dist/index.html` thêm ô chọn ngày, thẻ tổng quan ngày và nhóm gợi ý hiện tại; `dist/js/app.js` bổ sung các biến daily, kết nối vòng đời tải dữ liệu và khóa/mở bộ chọn. Các bộ kiểm tra trong `tests/experience-checks.cjs` và `tests/browser.cjs` bổ sung nhóm 44 và 45. `package.json` cập nhật phiên bản; tài liệu và minh chứng lưu trong `docs/`.

## Kiểm thử

`npm test`: 16/16 kiểm thử logic và 45/45 nhóm trình duyệt đạt trong lần xác nhận 23/10/2026, gồm 6 nhóm API thật. Nhóm 44 kiểm tra số liệu đúng chỉ số ngày, chọn cả 7 ngày, giữ ngày khi đổi địa điểm, thiếu/sai đơn vị, trở về Hiện tại và các độ rộng 320, 390, 706, 1024, 1440 px. Nhóm 45 đối chiếu nhiệt độ/gió/UV ngày được chọn với JSON từ Open-Meteo.

Minh chứng: `evidence-experience/test-results.json`, `api-responses.json`, `ngay-header-*.png`, `du-bao-ngay-*.png`. Các ảnh tên `api-that` lấy từ kết nối thật; các ảnh còn lại của tình huống kiểm thử mô phỏng. Chưa thử điện thoại vật lý/Safari/Firefox. Kết quả chứng minh phần mềm hiển thị đúng API, không chứng minh dự báo chính xác tuyệt đối ngoài thực tế.

Nguồn: [Open-Meteo — Daily Parameter Definition](https://open-meteo.com/en/docs#daily-parameter-definition).
