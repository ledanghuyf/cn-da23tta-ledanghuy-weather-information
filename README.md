# Xây dựng ứng dụng Web hỗ trợ tra cứu và hiển thị thông tin thời tiết

> **Đồ án chuyên ngành** · **Sinh viên:** Lê Đăng Huy · **MSSV:** 110123013 · **Lớp:** DA23TTA

> README mô tả phiên bản ứng dụng 3.0.0 theo mã nguồn và tài liệu hiện có. Đây là phần mềm tra cứu dữ liệu thời tiết từ dịch vụ bên ngoài, không phải hệ thống tự dự báo khí tượng.

## Giới thiệu

Ứng dụng web giúp người dùng tìm địa điểm và xem thời tiết hiện tại, dự báo theo giờ và dự báo bảy ngày trên cùng một giao diện. Dữ liệu được lấy qua REST API, nhận ở định dạng JSON và hiển thị trong một trang web thích ứng trải rộng trên máy tính, máy tính bảng và thu gọn tối ưu trên điện thoại (320 px – 1440 px).

Đề tài tập trung vào việc khảo sát yêu cầu, tích hợp API, xử lý dữ liệu bất đồng bộ, trình bày thông tin thời tiết và xử lý các tình huống như địa điểm không hợp lệ, lỗi kết nối hoặc dữ liệu thiếu. Ngoài thời tiết và dự báo, ứng dụng có chất lượng không khí, gợi ý theo thời tiết (trang phục, vật dụng, hoạt động) và hiệu ứng nền thay đổi theo thời tiết thật.

## Trải nghiệm ứng dụng

