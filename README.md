# Scroll Smart · Nhật kí lướt

Nhật kí sử dụng mạng xã hội 7 ngày (28/9 – 4/10/2026) cho khoảng 60 học sinh, mã HS001–HS060.

- `index.html`: toàn bộ giao diện, chạy trên GitHub Pages.
- `apps-script/Code.gs`: máy chủ lưu dữ liệu, chạy trên Google Apps Script gắn với một Google Sheet (trang tính `NhatKi`).

## Cách dữ liệu được tính

- Thống kê nhóm chỉ dùng các lần lướt **đã hoàn tất** và chia cho **số bạn có ghi trong ngày đó**, không chia cho 60.
- Ngày không ai ghi thì để trống, không tính là 0.
- "Bằng dự kiến" = tổng phút thực tế trong ngày của một bạn lệch không quá ±5 phút so với tổng phút dự kiến.
- Học sinh chỉ nhận được trang của mã mình chọn. Thống kê nhóm được tính sẵn trên máy chủ nên không lộ dữ liệu từng mã.

## Đổi máy chủ

Dán URL ứng dụng web Apps Script (kết thúc bằng `/exec`) vào biến `API_URL` ở đầu phần `<script>` trong `index.html`.

## Xuất dữ liệu

Cuối trang có mục "Dành cho nhóm nghiên cứu". Nhập mã xuất dữ liệu (lấy từ Nhật ký thực thi khi chạy hàm `setup` trong Apps Script) để tải file Excel. Dữ liệu gốc cũng luôn có sẵn trong Google Sheet.

## Xoá dữ liệu thử

Trong trình soạn thảo Apps Script, chạy hàm `clearAllEntries`.
