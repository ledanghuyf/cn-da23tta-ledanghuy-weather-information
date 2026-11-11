# Mở website trên điện thoại

## Website đã xuất bản

Mở trực tiếp [Thời tiết — Dự báo mỗi ngày](https://thoitiet-ledanghuy.netlify.app/dist/) trên điện thoại. Đường dẫn cần có `/dist/` ở cuối. Đây là HTTPS nên trình duyệt có thể dùng GPS sau khi bạn cấp quyền Vị trí.

## Xuất bản lần đầu

1. Trên máy tính, mở trang [Netlify Drop](https://app.netlify.com/drop) và đăng nhập hoặc tạo tài khoản Netlify.
2. Kéo riêng thư mục `dist` của dự án vào vùng tải lên. Bên trong thư mục này có `index.html`, CSS, JavaScript và tài nguyên website.
3. Chờ Netlify tạo địa chỉ HTTPS có dạng `ten-du-an.netlify.app`.
4. Gửi địa chỉ HTTPS đó sang điện thoại và mở bằng trình duyệt bạn muốn dùng (Safari, Chrome, Edge hoặc trình duyệt hiện đại khác).
5. Cho phép quyền Vị trí khi trình duyệt hỏi. Bấm **Thời tiết gần tôi** để tải dự báo tại vị trí GPS; bấm **Mở bản đồ** để mở tọa độ hiện tại trong Google Maps.

## Vì sao địa chỉ Wi-Fi không định vị được?

Địa chỉ dạng `http://192.168.x.x:5500` chỉ phục vụ xem website trong mạng nội bộ. Các trình duyệt điện thoại chỉ cho website dùng GPS trong ngữ cảnh an toàn như HTTPS. Đây là quy tắc bảo mật của trình duyệt, không phụ thuộc chọn Safari, Chrome hay Edge. Hãy xuất bản thư mục `dist` lên hosting HTTPS theo các bước trên. Trong lúc chưa xuất bản, vẫn có thể tìm một địa điểm theo tên để xem thời tiết.

## Cập nhật website sau khi sửa mã

Kéo thư mục `dist` đã cập nhật vào phần tải bản mới trong trang quản lý Netlify của dự án. Mã trên máy tính không tự cập nhật website đã xuất bản.

Chỉ tải `dist` lên hosting. Thư mục `docs`, `tests` và các báo cáo không cần đưa lên website.

Nếu cần hỗ trợ quyền vị trí, dùng HTTPS và cấp quyền vị trí cho trình duyệt trên điện thoại. Độ chính xác phụ thuộc GPS, Wi-Fi và thiết bị; không thể bảo đảm tuyệt đối.
