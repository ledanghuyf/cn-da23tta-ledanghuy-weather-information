# Xây dựng ứng dụng Web hỗ trợ tra cứu và hiển thị thông tin thời tiết

> **Đồ án chuyên ngành** · **Sinh viên:** Lê Đăng Huy · **MSSV:** 110123013 · **Lớp:** DA23TTA

> README mô tả phiên bản ứng dụng 3.0.0 theo mã nguồn và tài liệu hiện có. Đây là phần mềm tra cứu dữ liệu thời tiết từ dịch vụ bên ngoài, không phải hệ thống tự dự báo khí tượng.

## Giới thiệu

Ứng dụng web giúp người dùng tìm địa điểm và xem thời tiết hiện tại, dự báo theo giờ và dự báo bảy ngày trên cùng một giao diện. Dữ liệu được lấy qua REST API, nhận ở định dạng JSON và hiển thị trong một trang web thích ứng trải rộng trên máy tính, máy tính bảng và thu gọn tối ưu trên điện thoại (320 px – 1440 px).

Đề tài tập trung vào việc khảo sát yêu cầu, tích hợp API, xử lý dữ liệu bất đồng bộ, trình bày thông tin thời tiết và xử lý các tình huống như địa điểm không hợp lệ, lỗi kết nối hoặc dữ liệu thiếu. Các chức năng mở rộng phục vụ tra cứu thực tế gồm chất lượng không khí, gợi ý hoạt động theo thời tiết, địa điểm yêu thích, lịch sử và định vị.

## Trải nghiệm ứng dụng

- **Website đã triển khai:** [Thời tiết — Dự báo mỗi ngày](https://thoitiet-ledanghuy.netlify.app/dist/)
- **Chạy tại máy:** hướng dẫn ở phần [Chạy ứng dụng](#chạy-ứng-dụng)

## Chức năng

- Tìm địa điểm ở Việt Nam theo tên (có dấu hoặc không dấu), chọn đúng tỉnh/thành trong kết quả; có thể dùng vị trí thiết bị nếu người dùng cấp quyền. Vị trí hoặc liên kết ở ngoài Việt Nam được từ chối kèm thông báo.
- Xem thời tiết hiện tại và dự báo theo giờ hoặc bảy ngày; chọn ngày, xem chi tiết và biểu đồ lượng mưa.
- Theo dõi nhiệt độ, cảm giác như, độ ẩm, lượng mưa, gió, UV và các chỉ số khác khi API cung cấp.
- Xem thông tin chất lượng không khí từ Open-Meteo/CAMS, bao gồm chỉ số US AQI, nguồn dữ liệu và thời điểm dữ liệu.
- Chọn ngày, giờ và hoạt động để nhận tối đa ba gợi ý, kèm mức thuận lợi và giải thích dựa trên số liệu dự báo. Gợi ý không thay thế tư vấn chuyên môn hay bảo đảm điều kiện thực tế.
- Lưu địa điểm yêu thích, xem lịch sử tra cứu, tự mở lại nơi vừa xem và mở bản đồ vị trí thiết bị.
- Hiển thị giao diện trải rộng đa cột trên máy tính và thu gọn trên điện thoại với thanh điều hướng 5 mục, bản đồ khu vực tổng quát kèm dấu chấm vị trí, bộ biểu tượng SVG thời tiết nhúng cục bộ trong `index.html`, đổi màu theo điều kiện thời tiết và ngày/đêm của địa điểm; hỗ trợ tùy chọn giảm chuyển động (`prefers-reduced-motion`).
- Thông báo trạng thái tải, lỗi API, dữ liệu cũ hoặc thiếu; không tự tạo dữ liệu thời tiết thay thế khi dịch vụ lỗi.

## Công nghệ và dữ liệu

- HTML5, CSS3, JavaScript thuần và Bootstrap 5.3.3.
- Ứng dụng web tĩnh, phiên bản 3.0.0; máy chủ Node.js nhỏ được dùng để phục vụ ứng dụng khi chạy tại máy.
- Open-Meteo Geocoding API để tìm tọa độ địa điểm; Open-Meteo Forecast API để lấy dữ liệu thời tiết; Open-Meteo Air Quality API/CAMS để lấy thông tin chất lượng không khí.
- Giao tiếp qua HTTP GET, kiểm tra trạng thái phản hồi và phân tích JSON ở phía trình duyệt.
- Các địa điểm yêu thích và lịch sử được lưu trong trình duyệt. Ứng dụng không có backend nghiệp vụ, cơ sở dữ liệu máy chủ hay hệ thống tài khoản.

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

- [`docs/DOI_CHIEU_CHUC_NANG_05-11-2026.md`](docs/DOI_CHIEU_CHUC_NANG_05-11-2026.md) — đối chiếu chức năng website với đề cương.
- [`docs/HINH_ANH.md`](docs/HINH_ANH.md) — logo, biểu tượng và hình minh họa.
- [`docs/MO_TREN_DIEN_THOAI.md`](docs/MO_TREN_DIEN_THOAI.md) — hướng dẫn mở website trên điện thoại.

Ảnh minh chứng kiểm thử (`docs/evidence-*/`) do `npm test` tự tạo lại, không lưu trong repo.

Kết quả kiểm thử và ảnh chụp trong tài liệu phản ánh môi trường, thời điểm kiểm tra được ghi trong từng tài liệu; không thay cho xác nhận trên mọi thiết bị hoặc nghiệm thu của giảng viên. Phần nhận xét, chữ ký và xác nhận theo mẫu của khoa cần được bổ sung theo quy định học vụ.

## Tác giả

**Lê Đăng Huy** — MSSV **110123013**, lớp **DA23TTA**  
Đồ án chuyên ngành: *Xây dựng ứng dụng Web hỗ trợ tra cứu và hiển thị thông tin thời tiết*.

