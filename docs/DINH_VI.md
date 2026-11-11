# Định vị — Mây 2.0.1

## Vì sao nút không lấy được vị trí?

Thông báo cũ gộp lỗi dịch vụ không cung cấp tọa độ và hết thời gian chờ. Chỉ từ ảnh không thể xác định chính xác nguyên nhân. Trình duyệt cần được người dùng cho phép và thiết bị cần có dịch vụ vị trí khả dụng. Website không thể tự bật những thiết lập đó.

## Cách dùng trên máy đang chạy ứng dụng

1. Chạy `CHAY_UNG_DUNG.cmd` hoặc `node scripts/serve.cjs` như trước.
2. Mở `http://localhost:5500/` bằng Chrome hoặc Edge. Nhấn Ctrl+F5 để nạp mã mới.
3. Bấm **Dùng vị trí của tôi**, cho phép Vị trí nếu trình duyệt hỏi.
4. Nếu bị chặn, kiểm tra quyền Vị trí tại biểu tượng bên trái thanh địa chỉ. Trên Windows, kiểm tra **Cài đặt → Quyền riêng tư & bảo mật → Vị trí**. Tên mục có thể khác giữa các phiên bản Windows.
5. Bấm **Thử định vị lại**. Nếu thiết bị vẫn không cung cấp tọa độ, dùng tìm địa điểm bằng tên.

Định vị cần HTTPS hoặc localhost. Địa chỉ localhost chỉ dùng trên chính máy đang chạy ứng dụng; trên điện thoại, localhost là điện thoại đó. Khi đưa lên mạng cần HTTPS.

## Thay đổi

- `dist/js/location.js`: module định vị riêng; phân loại lỗi; chờ tối đa 30 giây cho yêu cầu API và 35 giây để giải phóng giao diện nếu trình duyệt không phản hồi; hủy và bỏ qua kết quả cũ; lần thử lại yêu cầu vị trí mới. Phân biệt đã nhận tọa độ với đã tải được thời tiết. Tọa độ làm tròn hai chữ số thập phân phục vụ tra cứu thời tiết gần người dùng.
- `dist/js/dashboard.js`: chuyển xử lý định vị sang module mới, hủy yêu cầu khi chọn địa điểm khác.
- `dist/index.html`, `dist/css/dashboard.css`: nút hủy, thử lại, hướng dẫn có thể thu gọn, sao chép địa chỉ và quay lại ô tìm kiếm.
- `tests/location-checks.cjs`, `tests/browser.cjs`: bổ sung ba nhóm kiểm tra lỗi và phục hồi.
- `package.json`, `README.md`, `docs/KIEM_THU.md`, tài liệu này: phiên bản và hướng dẫn.

Không dùng định vị IP hoặc tự nhận Vĩnh Long là vị trí của người dùng. Không tự thay đổi quyền trình duyệt hay Windows.

## Kiểm tra và demo

Ngày 25/10/2026: 23/23 kiểm thử logic, 55/55 nhóm trình duyệt đạt, gồm 7 nhóm gọi API thời tiết thật. Các lỗi/quyền/tọa độ định vị được mô phỏng, chưa kiểm chứng định vị thật trên máy người dùng. Chạy lại bằng `npm test` sau khi cài phụ thuộc và có Chrome, Internet.

Demo: bấm định vị và cho phép; nếu nhận tọa độ và tải thành công, phần tổng quan hiện **Vị trí của bạn**. Khi bị từ chối hoặc không lấy được tọa độ, trang hiển thị đúng nguyên nhân, mở hướng dẫn và cho phép thử lại. Có thể hủy trong lúc đang chờ tọa độ hoặc tìm địa điểm bằng tên để tiếp tục demo.

Tham khảo: [Geolocation — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition), [các mã lỗi — MDN](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError), [quyền vị trí Chrome](https://support.google.com/chrome/answer/142065?hl=en).
