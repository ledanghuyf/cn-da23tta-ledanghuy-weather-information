# Đối chiếu đề cương chi tiết ngày 03/11/2026

Căn cứ: LeDangHuy-110123013-DECUONGCHITIETCN (1).pdf gồm 5 trang, ảnh mô tả và yêu cầu bổ sung của sinh viên. Bảng này xác nhận nội dung đã triển khai và minh chứng; không thay cho nhận xét hoặc nghiệm thu của giảng viên.

| Nội dung trong đề cương | Kết quả và minh chứng |
| --- | --- |
| Mục 5: REST API và JSON | app.js gọi Geocoding/Forecast bằng GET, kiểm tra HTTP và JSON; báo cáo chương 2, 4, 5 |
| Tìm và thay đổi địa điểm | Tìm tên, chọn tỉnh/quốc gia, cập nhật đồng bộ; tests/browser.cjs |
| Nhiệt độ, tình trạng, độ ẩm, tốc độ gió | renderWeather, validateWeather; đối chiếu JSON API thật trong evidence-experience và evidence-mobile |
| Dự báo thời tiết | Bảy ngày, chọn ngày, từng giờ và biểu đồ; daily-view.js, dashboard.js |
| HTML5, CSS3, JavaScript, Bootstrap và responsive | dist/index.html, dist/css, dist/js; kiểm tra các độ rộng 320–1440 px |
| Xử lý nhập sai, kết nối và dữ liệu lỗi | Kiểm thử tên rỗng, HTTP 429/500, JSON hỏng, timeout, mất mạng, sai đơn vị, null, yêu cầu trả về trễ |
| Kiểm thử, hoàn thiện ứng dụng và quyển báo cáo | 28 kiểm tra logic, 70 nhóm trình duyệt, 2 kiểm tra khởi động; báo cáo Word/Markdown cập nhật 03/11 |
| Mục 6 nội dung 1: phân tích nhu cầu/yêu cầu | Báo cáo chương 1–3; khảo sát tài liệu và dịch vụ công khai, không bịa khảo sát người dùng |
| Nội dung 2: API, HTTP, tham số, trạng thái | Báo cáo chương 2, 4–6; mã fetchJSON và URL truy vấn |
| Nội dung 3: cấu trúc JSON current/daily | Báo cáo chương 5; tệp phản hồi API thật trong docs/evidence-live và evidence-mobile |
| Nội dung 4: giao diện SPA và responsive | Báo cáo chương 7–8; CSS và ảnh API thật |
| Nội dung 5–6: JavaScript, xử lý lỗi, tra cứu và hiển thị | app.js và các module; bộ kiểm thử logic/trình duyệt |
| Nội dung 7: kiểm thử và sửa lỗi | Báo cáo chương 9–10; lỗi cổng, định vị và tràn biểu tượng đã có kịch bản kiểm tra |
| Mục 7: giới hạn phạm vi | Không tự dự báo, không tạo dữ liệu thời tiết, không xây backend nghiệp vụ/database/tài khoản |
| Mục 8: nghiên cứu, khảo sát, thực nghiệm | Tài liệu API chính thức, đối chiếu dịch vụ; thực nghiệm nhiều địa điểm và kích thước; báo cáo và minh chứng |
| Mục 9: kế hoạch tiến độ | Giữ kế hoạch trong đề cương; không tự ghi các tuần tương lai là đã hoàn thành, không điền chữ ký/nhận xét |
| Mục 10: sản phẩm | Mã nguồn, hướng dẫn chạy, ứng dụng HTTPS, báo cáo Word và minh chứng |

## Các yêu cầu bổ sung đã có

- Gợi ý hiện tại và giờ hoạt động, cấu hình ngưỡng riêng, lý do và số liệu, tối đa 3 khung, xem từng giờ khác; loại điều kiện không phù hợp.
- Nền, màu nhấn và biểu tượng theo WMO/is_day; ngày/đêm của địa điểm; giảm chuyển động khi người dùng yêu cầu.
- Chất lượng không khí API thật, ghi đúng US AQI; yêu thích, lịch sử, so sánh, định vị, bản đồ vị trí thiết bị, sao chép liên kết và tự cập nhật tùy chọn.
- Bỏ nút tải JSON/mở phản hồi API; logo thống nhất; sửa biểu tượng và thanh nhiệt vượt thẻ.
- Máy chủ cục bộ tự chọn cổng trống, có file chạy nhanh. Bản HTTPS công khai không yêu cầu đăng nhập ChatGPT, dùng được qua mạng khác mà không phụ thuộc máy tính chạy VS Code.

## Mức kiểm chứng và phần cần xác nhận thực tế

- Không có dữ liệu thời tiết giả trong thư mục dist; dữ liệu kiểm soát chỉ dùng trong tests. API lỗi thì báo lỗi hoặc giữ bản trước có nhãn, không tạo số liệu thay thế.
- Đã kiểm tra Chrome giả lập màn hình nhỏ với phản hồi API thật. Chưa nhận xác nhận của người dùng trên điện thoại vật lý/4G và Safari iOS.
- Định vị được kiểm tra bằng tình huống mô phỏng quyền, timeout, tọa độ và hủy; độ chính xác thực tế do thiết bị cung cấp.
- Dữ liệu mô hình lấy từ API thật không phải số đo tại từng địa chỉ và không đảm bảo dự báo đúng 100%.
- Radar mưa, cảnh báo thiên tai chính thức và hệ thống tài khoản không thuộc phạm vi bắt buộc của đề cương, chưa triển khai.
- Sinh viên cần tự trình bày được mã nguồn, bổ sung nhận xét/thể thức theo mẫu khoa và thử trên thiết bị dùng để bảo vệ.
