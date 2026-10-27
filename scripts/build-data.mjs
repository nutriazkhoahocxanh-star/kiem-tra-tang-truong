// Chuyển các bảng LMS gốc của WHO (data-raw/*.txt) thành file JS gọn cho trình duyệt.
// Chạy: npm run build-data
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);

// tên chỉ số -> [file 0–5 tuổi (theo ngày), file 5–19 tuổi (theo tháng)]
const sources = {
  wfa: ["weianthro.txt", "wfawho2007.txt"], // cân nặng theo tuổi
  hfa: ["lenanthro.txt", "hfawho2007.txt"], // chiều dài/chiều cao theo tuổi
  bfa: ["bmianthro.txt", "bfawho2007.txt"], // BMI theo tuổi
};

function readTable(file) {
  const lines = readFileSync(new URL(`data-raw/${file}`, root), "utf8").trim().split(/\r?\n/);
  const out = { 1: { start: null, rows: [] }, 2: { start: null, rows: [] } };
  for (const line of lines.slice(1)) {
    const [sex, age, l, m, s] = line.split("\t");
    const t = out[sex];
    if (t.start === null) t.start = Number(age);
    if (Number(age) !== t.start + t.rows.length) throw new Error(`${file}: tuổi không liên tục ở ${age}`);
    t.rows.push([Number(l), Number(m), Number(s)]);
  }
  return out;
}

const data = { under5: {}, over5: {} };
for (const [key, [f05, f519]] of Object.entries(sources)) {
  data.under5[key] = readTable(f05);
  data.over5[key] = readTable(f519);
}

const header =
  "// File tự sinh bởi scripts/build-data.mjs — không sửa tay.\n" +
  "// Nguồn: WHO Child Growth Standards (2006, theo ngày tuổi) và WHO Growth Reference 2007 (theo tháng tuổi),\n" +
  "// lấy từ các gói R chính thức của WHO: github.com/WorldHealthOrganization/anthro và /anthroplus.\n" +
  "// Mỗi dòng là [L, M, S]; start là tuổi của dòng đầu tiên. Giới tính: 1 = nam, 2 = nữ.\n";
writeFileSync(new URL("src/who-data.js", root), header + "export default " + JSON.stringify(data) + ";\n");
console.log("Đã tạo src/who-data.js");
