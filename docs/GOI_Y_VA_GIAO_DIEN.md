# Mây 1.4.0 — Gợi ý hoạt động và giao diện theo thời tiết

> Tài liệu lịch sử phiên bản 1.4.0. Từ 1.6.0, cách chọn giờ đã được thay bằng ba mức đánh giá, không loại mọi giờ nóng/mưa nhẹ như bên dưới. Quy tắc hiện hành, tệp sửa và cách demo: [CHON_GIO_HOAT_DONG.md](CHON_GIO_HOAT_DONG.md).

## Công nghệ và cách tích hợp

Đã đọc cấu trúc `dist/index.html`, `dist/js/app.js`, `features.js`, CSS và bộ kiểm thử hiện có trước khi sửa. Website là ứng dụng đơn trang HTML5/CSS3/JavaScript thuần, dùng Bootstrap 5.3.3 cục bộ, Open-Meteo Forecast/Geocoding API và JSON. Máy chủ Node.js chỉ phục vụ tệp tĩnh. Các chức năng tra cứu, biểu đồ 7 ngày, so sánh, yêu thích và lịch sử được giữ lại.

Màn hình chính vẫn dùng một yêu cầu Forecast API, bổ sung `current.precipitation_probability`, `current.uv_index` và `hourly=apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,is_day,uv_index`. Giữ `timezone=auto` và đơn vị °C, km/h, mm. So sánh không yêu cầu thêm toàn bộ mảng hourly. Không thêm khóa bí mật hoặc thư viện chạy ngoài vào trình duyệt.

## Các tệp thêm/sửa

| Tệp | Thay đổi |
|---|---|
| `dist/js/weather-config.js` | Tệp mới chứa ngưỡng, danh sách mã thời tiết và tiêu chí từng hoạt động |
| `dist/js/recommendations.js` | Tệp mới tách hàm gợi ý hiện tại, kiểm tra dữ liệu giờ, chọn khung giờ, hiển thị |
| `dist/js/weather-theme.js` | Tệp mới ánh xạ trạng thái thời tiết độc lập với ngày/đêm; áp dụng thuộc tính giao diện |
| `dist/css/weather-experience.css` | Tệp mới chứa chủ đề và giao diện gợi ý, hỗ trợ màn hình nhỏ và giảm chuyển động |
| `dist/index.html` | Nạp các tệp mới; thêm Gợi ý dành cho bạn, chọn hoạt động và phần giải thích tiêu chí |
| `dist/js/app.js` | Bổ sung truy vấn API, kết nối gợi ý/chủ đề với vòng đời tải; thêm mã giông 97; ẩn gợi ý cũ khi tải/lỗi |
| `dist/assets/weather.svg` | Biểu tượng trăng–mưa cục bộ |
| `tests/weather-fixture.cjs` | Dữ liệu mô phỏng riêng cho kiểm thử, không được trang thật tải |
| `tests/recommendations.test.cjs` | 16 kiểm thử logic độc lập |
| `tests/experience-checks.cjs`, `tests/browser.cjs` | Kiểm thử tích hợp, giao diện, hồi quy và API thật; 43 nhóm trình duyệt |
| `package.json`, `README.md`, tài liệu trong `docs/` | Phiên bản 1.4.0, lệnh kiểm tra và hướng dẫn |

## Gợi ý hiện tại

- Có mưa/giông theo mã WMO, giáng thủy > 0 mm hoặc xác suất tại mốc hiện tại ≥ 60%: chuẩn bị ô/áo mưa. Giông có gợi ý ở trong nhà riêng.
- Cảm nhận ≤ 18°C: mang áo khoác. Cảm nhận ≥ 32°C: mang mũ, uống đủ nước, ưu tiên chỗ mát.
- Gió ≥ 30 km/h: cân nhắc hoãn hoạt động ngoài trời. UV ≥ 6: ưu tiên bóng râm và mang mũ.
- Không lấy xác suất mưa cao nhất cả ngày để khẳng định đang mưa. Không đưa dữ liệu theo giờ vào khối hiện tại rồi gọi là quan trắc hiện tại.
- Chỉ sử dụng giá trị số hữu hạn, đúng đơn vị; thiếu căn cứ thì không tạo gợi ý tương ứng. Dữ liệu lõi sai vẫn bị bộ kiểm tra có sẵn từ chối; ứng dụng thông báo lỗi và không hiển thị gợi ý mới dựa trên phản hồi lỗi.

