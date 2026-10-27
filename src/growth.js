// Tính Z-score theo phương pháp LMS của WHO và phân loại tình trạng dinh dưỡng.
// Thuật toán bám sát mã nguồn chính thức của WHO (gói R "anthro" cho 0–5 tuổi, "anthroplus" cho 5–19 tuổi).
import WHO from "./who-data.js";

export const DAYS_PER_MONTH = 30.4375;
const MAX_MONTHS = 229; // WHO 2007 áp dụng đến dưới 229 tháng (19 tuổi)
const WFA_MAX_MONTHS_OVER5 = 121; // cân nặng theo tuổi chỉ có đến 10 tuổi

export const INDICATORS = {
  wfa: "Cân nặng theo tuổi",
  hfa: "Chiều cao theo tuổi",
  bfa: "BMI theo tuổi",
};

// Số ngày giữa ngày sinh và ngày đo (chuỗi "YYYY-MM-DD").
export function ageInDays(birthDate, measureDate) {
  const toUtc = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(measureDate) - toUtc(birthDate)) / 86400000);
}

export function computeBmi(weightKg, heightCm) {
  return weightKg / (heightCm / 100) ** 2;
}

// Z-score LMS cơ bản.
export function zscore(y, l, m, s) {
  if (l === 0) return Math.log(y / m) / s;
  return ((y / m) ** l - 1) / (s * l);
}

// Giá trị đo tương ứng với một Z-score (dùng để vẽ đường chuẩn).
export function valueAtZ(z, l, m, s) {
  if (l === 0) return m * Math.exp(s * z);
  return m * (1 + l * s * z) ** (1 / l);
}

// Z-score "điều chỉnh" của WHO cho cân nặng và BMI: ngoài khoảng ±3 thì ngoại suy tuyến tính,
// vì phân phối lệch làm công thức LMS kém tin cậy ở hai đầu.
export function zscoreAdjusted(y, l, m, s) {
  const z = zscore(y, l, m, s);
  if (z > 3) {
    const sd3 = valueAtZ(3, l, m, s);
    return 3 + (y - sd3) / (sd3 - valueAtZ(2, l, m, s));
  }
  if (z < -3) {
    const sd3 = valueAtZ(-3, l, m, s);
    return -3 + (y - sd3) / (valueAtZ(-2, l, m, s) - sd3);
  }
  return z;
}

// Lấy bộ [L, M, S] tại một tuổi. Dưới 5 tuổi: tra theo ngày (làm tròn).
// Từ 5 tuổi: nội suy tuyến tính giữa hai tháng liền kề, như anthroplus.
export function lmsAt(group, key, sex, age) {
  const table = WHO[group][key][sex];
  if (group === "under5") {
    const row = table.rows[Math.floor(age + 0.5) - table.start];
    return row ? { l: row[0], m: row[1], s: row[2] } : null;
  }
  const lo = Math.trunc(age);
  const a = table.rows[lo - table.start];
  if (!a) return null;
  const frac = age - lo;
  const b = frac > 0 ? table.rows[lo + 1 - table.start] : a;
  if (!b) return null;
  const mix = (i) => a[i] + frac * (b[i] - a[i]);
  return { l: mix(0), m: mix(1), s: mix(2) };
}

const round2 = (x) => Math.round(x * 100) / 100;

// Ngưỡng cờ "giá trị bất thường" của WHO — thường do nhập sai số liệu.
const FLAGS = {
  wfa: (z) => z < -6 || z > 5,
  hfa: (z) => Math.abs(z) > 6,
  bfa: (z) => Math.abs(z) > 5,
};

/**
 * Đánh giá tăng trưởng.
 * @param {object} p
 * @param {1|2} p.sex 1 = nam, 2 = nữ
 * @param {number} [p.ageDays] tuổi tính bằng ngày (hoặc truyền ageMonths)
 * @param {number} [p.ageMonths] tuổi tính bằng tháng (có thể lẻ)
 * @param {number} p.weight cân nặng (kg)
 * @param {number} p.height chiều cao/chiều dài (cm)
 * @param {boolean} [p.lying] trẻ được đo nằm? Mặc định: nằm nếu dưới 2 tuổi, đứng nếu từ 2 tuổi.
 */
