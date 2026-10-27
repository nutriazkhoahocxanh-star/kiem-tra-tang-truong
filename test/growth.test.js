// Chạy: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assess, ageInDays, lmsAt, valueAtZ, DAYS_PER_MONTH } from "../src/growth.js";

// Giá trị trong bảng Z-score in sẵn của WHO Child Growth Standards (làm tròn 0,1).
// [chỉ số, giới, tháng tuổi, { z: giá trị }]
const WHO_TABLES = [
  ["wfa", 1, 0, { "-3": 2.1, "-2": 2.5, 0: 3.3, 2: 4.4, 3: 5.0 }],
  ["wfa", 1, 12, { "-3": 6.9, "-2": 7.7, 0: 9.6, 2: 12.0, 3: 13.3 }],
  ["wfa", 1, 24, { "-2": 9.7, 0: 12.2, 2: 15.3 }],
  ["wfa", 1, 60, { "-2": 14.1, 0: 18.3, 2: 24.2 }],
  ["wfa", 2, 0, { "-2": 2.4, 0: 3.2, 2: 4.2 }],
  ["wfa", 2, 12, { "-2": 7.0, 0: 8.9, 2: 11.5 }],
  ["hfa", 1, 0, { "-2": 46.1, 0: 49.9, 2: 53.7 }],
  ["hfa", 1, 12, { "-2": 71.0, 0: 75.7, 2: 80.5 }],
  ["hfa", 2, 0, { "-2": 45.4, 0: 49.1, 2: 52.9 }],
];

for (const [key, sex, month, expected] of WHO_TABLES) {
  test(`Bảng WHO 0–5 tuổi: ${key}, giới ${sex}, ${month} tháng`, () => {
    const p = lmsAt("under5", key, sex, Math.round(month * DAYS_PER_MONTH));
    for (const [z, v] of Object.entries(expected)) {
      assert.equal(Math.round(valueAtZ(Number(z), p.l, p.m, p.s) * 10) / 10, v, `z = ${z}`);
    }
  });
}

// Bộ dữ liệu mẫu của WHO kèm Z-score đáp án (gói R anthroplus, trẻ 5–19 tuổi).
test("Khớp Z-score đáp án của WHO cho trẻ 5–19 tuổi (survey_who2007)", () => {
  const lines = readFileSync(new URL("../data-raw/survey_who2007_z.csv", import.meta.url), "utf8").trim().split(/\r?\n/);
  const cols = lines[0].split(",").map((c) => c.replaceAll('"', ""));
  const num = (v) => (v === "" || v === "NA" ? null : Number(v));
  let checked = 0;
  for (const line of lines.slice(1)) {
    const r = Object.fromEntries(line.split(",").map((v, i) => [cols[i], v.replaceAll('"', "")]));
    const age = num(r["age.mo"]), w = num(r.weight), h = num(r.height);
    if (age === null || w === null || h === null || r.oedema === "y") continue;
    if (age < 60 || age >= 229) continue;
    const res = assess({ sex: Number(r.sex), ageMonths: age, weight: w, height: h });
    for (const key of ["hfa", "wfa", "bfa"]) {
      const want = num(r["z" + key]);
      if (want === null) continue;
      assert.ok(Math.abs(res.indicators[key].z - want) <= 0.011, `id ${r.id} ${key}: ${res.indicators[key].z} ≠ ${want}`);
      checked++;
    }
  }
  assert.ok(checked > 500, `chỉ kiểm được ${checked} giá trị`);
});

test("Tính tuổi theo ngày", () => {
  assert.equal(ageInDays("2024-01-01", "2025-01-01"), 366);
  assert.equal(ageInDays("2023-03-15", "2023-03-15"), 0);
});

test("Ví dụ: bé trai 12 tháng, cân nặng và chiều cao đúng trung vị → bình thường", () => {
  const r = assess({ sex: 1, ageMonths: 12, weight: 9.6, height: 75.7 });
  assert.equal(r.group, "under5");
  for (const key of ["wfa", "hfa", "bfa"]) assert.equal(r.indicators[key].label, "Bình thường");
  assert.ok(Math.abs(r.indicators.wfa.z) < 0.05);
});

test("Ví dụ: bé gái 2 tuổi nhẹ cân và thấp còi", () => {
  const r = assess({ sex: 2, ageDays: 731, weight: 7.8, height: 76 });
  assert.equal(r.indicators.wfa.label, "Suy dinh dưỡng nhẹ cân nặng");
  assert.equal(r.indicators.hfa.label, "Thấp còi nặng");
});

test("Ví dụ: bé trai 8 tuổi béo phì", () => {
  const r = assess({ sex: 1, ageMonths: 96, weight: 40, height: 128 });
  assert.equal(r.group, "over5");
  assert.ok(r.indicators.bfa.z > 2);
  assert.equal(r.indicators.bfa.label, "Béo phì");
});

test("Trẻ trên 10 tuổi: cân nặng theo tuổi không áp dụng", () => {
  const r = assess({ sex: 2, ageMonths: 150, weight: 40, height: 150 });
  assert.equal(r.indicators.wfa.z, null);
  assert.equal(r.indicators.wfa.label, "Không áp dụng");
});

test("Đo đứng khi dưới 2 tuổi được cộng 0,7 cm như WHO", () => {
  const lying = assess({ sex: 1, ageMonths: 12, weight: 9.6, height: 75.7, lying: true });
  const standing = assess({ sex: 1, ageMonths: 12, weight: 9.6, height: 75.0, lying: false });
  assert.equal(lying.indicators.hfa.z, standing.indicators.hfa.z);
});

test("Báo lỗi khi nhập sai", () => {
  assert.throws(() => assess({ sex: 1, ageMonths: 240, weight: 60, height: 170 }), /19 tuổi/);
  assert.throws(() => assess({ sex: 1, ageMonths: 12, weight: 0, height: 75 }), /hợp lệ/);
});