## Lựa chọn khung giờ hoạt động

**Bổ sung chọn ngày:** mục **Xem ngày** cho phép giữ chế độ 24 giờ tới hoặc chọn riêng một ngày trong 7 ngày API trả về (hôm nay và 6 ngày tiếp theo). Mỗi ngày vẫn có tối đa 3 khung giờ cho hoạt động đang chọn. Không cần gọi thêm API khi đổi ngày. Chọn hôm nay sẽ bỏ các giờ đã qua; khi đổi địa điểm/cập nhật, giữ ngày nếu vẫn nằm trong dự báo, nếu hết hạn thì trở lại 24 giờ tới. Thiếu dữ liệu ngày đã chọn sẽ thông báo rõ, không lấy gợi ý từ ngày khác để thay thế. Khối **Theo thời tiết hiện tại** luôn nói về hiện tại, độc lập với ngày dự báo được chọn.

| Hoạt động | Cảm nhận | Xác suất mưa | Gió | UV nếu có |
|---|---|---|---|---|
| Đi bộ | 12–30°C | ≤ 30% | < 25 km/h | < 6 |
| Chạy bộ | 12–28°C | ≤ 30% | < 20 km/h | < 6 |
| Đạp xe | 12–30°C | ≤ 30% | < 20 km/h | < 6 |

Đây là **tiêu chí tham khảo của ứng dụng**, có thể sửa trong `weather-config.js`, không phải quy chuẩn y tế hoặc dự báo do sinh viên tự xây dựng.

1. Lấy 24 giờ từ `current.time` của API tại địa điểm đang xem. Mỗi ứng viên kéo dài một giờ, bắt đầu từ mốc nguyên giờ chưa qua và kết thúc không vượt quá 24 giờ này.
2. Cả hai mốc đầu/cuối giờ phải có `is_day=1`, nhiệt độ cảm nhận, xác suất mưa, gió và mã thời tiết hợp lệ. Chỉ chấp nhận mã 0–3; loại mưa, giông (95/96/97/99), tuyết, sương mù, mã lạ và gió chạm/vượt ngưỡng. Không nối qua giờ bị thiếu hoặc mảng lệch.
3. Kiểm tra UV khi có. UV cao ở một đầu cũng loại cả khung. Nếu thiếu UV, có thể đề xuất trên các dữ liệu còn đủ nhưng ghi rõ chưa đánh giá đầy đủ yếu tố này; không coi UV thiếu là 0.
4. Xếp hạng bằng xác suất mưa tối đa + 2 × độ lệch cảm nhận lớn nhất khỏi mức mong muốn + gió tối đa + UV tối đa. UV thiếu nhận phần điểm bằng ngưỡng UV của hoạt động để không được ưu tiên nhờ dữ liệu thiếu. Mức cảm nhận mong muốn: đi bộ/đạp xe 23°C, chạy bộ 20°C. Đồng điểm chọn giờ sớm.
5. Chọn tối đa 3 khung, trình bày theo thứ tự thời gian. Hiển thị ngày, giờ, lý do, khoảng cảm nhận, xác suất mưa/gió/UV tối đa ở hai mốc. Các khung liền nhau có thể chung mốc kết thúc/bắt đầu, không chồng thời lượng.
6. Không có khung đáp ứng: thông báo không tìm thấy và gợi ý hoạt động trong nhà. Thiếu dự báo: thông báo chưa đủ dữ liệu, không tự tạo khung giờ. Gợi ý không bảo đảm diễn biến giữa hai mốc dự báo luôn giống hai đầu.

Thời gian được xử lý trên trục ISO địa phương do API trả, không theo múi giờ máy người xem. Open-Meteo xác định offset cố định trong từng phản hồi; giờ hiển thị giữ nguyên quy ước của phản hồi đó. Không triển khai chuyển đổi lịch DST độc lập.

