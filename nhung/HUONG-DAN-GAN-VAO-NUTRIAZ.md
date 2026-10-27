# Gắn công cụ vào nutriaz.edu.vn/kiem-tra-tang-truong

Công cụ đang chạy tại: https://nutriazkhoahocxanh-star.github.io/kiem-tra-tang-truong/

Website nutriaz.edu.vn làm trên **Pancake**. Cách làm: tạo một trang mới trên Pancake có đường dẫn
`kiem-tra-tang-truong`, rồi nhúng công cụ vào trang đó.

## Bước 1 – Tạo trang mới trên Pancake

1. Đăng nhập trang quản trị Pancake, mở trình chỉnh sửa website nutriaz.edu.vn.
2. Vào mục **Trang** (Pages) → **Thêm trang mới**.
3. Đặt:
   - Tên trang: `Kiểm tra tăng trưởng của bé`
   - Đường dẫn (slug / URL): `kiem-tra-tang-truong`
   - Tiêu đề SEO: `Kiểm tra tăng trưởng của bé theo chuẩn WHO | NutriAZ`
4. Nên chọn bố cục **có sẵn đầu trang và chân trang** của website, để trang mới giống các trang khác.

## Bước 2 – Nhúng công cụ

1. Trong trang vừa tạo, kéo phần tử **HTML** (có nơi gọi là "Mã nhúng", "Embed", "Custom code") vào giữa trang.
2. Đặt phần tử đó **rộng hết khung** (100%), bỏ chiều cao cố định nếu có.
3. Mở file `nhung/ma-nhung.html`, copy **toàn bộ** nội dung và dán vào phần tử HTML.
4. Bấm **Lưu** → **Xuất bản**.

## Bước 3 – Kiểm tra

1. Mở https://nutriaz.edu.vn/kiem-tra-tang-truong trên điện thoại.
2. Nhập thử một bé, bấm **Kiểm tra ngay**: khung phải tự dài ra, không có thanh cuộn thứ hai.
3. Bấm **Đăng ký khoá học** → phải mở trang khoá học trên chính nutriaz.edu.vn.

## Bước 4 – Đưa trang vào menu (khuyến nghị)

Thêm mục menu **"Kiểm tra tăng trưởng"** trỏ tới `/kiem-tra-tang-truong` để mẹ dễ tìm.

## Nếu gặp vấn đề

- **Khung bị cắt hoặc có khoảng trắng lớn**: Pancake có thể đã xoá phần `<script>` trong mã.
  Khi đó khung giữ chiều cao cố định 2800px. Hãy tìm phần tử "Custom code" cho phép chạy script,
  hoặc nhờ hỗ trợ Pancake bật mã script cho trang này.
- **Không có phần tử HTML / Mã nhúng**: hỏi hỗ trợ Pancake cách "nhúng iframe" vào trang.
- **Cách dự phòng**: đặt menu trỏ thẳng tới https://nutriazkhoahocxanh-star.github.io/kiem-tra-tang-truong/

## Khi sửa công cụ

Mọi thay đổi đẩy lên GitHub (`git push`) sẽ tự cập nhật trên nutriaz.edu.vn sau khoảng 1 phút,
không cần sửa lại Pancake.
