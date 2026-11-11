# Mây 2.0 — hướng dẫn chạy và demo

Ngày 24/10/2026. Bổ sung trực tiếp trên ứng dụng HTML5/CSS3/JavaScript/Bootstrap hiện có, không đổi sang framework mới. Dữ liệu Forecast/Geocoding từ Open-Meteo, xử lý JSON và hiển thị bằng DOM/SVG; không có khóa bí mật phía trình duyệt.

## Giao diện

Trên máy tính: thanh tìm kiếm/địa điểm ở bên trái, tổng quan thời tiết lớn cạnh bốn chỉ số chính. Điều hướng nhanh dẫn tới Theo giờ, 7 ngày, Chỉ số, Hoạt động, So sánh. Trên điện thoại: bố cục một cột, các bảng chỉ số thu về hai cột, dự báo theo giờ và biểu đồ cuộn ngang. Yêu thích/lịch sử thu gọn lúc mở trang trên màn hình nhỏ, có thể mở lại bằng “Địa điểm của bạn”. Chủ đề nắng/mây/mưa/giông/đêm giữ nguyên liên hệ với dữ liệu.

## Chức năng hiện có

| Nhóm | Nội dung |
|---|---|
| Tra cứu | Tìm địa điểm toàn cầu, chọn đúng vùng/quốc gia, địa điểm nhanh, dùng vị trí khi cho phép |
| Hiện tại | Nhiệt độ, cảm nhận, tình trạng, độ ẩm, gió, giáng thủy; nguồn/mốc dữ liệu/múi giờ |
| Theo giờ | Mặc định 24 giờ tới; chọn ngày xem tối đa 24 mốc của ngày đó; cả ngày và đêm; biểu đồ nhiệt độ, xác suất mưa, gió; bấm giờ xem sáu chỉ số |
| Theo ngày | 7 ngày, cao/thấp, xác suất mưa, biểu đồ; nút Xem ngày chuyển tổng quan và dự báo giờ cùng ngày |
| Mặt trời | Mọc, lặn, độ dài ban ngày theo địa điểm/ngày đang xem |
| Chỉ số mở rộng | UV, tầm nhìn, mây che phủ, áp suất bề mặt, hướng gió, gió giật; luôn ghi rõ là hiện tại |
| Lên kế hoạch | Gợi ý hiện tại và ba khung hoạt động; chọn ngày/hoạt động/xem giờ khác; lý do, mức thuận lợi/cần cân nhắc/không khuyến nghị |
| Cá nhân | Yêu thích/lịch sử lưu trên trình duyệt; không cần tài khoản |
| So sánh | Hai địa điểm, dữ liệu hiện tại, chênh lệch; tìm nơi thứ hai độc lập |
| Khả năng sử dụng | Bàn phím, trạng thái tải/lỗi/thử lại, thiếu dữ liệu, ngoại tuyến, chống kết quả cũ ghi đè, giảm chuyển động |

Chưa tích hợp radar, chất lượng không khí AQI, cảnh báo thiên tai từ cơ quan chính thức, thông báo nền, tài khoản đồng bộ hoặc dữ liệu thời tiết ngoại tuyến. Các dịch vụ đó cần nguồn/hạ tầng riêng. Phạm vi bản này là bộ chức năng tra cứu và dự báo cốt lõi phù hợp đề tài; không hứa dự báo chính xác tuyệt đối hay đủ mọi tính năng thương mại.

## Dữ liệu và cách xử lý

- Bổ sung `current`: cloud_cover, surface_pressure, visibility, wind_direction_10m, wind_gusts_10m (UV đã có).
- Bổ sung `hourly`: temperature_2m, relative_humidity_2m, precipitation bên cạnh cảm nhận/mưa/gió/mã/is_day/UV đã có.
- Bổ sung `daily`: sunrise, sunset, daylight_duration.
- Dùng đơn vị API °C, km/h, hPa, mét, giây; tầm nhìn đổi mét sang km. Kiểm tra số hữu hạn, miền hợp lệ, đơn vị, chiều dài mảng. Không ép null thành 0, không lấy cảm nhận thay cho nhiệt độ khi thiếu temperature_2m.
- Theo giờ mặc định bỏ mốc đã qua; chọn một ngày thì hiện cả ngày đó, nhãn ghi rõ “cả ngày”. Dự báo giờ và gợi ý hoạt động có mục đích khác nhau: gợi ý vẫn bỏ giờ đã qua và chỉ chọn ban ngày.
- ISO giờ địa phương giữ theo phản hồi API; không suy giờ địa điểm từ máy người xem. Biểu đồ không nối đường qua mốc thiếu hoặc khoảng giờ không liên tiếp. Mỗi mốc có thẻ/nút xem số liệu làm phương án tiếp cận thay cho biểu đồ.
- Mặt trời theo ngày chọn; sáu chỉ số bên cạnh vẫn ghi rõ là hiện tại. Cung mặt trời là minh họa trang trí, không khẳng định vị trí mặt trời thực. Trường thiếu ở vùng cực hoặc dịch vụ thiếu dữ liệu hiển thị “Chưa có”.
- Định vị chỉ gọi khi bấm nút. Tọa độ được làm tròn đến 0,01° trước khi gửi Open-Meteo. Chỉ hiển thị tên “Vị trí của bạn” và tọa độ gần đúng, không tự bịa địa chỉ khi chưa có reverse geocoding. Lịch sử áp dụng cách lưu có sẵn, người dùng có thể xóa. Từ chối/lỗi định vị vẫn tra cứu bằng tên bình thường. Kết quả định vị đến trễ không ghi đè địa điểm đã chọn thủ công.
- Khi tải địa điểm mới, dự báo giờ/chỉ số bổ sung cũ được ẩn; chỉ hiện lại sau phản hồi hợp lệ. Không cập nhật dữ liệu ngầm theo bộ đếm giờ.

