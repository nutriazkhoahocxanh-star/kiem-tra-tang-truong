# Kiểm tra tăng trưởng của bé (chuẩn WHO) – NutriAZ Việt Nam

Công cụ tham khảo giúp phụ huynh kiểm tra cân nặng, chiều cao, BMI của trẻ 0–19 tuổi
theo WHO Child Growth Standards (0–5 tuổi) và WHO Growth Reference 2007 (5–19 tuổi),
tính Z-score bằng phương pháp LMS. Kết quả dẫn sang khoá học / tư vấn của NutriAZ (phễu).
**Không thay thế tư vấn của bác sĩ.**

## Chạy trên máy

```bash
npm start      # mở http://localhost:8080
npm test       # kiểm thử với bảng WHO và bộ dữ liệu mẫu có đáp án của WHO
```

## Cấu trúc

- `index.html`, `src/style.css`: giao diện
- `src/app.js`: xử lý biểu mẫu, kết quả, phễu. **Đổi link khoá học / giá / trang liên hệ ở `CONFIG` đầu file.**
- `src/chart.js`: biểu đồ tăng trưởng (SVG)
- `src/growth.js`: tính Z-score (LMS) và phân loại theo ngưỡng WHO
- `src/who-data.js`: bảng LMS (tự sinh bằng `npm run build-data` từ `data-raw/`)
- `data-raw/`: bảng LMS gốc từ gói R chính thức của WHO (anthro, anthroplus)
- `brand/`: logo NutriAZ
- `phac-thao/`: bản phác thảo đã duyệt
