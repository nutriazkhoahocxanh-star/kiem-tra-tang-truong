// In bảng chiều cao, cân nặng chuẩn WHO (−2SD, trung bình, +2SD) để dùng cho bài viết SEO.
// Chạy: node scripts/bang-chuan.mjs > nhung/seo/bang-chuan.json
import { lmsAt, valueAtZ, DAYS_PER_MONTH } from "../src/growth.js";

const r1 = (x) => Math.round(x * 10) / 10;
const point = (group, key, sex, age) => {
  const p = lmsAt(group, key, sex, age);
  return [-2, 0, 2].map((z) => r1(valueAtZ(z, p.l, p.m, p.s)));
};

// Dưới 5 tuổi: tra theo ngày; riêng chiều dài lúc 24 tháng lấy ngày 730 (vẫn đo nằm) cho khớp bảng 0–2 tuổi của WHO
const dayOf = (m) => (m === 24 ? 730 : Math.round(m * DAYS_PER_MONTH));
const under5Months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60];
const over5Years = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const out = {};
for (const [sex, name] of [[1, "trai"], [2, "gai"]]) {
  out[name] = {
    duoi5: under5Months.map((m) => ({
      thang: m,
      canNang: point("under5", "wfa", sex, Math.round(m * DAYS_PER_MONTH)),
      chieuCao: point("under5", "hfa", sex, dayOf(m)),
    })),
    tren5: over5Years.map((y) => ({
      tuoi: y,
      // WHO 2007: cân nặng theo tuổi chỉ đến 10 tuổi; tuổi 5 dùng bảng 2007 tại 61 tháng để khỏi trùng bảng 0–5
      canNang: y <= 10 ? point("over5", "wfa", sex, y === 5 ? 61 : y * 12) : null,
      chieuCao: point("over5", "hfa", sex, y === 5 ? 61 : y * 12),
    })),
  };
}
console.log(JSON.stringify(out, null, 1));
