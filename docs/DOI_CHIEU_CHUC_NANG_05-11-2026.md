# Đối chiếu website với đề cương — 05/11/2026

Đối chiếu nội dung mục 5, 6, 7.2 và 10 trong đề cương chi tiết. Phạm vi lần rà soát này là website và mã nguồn; báo cáo Word đã có từ lần bàn giao trước, chưa cập nhật ảnh và mô tả theo giao diện ngày 05/11.

| Yêu cầu của đề cương | Kết quả trên website |
| --- | --- |
| Web đơn trang HTML5, CSS3, JavaScript, Bootstrap | Có; tài nguyên cục bộ trong `dist`, không cần cài ứng dụng riêng |
| Tìm kiếm và thay đổi địa điểm | Có tìm theo tên, danh sách kết quả kèm vùng/quốc gia, chọn nhanh, yêu thích và lịch sử |
| Nhiệt độ, tình trạng, độ ẩm, tốc độ gió hiện tại | Có; thêm cảm nhận, giáng thủy và mốc dữ liệu |
| Dự báo theo dữ liệu API hỗ trợ | Theo giờ và 7 ngày; chọn ngày, ngày trước/sau, trở về hiện tại, thẻ và biểu đồ |
| Gọi REST API, xử lý JSON | Open-Meteo Weather, Geocoding và Air Quality; kiểm tra cấu trúc/đơn vị, không thay null bằng số 0 |
| Nhập sai, không tìm thấy, mất kết nối và lỗi dịch vụ | Có trạng thái rõ ràng, thử lại, hủy phản hồi cũ khi đổi nơi nhanh |
| Giao diện máy tính và điện thoại | Kiểm tra 320–1440 px; tìm kiếm thu gọn trên điện thoại, thao tác bằng bàn phím |
| Kiểm thử và sửa lỗi | 30 kiểm thử logic/khởi chạy, 55 nhóm trình duyệt, 15 nhóm dữ liệu/bản đồ đạt; kiểm tra riêng bằng API thật cho giao diện điện thoại và các thao tác mới |

## Chức năng mở rộng đã có

- Định vị để xem thời tiết; bản đồ dùng tọa độ thiết bị chỉ sau khi người dùng bấm và cho phép.
- UV, tầm nhìn, mây, áp suất, hướng gió, gió giật, mặt trời mọc/lặn.
- Không khí: US AQI, PM2.5, PM10, NO₂, O₃, mốc thời gian và nguồn riêng.
- (Đã bỏ phần So sánh thời tiết hai nơi theo yêu cầu cập nhật; tập trung vào tra cứu địa điểm ở Việt Nam.)
- Hoạt động: người dùng tự chọn ngày, giờ và đi bộ/chạy bộ/đạp xe; chỉ sau khi chọn mới hiện đánh giá. Không có các thẻ gợi ý giờ tự động.
- Giao diện theo mã thời tiết và ngày/đêm của địa điểm.
- Biểu đồ lượng mưa theo giờ từ trường `hourly.precipitation`, đơn vị mm; đây là lượng tích lũy trong giờ trước mốc ghi trên biểu đồ, không phải xác suất mưa.
- Thông báo khi mốc dữ liệu thời tiết đã quá 90 phút hoặc nằm bất thường trong tương lai so với đồng hồ thiết bị. Việc kiểm tra tuổi dữ liệu không tự tải lại API.

## Dữ liệu và giới hạn thực tế

Website lấy dữ liệu từ API thật. Dữ liệu kiểm soát chỉ nằm trong thư mục `tests`, không được phát cùng `dist`. Không dùng khóa API bí mật trong trình duyệt. API thời tiết là dữ liệu mô hình/dự báo; không thể cam kết khớp thực địa 100%.

Đề cương không yêu cầu tài khoản, cơ sở dữ liệu, máy chủ riêng hoặc tự dự báo khí tượng. Website chưa tích hợp radar mưa, đường đi bão, cảnh báo chính thức, thông báo đẩy, dự báo biển hoặc lịch sử dài hạn. Đây là các chức năng riêng của từng sản phẩm, cần nguồn dữ liệu/dịch vụ bổ sung; không phải điều kiện bắt buộc để đạt phạm vi website của đề tài.

Kiểm tra màn hình nhỏ dùng Chrome mô phỏng kích thước và thao tác cảm ứng trên máy tính. Chưa xác nhận bằng điện thoại vật lý, Safari hoặc Firefox. Định vị còn phụ thuộc quyền trình duyệt và dịch vụ vị trí của thiết bị.

Tài liệu API đã đối chiếu: https://open-meteo.com/en/docs

## Demo nhanh

1. Điện thoại: bấm **Chọn địa điểm**, tìm và chọn đúng thành phố.
2. Xem thời tiết hiện tại, bấm mũi tên cạnh ngày để chuyển qua ngày mai; **Về hiện tại** để quay lại.
3. **Dự báo → Theo giờ → Lượng mưa**, chọn một giờ để xem số liệu; chuyển **7 ngày** để xem thẻ/biểu đồ.
4. **Chỉ số → Không khí** để xem AQI; đổi địa điểm và kiểm tra tên/mốc mới.
5. **Hoạt động**: chọn ngày, giờ, rồi hoạt động; đổi hoạt động để so sánh đánh giá cùng giờ.
6. Lưu yêu thích, mở lại trong **Đã lưu** trên thanh trên cùng.
7. Trong phần tìm địa điểm, bấm **Mở bản đồ** và cấp quyền vị trí nếu muốn xem tọa độ thiết bị.

Chạy cục bộ: mở thư mục dự án trong VS Code, chạy `node scripts/serve.cjs --open`. Máy chủ tự chọn cổng trống; dùng đúng địa chỉ in trong terminal.