export function assess({ sex, ageDays, ageMonths, weight, height, lying }) {
  if (sex !== 1 && sex !== 2) throw new Error("Vui lòng chọn giới tính.");
  if (ageDays === undefined) ageDays = ageMonths * DAYS_PER_MONTH;
  else ageMonths = ageDays / DAYS_PER_MONTH;
  if (!(ageDays >= 0)) throw new Error("Ngày đo phải sau ngày sinh.");
  if (ageMonths >= MAX_MONTHS) throw new Error("Công cụ chỉ áp dụng cho trẻ dưới 19 tuổi.");
  if (!(weight > 0) || !(height > 0)) throw new Error("Vui lòng nhập cân nặng và chiều cao hợp lệ.");

  const group = ageMonths < 60 ? "under5" : "over5";
  const bmi = computeBmi(weight, height);
  const indicators = {};

  if (group === "under5") {
    const day = Math.floor(ageDays + 0.5);
    // Chuẩn WHO dùng chiều dài nằm khi dưới 2 tuổi và chiều cao đứng từ 2 tuổi;
    // đo đứng thường thấp hơn đo nằm khoảng 0,7 cm.
    const isLying = lying ?? day < 731;
    let h = height;
    if (day < 731 && !isLying) h += 0.7;
    if (day >= 731 && isLying) h -= 0.7;
    const bmiForZ = computeBmi(weight, h);
    const get = (key) => lmsAt(group, key, sex, day);
    indicators.wfa = { value: weight, z: zscoreAdjusted(weight, ...lms(get("wfa"))), range: normalRange(get("wfa")) };
    indicators.hfa = { value: height, z: zscore(h, ...lms(get("hfa"))), range: normalRange(get("hfa")) };
    indicators.bfa = { value: bmi, z: zscoreAdjusted(bmiForZ, ...lms(get("bfa"))), range: normalRange(get("bfa")) };
  } else {
    const get = (key) => lmsAt(group, key, sex, ageMonths);
    if (ageMonths < WFA_MAX_MONTHS_OVER5) {
      indicators.wfa = { value: weight, z: zscoreAdjusted(weight, ...lms(get("wfa"))), range: normalRange(get("wfa")) };
    }
    indicators.hfa = { value: height, z: zscore(height, ...lms(get("hfa"))), range: normalRange(get("hfa")) };
    indicators.bfa = { value: bmi, z: zscoreAdjusted(bmi, ...lms(get("bfa"))), range: normalRange(get("bfa")) };
  }

  const warnings = [];
  for (const [key, ind] of Object.entries(indicators)) {
    ind.z = round2(ind.z);
    Object.assign(ind, classify(key, ind.z, group));
    if (FLAGS[key](ind.z)) {
      warnings.push(`${INDICATORS[key]} có giá trị rất bất thường (Z = ${String(ind.z).replace(".", ",")}). Vui lòng kiểm tra lại số liệu đã nhập.`);
    }
  }
  if (group === "over5" && !indicators.wfa) {
    indicators.wfa = {
      z: null,
      label: "Không áp dụng",
      level: "info",
      note: "WHO không dùng cân nặng theo tuổi cho trẻ trên 10 tuổi; hãy xem BMI theo tuổi.",
    };
  }

  return { sex, ageDays, ageMonths, group, weight, height, bmi, indicators, warnings };
}

const lms = (p) => [p.l, p.m, p.s];

// Khoảng bình thường theo WHO: từ −2 đến +2 độ lệch chuẩn.
const normalRange = (p) => [valueAtZ(-2, p.l, p.m, p.s), valueAtZ(2, p.l, p.m, p.s)];

const BFA_LOW_NOTE = "Cân nặng so với chiều cao nằm trong ngưỡng tiêu chuẩn, tuy nhiên bé hơi gầy (cận dưới). Mẹ nên chú ý bữa ăn đủ năng lượng để bé tăng cân đều.";

