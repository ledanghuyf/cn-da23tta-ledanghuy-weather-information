# Đối chiếu yêu cầu

**Bản 1.5.0, ngày 23/10/2026:** bổ sung chọn ngày ở đầu trang để xem tổng quan từng ngày trong dự báo 7 ngày, tách rõ dữ liệu hiện tại/ngày dự báo và đồng bộ ngày gợi ý hoạt động. Đã xác nhận 16 kiểm thử logic và 45 nhóm trình duyệt. Xem `XEM_THOI_TIET_THEO_NGAY.md`.

**Bản 1.4.0:** thêm gợi ý hiện tại/dự báo hoạt động trong 24 giờ và chủ đề nắng/mây/mưa/giông/đêm theo yêu cầu mới. Ngưỡng cấu hình riêng, không đoán dữ liệu thiếu, không dùng giờ máy để suy ngày/đêm. Xem `GOI_Y_VA_GIAO_DIEN.md`; minh chứng `evidence-experience/` (16 kiểm thử logic, 43 nhóm trình duyệt).

**Cập nhật bổ sung 22/10/2026:** bản 1.3.0 thêm so sánh hai địa điểm, 6 địa điểm yêu thích và 8 mục lịch sử theo lựa chọn của người dùng. Đây là phần mở rộng, giữ nguyên HTML/CSS/JavaScript/Bootstrap, REST API/JSON và kiến trúc không backend nghiệp vụ. Xem `TINH_NANG_MOI.md`. Bộ kiểm thử hiện tại đạt 35/35 nhóm, minh chứng trong `evidence-features/`. Bảng bên dưới ghi nhận lần đối chiếu gốc ngày 09/10/2026.

Nguồn: ảnh yêu cầu và đề cương `LeDangHuy-110123013-DECUONGCHITIETCN (1).pdf`, mục 5, 6, 7, 10. Rà soát 09/10/2026.

| Yêu cầu | Bản gốc | Bản hoàn thiện |
|---|---|---|
| HTML5, CSS3, JS, Bootstrap, đơn trang | Đã có | Giữ kiến trúc và Bootstrap cục bộ |
| Tìm và đổi địa điểm | Đã có | Kiểm thử 02–06, 15–16, 20–21 |
| Nhiệt độ, tình trạng, độ ẩm, gió | Đã có | Kiểm tra trường bắt buộc/đơn vị; kiểm thử 01, 09, 19 |
| Dự báo thời tiết | Đã có 7 ngày | Mô tả chữ, kiểm tra mảng/ngày, xử lý xác suất null |
| REST API, JSON, cập nhật giao diện | Đã có | Củng cố cấu trúc JSON, lưu phản hồi API thật |
| Nhập sai, mất kết nối | Có xử lý cơ bản | Thêm ngoại tuyến, lỗi cấu trúc địa điểm, xác minh thử lại |
| Hiển thị desktop/mobile | Có CSS, thiếu minh chứng | Kiểm tra Chrome 320–1440 px và ảnh; chưa thử điện thoại vật lý |
| Phân tích yêu cầu, chọn API | README có một phần | Bổ sung báo cáo và khảo sát tài liệu công khai |
| Kiểm thử, sửa lỗi | README mô tả, thiếu bộ test | 21/21 nhóm kiểm tra đạt, mã kiểm thử, log và ảnh |
| Quyển báo cáo | Không có trong ZIP | Bổ sung Word và Markdown |

## Các lỗi hoặc thiếu sót đã sửa

1. Độ ẩm/gió null, ngày lỗi hoặc đơn vị sai có thể được nhận là tải thành công. Nay kiểm tra trước khi cập nhật state.
2. JSON null và danh sách địa điểm sai cấu trúc chưa có thông báo chính xác. Nay phân biệt với không tìm thấy kết quả.
3. Nhãn dự báo phụ thuộc biểu tượng/title, khó đọc trên cảm ứng. Nay có mô tả bằng chữ.
4. Dựng lại danh sách sau khi chọn làm mất focus bàn phím. Nay khôi phục focus.
5. Ngày dự báo phụ thuộc quy ước locale. Nay dùng dd/mm và tính thứ theo UTC từ ngày ISO.
6. Thiếu banner ngoại tuyến. Nay bổ sung; kết quả fetch vẫn quyết định dịch vụ có truy cập được hay không.

## Ngoài phạm vi bắt buộc

Đăng nhập, cơ sở dữ liệu, máy chủ nghiệp vụ, API riêng và tự dự báo không thuộc đề cương. GPS, bản đồ hoặc AI không phải chức năng còn thiếu bắt buộc.

## Nội dung cần xác nhận ngoài mã nguồn

Mẫu trình bày của khoa, nhận xét giảng viên, khả năng giải thích của sinh viên và kiểm tra thiết bị thật. Đề cương có các mốc tuần cách quãng trong giai đoạn 19/10–31/12/2026; không tự điền nhật ký cho các tuần này. Kết quả hiện tại là kết quả kỹ thuật ngày 09/10/2026.


