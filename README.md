# Scroll Smart · Nhật kí lướt

Nhật kí sử dụng mạng xã hội 7 ngày (28/9 – 4/10/2026) cho khoảng 60 học sinh, mã HS001–HS060.

- `index.html`: toàn bộ giao diện.
- `api/diary.js`: API chạy trên Vercel (serverless function).
- `lib/`: luật nghiệp vụ (`core.js`), kết nối Postgres (`db.js`), xử lý yêu cầu (`handler.js`).
- Dữ liệu nằm trong Postgres của Supabase, bảng `diary_entries`. Bảng được tạo tự động ở lần gọi API đầu tiên, có bật Row Level Security nên khoá công khai của Supabase không đọc được.

## Biến môi trường trên Vercel

- `POSTGRES_URL`: chuỗi kết nối Postgres của Supabase (tích hợp Supabase trên Vercel tự thêm biến này).
- `EXPORT_KEY`: mã để nhóm nghiên cứu tải file Excel. Tự đặt bằng `vercel env add EXPORT_KEY production`.

## Deploy từ máy

```
git clone https://github.com/therealwolvesofwallstreet-ui/scroll-smart
cd scroll-smart
vercel link
vercel integration add supabase --name scroll-smart-db
vercel env add EXPORT_KEY production
vercel --prod
```

## Cách tính số liệu

- Thống kê nhóm chỉ dùng các lần lướt **đã hoàn tất** và chia cho **số bạn có ghi trong ngày đó**, không chia cho 60.
- Ngày không ai ghi thì để trống, không tính là 0.
- "Bằng dự kiến" = tổng phút thực tế trong ngày của một bạn lệch không quá ±5 phút so với tổng phút dự kiến.
- Học sinh chỉ nhận được trang của mã mình chọn. Thống kê nhóm được tính sẵn trên máy chủ.

## Xuất dữ liệu

Cuối trang có mục "Dành cho nhóm nghiên cứu". Nhập mã `EXPORT_KEY` để tải file Excel. Nếu chưa đặt biến này thì mã nằm trong bảng `app_settings` (dòng `export_key`) trên Supabase.

## Xoá dữ liệu thử

Trong Supabase SQL Editor: `delete from diary_entries;`
