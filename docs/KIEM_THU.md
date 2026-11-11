# Kết quả kiểm thử trình duyệt

## Mới nhất — 25/10/2026, bản 2.0.1

23/23 kiểm thử logic và 55/55 nhóm trình duyệt đạt, gồm 7 nhóm API thật. Nhóm 53–55 kiểm tra lỗi quyền, dịch vụ vị trí, timeout, trình duyệt không gọi callback, hủy, kết quả trễ, trình duyệt không hỗ trợ, ngoại lệ, tọa độ thiếu và lỗi tải thời tiết sau khi nhận tọa độ. Không tự thay bằng tọa độ mặc định. Định vị dùng mô phỏng; không xác nhận quyền hoặc dịch vụ vị trí thực tế trên thiết bị người dùng. Minh chứng: `evidence-experience/test-results.json` và `dinh-vi-huong-dan.png`. Xem `DINH_VI.md`.

## Bản 2.0.0 — 24/10/2026

23/23 kiểm thử logic, 52/52 nhóm trình duyệt đạt, gồm 7 nhóm API thật. Nhóm 47 đối chiếu giờ/mặt trời/tầm nhìn với JSON thật; 48–52 kiểm tra biểu đồ, chi tiết giờ, thẻ chọn ngày, thiếu dữ liệu, định vị (mô phỏng quyền và tọa độ), kết quả định vị trễ, responsive và bàn phím. Độ rộng 320–1440 px không tràn ngang; biểu đồ/danh sách giờ có vùng cuộn riêng. Minh chứng `evidence-experience/`; hướng dẫn `MAY_2_HUONG_DAN.md`. Chưa thử điện thoại vật lý, Safari/Firefox; không đo độ chính xác khí tượng ngoài thực địa.

## Mới nhất — 23/10/2026, bản 1.6.0

19/19 kiểm thử logic, 46/46 nhóm trình duyệt đạt trên Chrome 155.0.8059.85; 6 nhóm gọi API thật. Bổ sung tình huống cảm nhận 37,4°C/mưa vừa/100% xác suất, phân biệt thuận lợi và cần cân nhắc, ưu tiên đúng thứ tự, giới hạn loại trừ ở hai đầu giờ, tự mở giờ bị loại và hiển thị lý do. Nhóm 46 kiểm tra chọn giờ rồi đổi hoạt động/ngày/địa điểm không giữ lựa chọn cũ; kiểm tra nhãn và bố cục mới. Đã xem ảnh desktop/mobile, không tràn ngang ở 320–1440 px. Nhật ký: `evidence-experience/test-results.json`. Hướng dẫn: `CHON_GIO_HOAT_DONG.md`. Giới hạn: chưa thử điện thoại vật lý, Safari hoặc Firefox; không đánh giá độ chính xác khí tượng ngoài thực địa.

## Bản 1.5.0 — 23/10/2026

16/16 kiểm thử logic, 45/45 nhóm trình duyệt đạt, gồm 6 nhóm API thật. Bổ sung nhóm 44 kiểm tra tổng quan ngày chọn từ đầu trang và nhóm 45 đối chiếu daily API thật. Dữ liệu kiểm tra/screenshot mới ở `evidence-experience/`. Hướng dẫn trong `XEM_THOI_TIET_THEO_NGAY.md`. Các kết quả bên dưới thuộc các giai đoạn trước.

## Bản 1.4.0 — Gợi ý và giao diện theo thời tiết

16/16 kiểm thử logic và 43/43 nhóm trình duyệt đạt, gồm 5 nhóm API thật. Bổ sung tình huống nắng nóng/lạnh/mưa/giông/đêm, UV và dữ liệu thiếu, ngưỡng từng hoạt động, khung trong 24 giờ, giờ kết thúc có giông, đổi địa điểm/tải/lỗi, responsive và giảm chuyển động. Minh chứng mới ở `evidence-experience/`; chi tiết quy tắc và cách chạy trong `GOI_Y_VA_GIAO_DIEN.md`. Bộ mới không ghi đè minh chứng 1.3.0.

## Kết quả hiện tại — 22/10/2026, bản 1.3.0