Nguồn: [Open-Meteo Forecast API](https://open-meteo.com/en/docs). API thật đã được kiểm tra với các tham số mới. Gợi ý hoạt động là tiêu chí tham khảo của ứng dụng, không phải cảnh báo chính thức.

## Chạy và demo

1. Giải nén bản 2.0.0. Bấm đúp `CHAY_UNG_DUNG.cmd` (máy cần Node.js hoặc Python) hoặc chạy `npm start` tại thư mục dự án. Mở http://localhost:5500 và bật Internet.
2. Xem Vĩnh Long, đổi sang Hà Nội/Tokyo: màu nền, biểu tượng, mốc giờ và dữ liệu đổi theo nơi.
3. Tại Theo giờ, chuyển Nhiệt độ → Mưa → Gió; bấm một giờ để xem nhiệt độ, cảm nhận, độ ẩm, mưa, gió và UV. Trên điện thoại vuốt ngang để xem thêm.
4. Trong 7 ngày, bấm Xem ngày: tổng quan, dự báo theo giờ và mặt trời chuyển đúng ngày. Chọn Hiện tại ở đầu trang để quay lại.
5. Mở Chỉ số, giải thích rõ mốc hiện tại của UV/tầm nhìn/áp suất và ngày của mặt trời. Thiếu dữ liệu được báo rõ.
6. Mở Lên kế hoạch chọn hoạt động/giờ; rồi So sánh, tìm nơi thứ hai. Lưu yêu thích và tải lại trang để minh họa lưu trên trình duyệt.
7. Nếu muốn demo định vị, bấm Dùng vị trí của tôi rồi tự cho phép trình duyệt. Không cần cấp quyền để dùng các chức năng còn lại.

## Tệp thay đổi

- `dist/css/dashboard.css` (mới): bố cục tổng thể, sidebar/điều hướng, giờ, chỉ số, giao diện điện thoại.
- `dist/js/dashboard.js` (mới): hàm đọc/kiểm tra số liệu, theo giờ, SVG, chi tiết, mặt trời, định vị và tương tác thẻ ngày.
- `dist/index.html`: thêm phần giờ/chỉ số/định vị/điều hướng, đổi thứ tự để ưu tiên dự báo.
- `dist/js/app.js`: yêu cầu thêm trường API, ẩn nội dung mới khi tải.
- `dist/js/daily-view.js`: đồng bộ ngày với dashboard và cho phép chọn từ thẻ 7 ngày.
- `tests/dashboard-checks.cjs` (mới), `tests/browser.cjs`, `tests/recommendations.test.cjs`: kiểm tra dữ liệu/logic/tương tác/API thật.
- `package.json`, `README.md`, `docs/KIEM_THU.md`: phiên bản và hướng dẫn. Báo cáo Word cũ chưa ghép nội dung 2.0.

## Kiểm thử

`npm install` rồi `npm test` (Node, Chrome, Internet). `npm run test:logic` không cần mạng; `npm run test:browser` tự mở máy chủ thử nghiệm, chạy Chrome rồi đóng.

23 kiểm thử logic, 52 nhóm trình duyệt, trong đó 7 nhóm API thật. Có tình huống dữ liệu null/sai đơn vị, thiếu giờ, chọn ngày cuối, chuỗi lạ, lỗi mạng, giông, mưa lớn, đổi nơi liên tiếp, định vị từ chối/thành công/kết quả trễ và viewport 320–1440 px. Các ảnh `dashboard-*-390.png`, `dashboard-*-1440.png` là mô phỏng kiểm thử; `dashboard-api-that.png` dùng API thật. Nhật ký và phản hồi gốc tại `docs/evidence-experience/`. Chưa xác minh trên điện thoại vật lý, Safari/Firefox; kiểm thử phần mềm không đánh giá độ chính xác khí tượng thực địa.