## Giao diện tự đổi

Mã 0/1: nắng; 2/3 và các điều kiện mây/sương mù/tuyết: nền mây; các mã mưa/phùn/rào: nền mưa; 95/96/97/99: nền giông. Biểu tượng và mô tả riêng vẫn phân biệt sương mù/tuyết. Mã lạ dùng nền mặc định.

`current.is_day` quyết định ngày/đêm. Trạng thái này tách riêng khỏi trạng thái mưa/mây/giông: mưa đêm có nền xanh tối cùng trăng–mưa, mây đêm có trăng–mây, giông đêm có nền tím tối cùng sét. Không suy ngày/đêm từ đồng hồ máy người dùng. Màu nền trang, màu nhấn, thanh bên và thẻ thời tiết đổi, bố cục giữ nguyên. Hiệu ứng nhẹ sẵn có được tắt khi người dùng bật giảm chuyển động.

Khi tải/đổi địa điểm, nền về mặc định và gợi ý cũ tạm ẩn; khi tải thành công, chủ đề/gợi ý đổi cùng dữ liệu mới. Khi lỗi, giữ thông tin cũ theo hành vi có sẵn nhưng ghi rõ lỗi, nền mặc định và gợi ý vẫn ẩn. Chọn địa điểm ở phần so sánh bên B không thay chủ đề hoặc gợi ý của địa điểm chính.

## Chạy và demo

1. Bấm `CHAY_UNG_DUNG.cmd` hoặc chạy `npm start` ở thư mục dự án. Mở http://localhost:5500. Cần Internet để lấy API thật.
2. Cuộn tới **Gợi ý dành cho bạn**. Chỉ vào tên địa điểm/múi giờ/mốc dữ liệu và hai khối hiện tại/dự báo.
3. Lần lượt chọn Đi bộ, Chạy bộ, Đạp xe; mở **Cách chọn giờ và đưa ra gợi ý** và giải thích vì sao một khung được chọn hoặc vì sao không có khung phù hợp.
4. Đổi địa điểm ở ô tìm chính/địa điểm nhanh. Quan sát tên, màu nền, màu nhấn, biểu tượng và gợi ý cập nhật cùng nhau. Dùng các nơi ở múi giờ khác nhau để quan sát ngày/đêm, phụ thuộc thời tiết thực tế lúc demo.
5. Không hứa trước một thành phố chắc chắn có mưa/giông. Để trình bày đủ các trạng thái, dùng ảnh kiểm thử `theme-*.png` trong `docs/evidence-experience/` và nói rõ đây là **tình huống mô phỏng kiểm thử**. `goi-y-api-that.png` và `api-responses.json` là dữ liệu từ API thật tại lần chạy.
6. Kiểm tra tự động: `npm install`, sau đó `npm test` (cần Chrome). `npm run test:logic` chạy 16 kiểm thử logic không cần mạng; `npm run test:browser` chạy 43 nhóm trình duyệt và lưu minh chứng. Bộ kiểm tra tự mở/đóng máy chủ riêng, không cần mở máy chủ thủ công trước.

Kiểm thử gồm nắng nóng, lạnh, mưa, giông, đêm, thiếu dữ liệu, sai đơn vị, ngày/giờ lỗi, khung giông ở cuối giờ, đổi nơi, tải/lỗi, màn hình nhỏ và giảm chuyển động. 35 nhóm cũ được giữ, chỉ điều chỉnh kỳ vọng giông sang chủ đề giông mới. Viewport kiểm tra bằng Chrome desktop, chưa thay thế kiểm thử trên điện thoại vật lý/Safari/Firefox. Kết quả kiểm thử xác minh phần mềm và dữ liệu API, không chứng minh độ chính xác khí tượng ngoài thực tế.

## Nguồn dữ liệu

[Tài liệu chính thức Open-Meteo](https://open-meteo.com/en/docs): biến hiện tại/theo giờ, `is_day`, UV, đơn vị, timestamp và bảng mã WMO. Gợi ý là quy tắc tham khảo do ứng dụng áp dụng lên dữ liệu này.


