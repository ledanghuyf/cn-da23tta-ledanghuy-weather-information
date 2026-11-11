# Bản demo Mây ngày 19/10/2026

**Sinh viên: Lê Đăng Huy — 110123013**  
Phiên bản giao diện 1.2.0, hoàn thiện ngày 16/10/2026.

## Mở ứng dụng

1. Giải nén toàn bộ ZIP vào một thư mục trên máy, không chạy trực tiếp từ trong ZIP.
2. Bấm đúp `CHAY_UNG_DUNG.cmd` hoặc chạy `node scripts/serve.cjs` tại thư mục gốc. Máy cần Node.js hoặc Python; giao diện không cần cài npm.
3. Mở `http://localhost:5500` trong Chrome. Giữ cửa sổ máy chủ mở trong lúc demo.
4. Kết nối Internet. Nếu trình duyệt còn giao diện cũ, nhấn Ctrl+F5 một lần.

Nếu cổng 5500 đang được một ứng dụng khác sử dụng, chạy `python -m http.server 5501 --bind 127.0.0.1 --directory dist`, rồi mở `http://localhost:5501`.

## Những phần giao diện đã hoàn thiện

- Tên giao diện Mây, nền sáng, thanh tìm kiếm màu xanh đậm và điểm nhấn cam.
- Thời tiết hiện tại ưu tiên địa điểm và nhiệt độ; hiển thị tình trạng, giờ dữ liệu, nhãn ngày/đêm.
- Biểu tượng SVG riêng cho trời quang, mây, mưa, dông, tuyết, sương mù; không tải ảnh hay phông chữ từ CDN.
- Bốn thẻ chỉ số: độ ẩm, tốc độ gió, nhiệt độ cảm nhận, lượng giáng thủy. Thanh độ ẩm phản ánh đúng phần trăm API.
- Dự báo 7 ngày có mô tả tiếng Việt, cao/thấp nhất và xác suất mưa. Thanh nhiệt độ dùng thang chung của 7 ngày, không phải biểu đồ theo giờ.
- Chuyển giữa Tổng quan và Biểu đồ: biểu đồ nối nhiệt độ cao nhất/thấp nhất từng ngày từ cùng dữ liệu API. Có bảng dữ liệu hỗ trợ trình đọc màn hình.
- Chọn nhanh Vĩnh Long, Hà Nội, TP. Hồ Chí Minh và Đà Nẵng. Các nút dùng tọa độ định sẵn, số liệu thời tiết vẫn tải trực tiếp từ API.
- Giao diện thích ứng, có trạng thái đang tải, không tìm thấy, ngoại tuyến, lỗi API và nút thử lại; hỗ trợ bàn phím và tùy chọn giảm chuyển động của hệ điều hành.

## Trình tự demo khoảng 5 phút

| Thời gian | Thao tác | Ý cần giải thích |
|---|---|---|
| 0:00–0:40 | Mở trang tại Vĩnh Long | Web đơn trang, không cần tài khoản; mục tiêu tra cứu và hiển thị thời tiết |
| 0:40–1:30 | Giới thiệu nhiệt độ, tình trạng, độ ẩm và gió | Bốn thông tin đúng yêu cầu đề tài; cảm nhận và giáng thủy là thông tin bổ sung |
| 1:30–2:15 | Tìm Tokyo hoặc Hanoi, chọn đúng kết quả | Geocoding API trả tọa độ; Forecast API lấy dữ liệu theo tọa độ |
| 2:15–3:00 | Xem 7 ngày, bấm Biểu đồ rồi Tổng quan | Thẻ và biểu đồ dùng cùng JSON; xác suất mưa khác lượng mưa |
| 3:00–3:40 | Chọn nhanh Đà Nẵng, rồi Cập nhật | Tên và số liệu đổi đồng bộ; giờ hiển thị là giờ tại địa điểm |
| 3:40–4:20 | Nhập một ký tự hoặc chuỗi không tồn tại | Kiểm tra đầu vào và thông báo dễ hiểu |
| 4:20–5:00 | Thu hẹp cửa sổ, xem giao diện nhỏ | HTML/CSS/Bootstrap thích ứng; JavaScript cập nhật DOM và xử lý REST API/JSON |

Nếu thầy hỏi xử lý lỗi mạng: khi đã có dữ liệu, ngắt mạng rồi bấm Cập nhật. Ứng dụng giữ dữ liệu cũ kèm thông báo; kết nối lại rồi bấm Thử tải lại. Không tự tạo dữ liệu giả khi API lỗi.

## Kết quả kiểm tra

24/24 nhóm kiểm thử đạt trong lần chạy ngày 16/10/2026. Bao gồm các luồng nhập/tìm/chọn/cập nhật, HTTP 429/500, JSON sai, dữ liệu thiếu, timeout, ngoại tuyến, yêu cầu chồng nhau, biểu đồ, nút chọn nhanh, bối cảnh ngày/đêm/mưa và gọi API thật cho Vĩnh Long, Hà Nội, Tokyo.

Đã kiểm tra độ rộng 320, 390, 768, 1024, 1366 và 1440 px trên Chrome desktop. Chưa xác nhận điện thoại vật lý, Firefox/Safari hoặc máy chiếu của lớp. Nên mở thử trên chính máy mang đi demo và chuẩn bị kết nối mạng trước giờ trình bày.

- `evidence-ui/test-results.json`: kết quả kiểm thử mới.
- `evidence-ui/api-responses.json`: phản hồi API thật trong phiên kiểm thử.
- `evidence-ui/thucte-desktop.png`, `thucte-mobile.png`: ảnh giao diện dùng API thật.
- `evidence-ui/bieu-do.png`, `ban-dem.png`, `giaolap-*.png`: kiểm tra giao diện bằng dữ liệu mô phỏng, không phải dữ liệu khí tượng thực tế.

Các ảnh/báo cáo ở `evidence/` và báo cáo ngày 09/10 là của phiên bản trước; dùng ảnh trong `evidence-ui/` nếu cập nhật báo cáo hoặc slide demo.

## Các câu hỏi cần nắm

**Ứng dụng có tự dự báo không?** Không. Ứng dụng lấy dữ liệu từ Open-Meteo, kiểm tra JSON rồi hiển thị.

**Vì sao gọi hai API?** Tên địa điểm cần được chuyển thành danh sách tọa độ; tọa độ được dùng để gọi API thời tiết.

**Biểu đồ có dữ liệu riêng không?** Không. Biểu đồ dùng `daily.temperature_2m_max` và `daily.temperature_2m_min`, giống các thẻ dự báo.

**Vì sao có nút chọn địa điểm sau tìm kiếm?** Một tên có thể trùng ở nhiều nơi, nên người dùng cần đối chiếu tỉnh/quốc gia.

**Vì sao giữ dữ liệu cũ khi lỗi?** Để người dùng vẫn tham khảo được lần tải thành công trước; thông báo luôn ghi rõ dữ liệu được giữ lại và thời gian của dữ liệu.

**Có đúng phạm vi đề cương không?** Có: HTML5, CSS3, Bootstrap, JavaScript, REST API/JSON, tìm địa điểm, thời tiết hiện tại, dự báo và xử lý lỗi. Biểu đồ là cách trình bày thêm cho dữ liệu dự báo, không thay đổi thành hệ thống tự dự báo.
