# Mây 1.6.0 — Lên lịch cùng thời tiết

Ngày cập nhật: 23/10/2026. Sửa trực tiếp dự án HTML/CSS/JavaScript hiện có, giữ API Open-Meteo, chức năng chọn ngày, so sánh, biểu đồ, yêu thích và lịch sử. Không thêm khóa API hoặc dữ liệu mô phỏng vào website.

## Vì sao trước đây thường không có giờ?

Thuật toán cũ yêu cầu mọi yếu tố đồng thời ở mức ưu tiên: chỉ quang/mây, cảm nhận tối đa 28°C với chạy bộ hoặc 30°C với đi bộ/đạp xe, khả năng mưa tối đa 30%. Vì vậy một ngày nóng hoặc có mưa nhẹ cũng có thể bị loại toàn bộ. Bản mới tách mức thuận lợi khỏi giới hạn loại trừ, không đổi số liệu API để tạo gợi ý.

## Ba mức đánh giá

| Mức | Quy tắc |
|---|---|
| Thuận lợi | Trời quang/mây; cảm nhận 12–30°C cho đi bộ/đạp xe, 12–28°C cho chạy bộ; xác suất mưa ≤30%; gió <25 km/h cho đi bộ, <20 cho chạy/đạp xe; UV <6 khi có |
| Cần cân nhắc | Vượt một mức ưu tiên hoặc mưa nhẹ/vừa, nhưng không chạm giới hạn loại trừ. Luôn có số liệu và lưu ý; không gọi là thuận lợi |
| Không khuyến nghị | Giông; mưa lớn/mưa phùn dày/mưa đóng băng; sương mù/tuyết/mã chưa xác định; cảm nhận <5°C hoặc ≥38°C; gió ≥30 km/h; UV ≥8 tại một trong hai đầu giờ |

Các ngưỡng là tiêu chí tham khảo do ứng dụng đặt, không phải chuẩn y tế/khí tượng. Người dùng không cần cấu hình để sử dụng. Phần giải thích được thu gọn trong **Cách chọn giờ và đưa ra gợi ý**.

Mã được cân nhắc: 51, 53, 61, 63, 80, 81; quang/mây: 0–3. Mã giông: 95, 96, 97, 99. Cấu hình ở `dist/js/weather-config.js`. Thiếu số liệu bắt buộc hoặc đơn vị sai thì bỏ khung, không chuyển null thành 0. Thiếu UV vẫn hiện căn cứ còn lại và ghi rõ chưa đánh giá đủ UV; UV cao ở một đầu không bị bỏ qua khi đầu kia thiếu.

## Cách chọn và xếp hạng

1. Mặc định 24 giờ tới; hoặc chọn một trong 7 ngày dự báo. Bỏ giờ đã qua theo `current.time` API tại địa điểm đang xem.
2. Ghép hai mốc liên tiếp cách nhau một giờ, đủ dữ liệu hợp lệ và `is_day=1` ở cả hai đầu. Không lấy múi giờ máy người dùng để suy ngày/đêm.
3. Phân loại mỗi khung; giữ mọi khung đủ dữ liệu trong danh sách xem giờ, nhưng không đưa giờ không khuyến nghị vào ba thẻ gợi ý.
4. Ưu tiên nhóm thuận lợi, sau đó mới tới cần cân nhắc. Trong mỗi nhóm, điểm càng thấp càng tốt: xác suất mưa tối đa + 2 × độ lệch cảm nhận lớn nhất khỏi mức mong muốn + gió tối đa + UV tối đa. Mức mong muốn: 23°C với đi bộ/đạp xe, 20°C với chạy bộ. UV thiếu dùng điểm 6, đồng điểm chọn sớm hơn.
5. Lấy tối đa 3 khung, hiển thị theo thời gian. Khi toàn bộ gợi ý cần cân nhắc, thông báo rõ chưa có giờ thuận lợi. Nếu mọi khung đều bị loại, đề nghị hoạt động trong nhà, vẫn cho xem dữ liệu/lý do từng giờ. Không đủ dữ liệu thì báo riêng.

Các giá trị min/max trên thẻ lấy từ hai đầu giờ, không bảo đảm diễn biến ở giữa hai mốc. Khả năng mưa không phải lượng mưa. Giờ dự báo xa có thể thay đổi khi API cập nhật.

## Cách chạy và demo

1. Bấm đúp `CHAY_UNG_DUNG.cmd` hoặc chạy `npm start` trong thư mục dự án; mở http://localhost:5500. Cần Internet lấy API thật.
2. Tại **Lên lịch cùng thời tiết**, chọn ngày và Đi bộ/Chạy bộ/Đạp xe.
3. Bấm **Xem khung giờ** trên một thẻ: xem số liệu, mức đánh giá, lưu ý. Hoặc dùng **Bạn muốn xem giờ khác?** để mở bất kỳ khung ban ngày đủ dữ liệu, kể cả giờ không khuyến nghị.
4. Đổi ngày/hoạt động/địa điểm: lựa chọn giờ cũ được xóa để không nhầm dữ liệu. Chức năng này xem chi tiết và hỗ trợ lên kế hoạch, chưa lưu lịch cá nhân hoặc gửi nhắc nhở.
5. Mục **So sánh thời tiết hai nơi** có nhãn **Tìm địa điểm**, dùng thời tiết hiện tại độc lập với ngày chọn trong phần dự báo.
6. Muốn trình bày tình huống nóng/mưa/giông có kiểm soát, dùng ảnh trong `docs/evidence-experience/` và nói rõ đó là mô phỏng kiểm thử. Website thật không có chế độ giả dữ liệu.

## Tệp đã sửa

- `dist/index.html`: tiêu đề, biểu tượng, nhãn tìm địa điểm, bộ chọn giờ và vùng chi tiết.
- `dist/css/weather-experience.css`: trình bày hai khu vực, ba mức đánh giá, màn hình nhỏ.
- `dist/js/weather-config.js`: cấu hình mức ưu tiên và giới hạn loại trừ.
- `dist/js/recommendations.js`: phân loại/xếp hạng, lý do, chọn giờ, xóa lựa chọn cũ.
- `tests/recommendations.test.cjs`, `tests/experience-checks.cjs`: bổ sung kiểm tra logic và tương tác.
- `package.json`, `README.md`, tài liệu hướng dẫn/kiểm thử: phiên bản 1.6.0.

## Kiểm thử

`npm run test:logic`: 19/19 đạt. `npm run test:browser`: 46/46 nhóm đạt, gồm 6 nhóm API thật. Hoặc `npm test` để chạy cả hai; cần Node, Chrome và `npm install` trước lần chạy kiểm thử đầu. Xác nhận viewport 320–1440 px; chưa thử điện thoại vật lý, Safari/Firefox. Nhật ký chi tiết và ảnh ở `docs/evidence-experience/`. Báo cáo Word cũ chưa cập nhật nội dung 1.6.0.
