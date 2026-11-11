# Mây 1.3.0 — So sánh và cá nhân hóa

Cập nhật 22/10/2026 theo lựa chọn 2 và 3 của người dùng. Giữ các chức năng bắt buộc trong đề cương: tìm địa điểm, thời tiết hiện tại, dự báo 7 ngày, REST API/JSON và giao diện đáp ứng.

## Ba chức năng bổ sung

| Chức năng | Cách sử dụng | Giá trị khi demo |
|---|---|---|
| So sánh hai địa điểm | Bên A là nơi đang xem; tìm nơi bên B hoặc bấm chọn nhanh | Đối chiếu nhiệt độ, cảm nhận, độ ẩm, gió và xác suất mưa cao nhất trong ngày; tự viết nhận xét về chênh lệch |
| Yêu thích | Bấm ☆ Lưu yêu thích; mở lại bằng danh sách ở thanh bên; nút × để bỏ | Theo dõi tối đa 6 nơi thường đến, không cần đăng nhập |
| Lịch sử | Tự ghi tối đa 8 nơi đã tải thành công, mới nhất trước; bấm để xem lại; có Xóa lịch sử | Giảm thao tác nhập lại, không lưu trùng và không ghi lần tải thất bại |

Tìm bên B hoạt động độc lập với tìm địa điểm chính. Đổi bên A sẽ cập nhật cột A; nút Cập nhật cả hai tải lại hai nơi. Nếu một yêu cầu thất bại, dữ liệu cũ của nơi đó được giữ cùng thông báo lỗi và thời điểm dữ liệu. Thử lại bên B nhắm đúng nơi vừa gặp lỗi. Chọn trùng địa điểm có thông báo, không đưa ra kết luận hai nơi khác nhau.

## Kịch bản demo khoảng 3 phút

1. Bấm `CHAY_UNG_DUNG.cmd`, mở http://localhost:5500. Chờ thời tiết Vĩnh Long tải xong.
2. Bấm Lưu yêu thích. Chuyển qua Hà Nội rồi bấm Vĩnh Long trong danh sách yêu thích để chứng minh xem lại nhanh.
3. Cuộn tới So sánh thời tiết. Chọn Hà Nội cho bên B, đọc chênh lệch nhiệt độ/gió/xác suất mưa. Số liệu phụ thuộc API tại lúc demo, không học thuộc con số trong ảnh.
4. Tìm Tokyo ở ô bên B, chọn đúng Nhật Bản. Chỉ vào múi giờ của hai cột và ngày của xác suất mưa.
5. Bấm Cập nhật cả hai. Lưu ý cập nhật không bắt buộc làm số liệu thay đổi nếu nhà cung cấp vẫn trả cùng đợt dữ liệu.
6. Tải lại trang: yêu thích và lịch sử còn; thời tiết được tải lại từ API. Bấm Xóa lịch sử và chứng minh danh sách yêu thích vẫn giữ.

## Điểm nhấn để trình bày với giảng viên

Ứng dụng mở rộng từ tra cứu một nơi sang đối chiếu hai nơi và lưu các địa điểm thường dùng. Phần nhận xét chênh lệch được tính từ dữ liệu thật và trình bày bằng tiếng Việt, giúp người dùng đọc nhanh trước khi đi học, đi làm hoặc đi du lịch. Tên, vùng và quốc gia đều được thể hiện để tránh nhầm địa điểm trùng tên.

Không nên khẳng định các tính năng này chưa có trên thị trường. Các dịch vụ lớn đã có nhiều dạng dự báo và tính năng cá nhân hóa. Điểm nhấn của đồ án là cách kết hợp trong giao diện gọn, giải thích chênh lệch rõ ràng và xử lý các trường hợp thiếu dữ liệu, khác ngày, lỗi mạng một cách nhất quán.

## Quy tắc dữ liệu và phép tính

- Màn hình chính và so sánh dùng cùng Forecast API, truy vấn, đơn vị và bộ kiểm tra JSON. Đơn vị: °C, %, km/h, mm; `timezone=auto`.
- Nhận xét nhiệt độ và gió lấy hiệu hai giá trị ở độ chính xác một chữ số thập phân. Không dùng nhiệt độ cảm nhận để thay thế nhiệt độ thực trong phép so sánh nhiệt độ.
- Mưa là `daily.precipitation_probability_max`: xác suất giáng thủy cao nhất trong ngày tại từng nơi. Chênh lệch dùng **điểm phần trăm**: 80% và 20% chênh 60 điểm phần trăm, không gọi là lượng mưa hơn 60%.
- Không suy diễn giá trị null thành 0%. Khác ngày địa phương thì không viết nhận xét chênh lệch xác suất mưa; vẫn ghi rõ ngày cạnh giá trị từng cột.
- Mỗi cột có thời điểm dữ liệu và múi giờ. Các số là dự báo của nhà cung cấp, không phải số đo trực tiếp tại vị trí người dùng, không bảo đảm chính xác tuyệt đối ngoài thực tế.
- LocalStorage chỉ chứa phiên bản cấu trúc và danh sách tên/vùng/quốc gia/tọa độ. Không lưu phản hồi thời tiết. Danh sách thuộc cùng nguồn trang và hồ sơ trình duyệt; không đồng bộ tài khoản hoặc thiết bị. Nếu lưu bị chặn, danh sách còn trong bộ nhớ của lần mở trang và giao diện thông báo rõ.
- Tên/vùng đọc từ API và từ bộ nhớ đều đưa vào DOM bằng `textContent`; tọa độ được kiểm tra trước khi sử dụng. Giới hạn 6 yêu thích, 8 lịch sử; tọa độ làm tròn 4 chữ số thập phân để nhận diện mục trùng.

## Cấu trúc mã bổ sung

- `dist/js/app.js`: tách hàm tạo truy vấn `forecastURL`, gọi cập nhật tính năng bổ sung sau khi tải thành công.
- `dist/js/features.js`: lưu/đọc danh sách, tìm bên B, gọi API, dựng thẻ và tính chênh lệch; từng luồng có hủy yêu cầu cũ riêng.
- `dist/css/features.css`: phần giao diện bổ sung theo màu sắc Mây, hai cột desktop và xếp dọc trên điện thoại.
- `tests/browser.cjs`: 35 nhóm kiểm tra; kết quả hiện tại ở `docs/evidence-features/`.

Không cần khóa API, máy chủ nghiệp vụ, cơ sở dữ liệu hoặc dịch vụ trả phí bổ sung cho bản demo này. Vẫn cần Internet để lấy thời tiết. Dùng đúng mục đích giáo dục phi thương mại và điều khoản của nhà cung cấp.

## Tài liệu tham khảo

- [Open-Meteo Forecast API](https://open-meteo.com/en/docs): biến dữ liệu, đơn vị và múi giờ.
- [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api): tìm tên địa điểm.
- [AccuWeather — tổng quan tính năng](https://developer.accuweather.com/documentation/overview): tham khảo bối cảnh thị trường, không phải API sử dụng trong mã nguồn Mây.