// Phân loại theo ngưỡng Z-score của WHO. Riêng mức "cận dưới" (−2 ≤ Z < −1) là mức theo dõi,
// vẫn trong ngưỡng chuẩn nhưng nên ưu tiên cải thiện.
export function classify(key, z, group) {
  const r = (label, level, note = "") => ({ label, level, note });
  if (key === "wfa") {
    if (z < -3) return r("Suy dinh dưỡng nhẹ cân nặng", "danger", "Cân nặng thấp hơn nhiều so với trẻ cùng tuổi.");
    if (z < -2) return r("Suy dinh dưỡng nhẹ cân", "warn", "Cân nặng thấp so với trẻ cùng tuổi.");
    if (z > 2) return r("Cân nặng cao so với tuổi", "warn", "Nên xem thêm chỉ số BMI theo tuổi để đánh giá thừa cân.");
    if (z < -1) return r("Bình thường – cận dưới", "watch", "Cân nặng nằm trong ngưỡng tiêu chuẩn, tuy nhiên đang ở cận dưới. Mẹ nên ưu tiên cải thiện cân nặng cho bé: bữa ăn đủ năng lượng và chất đạm, theo dõi cân nặng hằng tháng.");
    return r("Bình thường", "ok", "Cân nặng nằm trong khoảng bình thường của trẻ cùng tuổi.");
  }
  if (key === "hfa") {
    if (z < -3) return r("Thấp còi nặng", "danger", "Chiều cao thấp hơn nhiều so với trẻ cùng tuổi.");
    if (z < -2) return r("Thấp còi", "warn", "Chiều cao thấp so với trẻ cùng tuổi (suy dinh dưỡng thể thấp còi).");
    if (z > 3) return r("Rất cao so với tuổi", "info", "Thường không đáng lo; nếu cha mẹ không cao, nên hỏi ý kiến bác sĩ.");
    if (z < -1) return r("Bình thường – cận dưới", "watch", "Chiều cao nằm trong ngưỡng tiêu chuẩn, tuy nhiên đang ở cận dưới. Mẹ cần ưu tiên cải thiện chiều cao cho bé: đủ chất đạm, canxi, vitamin D, ngủ đủ giấc và vận động hằng ngày.");
    return r("Bình thường", "ok", "Chiều cao nằm trong khoảng bình thường của trẻ cùng tuổi.");
  }
  // BMI theo tuổi
  if (group === "under5") {
    if (z < -3) return r("Gầy còm nặng", "danger", "Trẻ rất gầy so với chiều cao (suy dinh dưỡng thể gầy còm nặng).");
    if (z < -2) return r("Gầy còm", "warn", "Trẻ gầy so với chiều cao (suy dinh dưỡng thể gầy còm).");
    if (z > 3) return r("Béo phì", "danger", "Cân nặng quá cao so với chiều cao.");
    if (z > 2) return r("Thừa cân", "warn", "Cân nặng cao so với chiều cao.");
    if (z > 1) return r("Có nguy cơ thừa cân", "info", "Cân nặng hơi cao so với chiều cao; nên theo dõi thêm.");
    if (z < -1) return r("Bình thường – cận dưới", "watch", BFA_LOW_NOTE);
    return r("Bình thường", "ok", "Cân đối giữa cân nặng và chiều cao.");
  }
  if (z < -3) return r("Gầy nặng", "danger", "Trẻ rất gầy so với tuổi (suy dinh dưỡng thể gầy còm nặng).");
  if (z < -2) return r("Gầy", "warn", "Trẻ gầy so với tuổi (suy dinh dưỡng thể gầy còm).");
  if (z > 2) return r("Béo phì", "danger", "BMI quá cao so với trẻ cùng tuổi.");
  if (z > 1) return r("Thừa cân", "warn", "BMI cao so với trẻ cùng tuổi.");
  if (z < -1) return r("Bình thường – cận dưới", "watch", BFA_LOW_NOTE);
  return r("Bình thường", "ok", "Cân đối giữa cân nặng và chiều cao.");
}

// Điểm của các đường chuẩn (theo tháng tuổi) để vẽ biểu đồ.
export function curves(group, key, sex, zs = [-3, -2, 0, 2, 3]) {
  const table = WHO[group][key][sex];
  const step = group === "under5" ? 7 : 1; // dưới 5 tuổi: mỗi tuần một điểm
  const ages = [];
  for (let i = 0; i < table.rows.length; i += step) ages.push(table.start + i);
  if (group === "under5") {
    // giữ đúng chỗ "gãy" khi chuyển từ đo nằm sang đo đứng (730 → 731 ngày)
    ages.push(730, 731, 1826);
    ages.sort((a, b) => a - b);
  }
  const last = group === "under5" ? 1826 : table.start + table.rows.length - 1;
  const uniq = [...new Set(ages)].filter((a) => a <= last);
  return zs.map((z) => ({
    z,
    points: uniq.map((age) => {
      const [l, m, s] = table.rows[age - table.start];
      const months = group === "under5" ? age / DAYS_PER_MONTH : age;
      return [months, valueAtZ(z, l, m, s)];
    }),
  }));
}
