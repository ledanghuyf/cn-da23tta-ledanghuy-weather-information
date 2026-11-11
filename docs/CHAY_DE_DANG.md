# Cách chạy bản đã sửa khởi động

Bấm đúp CHAY_UNG_DUNG.cmd trong thư mục này. Máy chủ tự chọn cổng trống và mở trình duyệt; giữ cửa sổ lệnh mở khi sử dụng. Không cần tự đặt PORT hay nhớ cổng 5500/5501. Mở lại khi máy chủ cũ còn chạy sẽ dùng cổng trống khác, không dừng ứng dụng khác.

Trong VS Code vẫn dùng: node scripts/serve.cjs. Mở đúng địa chỉ được in trong terminal. Có thể dùng node scripts/serve.cjs --open để mở trình duyệt tự động.

Đã kiểm tra bằng Node.js v22.20.0 trên máy: cổng bị chiếm, khởi động liên tiếp, chạy từ thư mục làm việc khác, PORT sai, trang HTML và JavaScript trả về đúng bản. Tệp nguồn không dùng cache để lần tải trang sau nhận được mã đã sửa. Không cần npm install để chạy website. Vẫn cần Internet cho API và quyền trình duyệt nếu dùng định vị; lỗi kết nối/không cấp quyền được thông báo trên giao diện.

Chạy kiểm tra khởi động: node --test tests/launch.test.cjs.