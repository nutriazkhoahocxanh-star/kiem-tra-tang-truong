# Kiểm tra tăng trưởng của trẻ (chuẩn WHO)

Công cụ tham khảo giúp phụ huynh kiểm tra cân nặng, chiều cao, BMI của trẻ 0–19 tuổi
theo WHO Child Growth Standards (0–5 tuổi) và WHO Growth Reference 2007 (5–19 tuổi),
tính Z-score bằng phương pháp LMS. **Không thay thế tư vấn của bác sĩ.**

- `data-raw/`: bảng LMS gốc từ gói R chính thức của WHO (anthro, anthroplus)
- `src/growth.js`: tính Z-score và phân loại
- `npm run build-data`: tạo lại `src/who-data.js` từ `data-raw/`
- `npm test`: kiểm thử với bảng WHO và bộ dữ liệu mẫu có đáp án của WHO