35/35 nhóm đạt: 31 nhóm dữ liệu/tình huống kiểm soát, 4 nhóm API thật. Bổ sung kiểm tra yêu thích/lịch sử, tải lại trang, giới hạn danh sách, lưu bị chặn, dữ liệu lưu hỏng, so sánh và chênh lệch, khác ngày địa phương, xác suất mưa null, đổi địa điểm liên tiếp và khôi phục lỗi. API thật đã chạy Vĩnh Long, Hanoi, Tokyo và so sánh Tokyo–Vĩnh Long.

Kết quả chi tiết và phiên bản Chrome nằm trong `evidence-features/test-results.json`; phản hồi API trong `evidence-features/api-responses.json`. Ảnh `so-sanh-desktop.png`, `so-sanh-mobile.png` là dữ liệu mô phỏng; `so-sanh-api-that.png`, `toan-trang-moi.png` là dữ liệu API thật. Đã kiểm tra không tràn ngang ở 320, 390, 768, 1024, 1366 và 1440 px. Chưa thử thiết bị di động vật lý, Safari hoặc Firefox. Kiểm thử xác minh phần mềm hiển thị đúng API, không chứng minh độ chính xác khí tượng ngoài thực địa.

Chạy `npm install`, `npm test` tại thư mục dự án với Node.js và Chrome. Bộ kiểm thử tự mở/đóng máy chủ; cần Internet cho các nhóm API thật. Kết quả mới ghi vào `evidence-features/`, giữ minh chứng các phiên bản trước.

## Lịch sử kiểm thử 09/10/2026

Ngày: 2026-10-09. Chrome 154.0.8037.98. Playwright 1.62.1.

18 nhóm dùng dữ liệu/tình huống kiểm soát; 3 nhóm API thật. Tổng 21/21 nhóm đạt tại lần hoàn thiện.

| Nhóm | Kết quả |
|---|---|
| 01 Tải mặc định và đối chiếu giá trị JSON | PASS |
| 02 Tìm và đổi địa điểm bằng bàn phím, giữ focus | PASS |
| 03 Từ chối tên trống và một ký tự | PASS |
| 04 Không tìm thấy địa điểm | PASS |
| 05 Kết quả tìm kiếm sai cấu trúc và thiếu tọa độ | PASS |
| 06 Chuỗi HTML trong tên chỉ hiển thị như văn bản | PASS |
| 07 HTTP 429 giữ dữ liệu cũ và thử lại đúng địa điểm | PASS |
| 08 HTTP 500, JSON hỏng và JSON null | PASS |
| 09 Từ chối dữ liệu thời tiết thiếu hoặc sai | PASS |
| 10 Thiếu xác suất mưa không bị hiển thị thành 0% | PASS |
| 11 Mã thời tiết lạ có mô tả dự phòng | PASS |
| 12 Ngoại tuyến, lỗi mạng và phục hồi | PASS |
| 13 Lỗi lần tải đầu và thử lại | PASS |
| 14 Hết thời gian chờ 15 giây | PASS |
| 15 Đổi địa điểm nhanh, kết quả cuối cùng thắng | PASS |
| 16 Tìm liên tiếp, kết quả cũ không ghi đè | PASS |
| 17 Màn hình 320, 390, 768, 1024, 1440 px không tràn ngang | PASS |
| 18 Không có lỗi JavaScript chưa xử lý | PASS |
| 19 API thật tải Vĩnh Long từ trình duyệt | PASS |
| 20 API thật tìm và chọn Hanoi | PASS |
| 21 API thật tìm và chọn Tokyo | PASS |

## Cách chạy lại

Cài Node.js, Chrome, chạy `npm install` rồi `npm test`. Script tự mở máy chủ cục bộ và đóng khi hoàn tất. Kết quả mới ghi đè thư mục evidence.

## Minh chứng

- `test-results.json`: log nhóm kiểm tra.
- `api-responses.json`: URL, mã HTTP và JSON từ dịch vụ thật.
- `giaolap-*.png`: ảnh từ dữ liệu kiểm thử.
- `thucte-*.png` và `mobile-*.png`: ảnh dùng API thật.
- `loi-api.png`: lỗi 429 được mô phỏng có chủ đích.

## Giới hạn

Viewport mô phỏng trên Chrome desktop; chưa thử điện thoại vật lý, Safari hoặc Firefox.
Không coi dữ liệu mô phỏng là thời tiết thật. Không đo độ chính xác khí tượng. API thật có thể thất bại khi chạy lại nếu mất kết nối hoặc dịch vụ giới hạn.