- **Website đã triển khai:** [Thời tiết — Dự báo mỗi ngày](https://thoitiet-ledanghuy.netlify.app/dist/)
- **Chạy tại máy:** hướng dẫn ở phần [Chạy ứng dụng](#chạy-ứng-dụng)

## Chức năng

- Khi mở trang, ứng dụng xin quyền vị trí và hiển thị thời tiết nơi người dùng đang đứng, gọi tên đến cấp xã, phường. Vị trí là bắt buộc: chưa cho phép, hết thời gian chờ hoặc ở ngoài Việt Nam thì không hiển thị thời tiết, khóa ô tìm kiếm và có nút Thử lại.
- Tìm địa điểm ở Việt Nam theo tên có dấu, không dấu hoặc viết tắt (X., P., TT., H., Q., TP., TX.); bấm vào ô tìm kiếm là hiện ngay các xã, phường gần bạn. Có thể mở địa điểm từ đường dẫn chia sẻ (`?lat=&lon=&place=`).
- Thời tiết hiện tại: nhiệt độ, tình trạng trời (ban ngày theo tỉ lệ nắng, ban đêm theo lượng mây che phủ), cao nhất, thấp nhất trong ngày.
- Dự báo 24 giờ tới (ô từng giờ kèm khả năng mưa; biểu đồ nhiệt độ, khả năng mưa, gió, lượng mưa) và dự báo 7 ngày; chọn một ngày để xem tổng quan ngày đó.
- Lưới ô chỉ số: độ ẩm, gió, cảm nhận, lượng mưa, mặt trời mọc, lặn, UV, tầm nhìn, mây, áp suất, hướng gió, gió giật; chất lượng không khí (US AQI, PM2.5, PM10, NO₂, O₃).
- Gợi ý theo thời tiết: mức Lạnh, Bình thường, Nóng theo ngưỡng khí tượng Việt Nam (nắng nóng khi cao nhất ngày trên 35°C, rét đậm khi trung bình ngày dưới 15°C) và gợi ý trang phục, vật dụng, hoạt động dựa trên số liệu dự báo.
- Nền trời và hiệu ứng động theo thời tiết thật (nắng, mây, mưa phùn, mưa, dông có chớp, ban đêm); có nút tắt hiệu ứng và tôn trọng `prefers-reduced-motion`.
- Giao diện kiểu ứng dụng Thời tiết trên điện thoại, thích ứng từ 320 px đến 1440 px; thông báo rõ khi lỗi mạng, dịch vụ chậm hoặc dữ liệu thiếu, không tự tạo dữ liệu thay thế.

## Công nghệ và dữ liệu

- HTML5, CSS3, JavaScript thuần và Bootstrap 5.3.3; hiệu ứng mây, chớp vẽ bằng SVG.
- Ứng dụng web tĩnh, phiên bản 3.0.0; máy chủ Node.js nhỏ được dùng để phục vụ ứng dụng khi chạy tại máy.
- Nominatim (OpenStreetMap) để tìm địa điểm và gọi tên vị trí, tối đa 1 yêu cầu mỗi giây; Open-Meteo Geocoding API làm nguồn dự phòng; Open-Meteo Forecast API cho thời tiết; Open-Meteo Air Quality API cho chất lượng không khí.
- Giao tiếp qua HTTP GET, kiểm tra trạng thái phản hồi và phân tích JSON ở phía trình duyệt.
- Trình duyệt chỉ lưu lựa chọn bật, tắt hiệu ứng và danh sách gợi ý gần bạn (7 ngày). Ứng dụng không có backend nghiệp vụ, cơ sở dữ liệu máy chủ hay hệ thống tài khoản.

Giá trị dự báo là dữ liệu mô hình do API cung cấp, không phải phép đo tại từng địa chỉ và không bảo đảm chính xác tuyệt đối. Ứng dụng không xây dựng mô hình dự báo riêng, radar mưa hay hệ thống cảnh báo thiên tai chính thức.

## Chạy ứng dụng

Yêu cầu Node.js. Không cần cài thêm gói để mở website ở chế độ chạy thông thường.

**Windows:** nhấp đúp `CHAY_UNG_DUNG.cmd`.

Hoặc mở terminal tại thư mục dự án và chạy:

```powershell
node scripts/serve.cjs --open
```

Máy chủ in địa chỉ truy cập trong terminal và tự chọn cổng khác nếu cổng mặc định đang bận. Nhấn `Ctrl+C` để dừng. Cần kết nối Internet để truy vấn dữ liệu API; định vị thiết bị yêu cầu trình duyệt cho phép quyền vị trí và thường cần HTTPS hoặc localhost.

## Kiểm thử

Các bài kiểm thử dùng Node.js và Playwright; kiểm thử trình duyệt cần Google Chrome. Cài đặt phụ thuộc phát triển và chạy bộ kiểm thử:

```powershell
npm install
npm test
```

Một số lệnh kiểm thử riêng:

```powershell
npm run test:logic
npm run test:launch
npm run test:mobile
```

Kiểm thử API thật cần Internet và có thể bị ảnh hưởng bởi tình trạng hoặc giới hạn của nhà cung cấp. Ảnh và dữ liệu mô phỏng trong thư mục kiểm thử chỉ phục vụ kiểm tra giao diện/lỗi, không được ứng dụng dùng làm thời tiết trực tiếp.

## Triển khai website

Website tĩnh đã triển khai tại liên kết ở trên. Khi cần cập nhật, xuất bản nội dung thư mục `dist` lên hosting tĩnh theo hướng dẫn trong [`docs/MO_TREN_DIEN_THOAI.md`](docs/MO_TREN_DIEN_THOAI.md). Chỉ thư mục `dist` là phần website được phục vụ; tài liệu, báo cáo và bộ kiểm thử không phải nội dung triển khai.

## Tài liệu dự án

- [`thesis/pdf/`](thesis/pdf/) và [`thesis/doc/`](thesis/doc/) — quyển báo cáo đồ án (PDF, Word).
- [`progress-report/`](progress-report/) — báo cáo tiến độ.

- [`docs/DOI_CHIEU_CHUC_NANG_05-11-2026.md`](docs/DOI_CHIEU_CHUC_NANG_05-11-2026.md) — đối chiếu chức năng website với đề cương.
- [`docs/HINH_ANH.md`](docs/HINH_ANH.md) — logo, biểu tượng và hình minh họa.
- [`docs/MO_TREN_DIEN_THOAI.md`](docs/MO_TREN_DIEN_THOAI.md) — hướng dẫn mở website trên điện thoại.

Ảnh minh chứng kiểm thử (`docs/evidence-*/`) do `npm test` tự tạo lại, không lưu trong repo.

Kết quả kiểm thử và ảnh chụp trong tài liệu phản ánh môi trường, thời điểm kiểm tra được ghi trong từng tài liệu; không thay cho xác nhận trên mọi thiết bị hoặc nghiệm thu của giảng viên. Phần nhận xét, chữ ký và xác nhận theo mẫu của khoa cần được bổ sung theo quy định học vụ.

## Tác giả

**Lê Đăng Huy** — MSSV **110123013**, lớp **DA23TTA**
Email: ledanghuythptdh@gmail.com · Điện thoại: 0769349738
Giảng viên hướng dẫn: ThS. Lê Minh Tự
Đồ án chuyên ngành: *Xây dựng ứng dụng Web hỗ trợ tra cứu và hiển thị thông tin thời tiết*.
