import { assess, ageInDays, INDICATORS } from "./growth.js";
import { drawChart } from "./chart.js";

// ===== Cấu hình phễu — sửa ở đây khi đổi khoá học / giá / trang liên hệ =====
const CONFIG = {
  courseUrl: "https://www.nutriaz.edu.vn/products/tron-bo-kien-thuc-an-dam-tu-nen-tang-den-thuc-hanh",
  contactUrl: "https://www.nutriaz.edu.vn/lien-he",
  courseName: "Khoá học ăn dặm toàn diện 3 Dễ",
  coursePrice: "800.000 ₫",
  utmSource: "cong-cu-tang-truong",
};

const $ = (id) => document.getElementById(id);
const state = { sex: 1, mode: "date", measureTouched: false, result: null, chartKey: "wfa" };

const fmt = (n, d = 1) => n.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtZ = (z) => {
  const r = Math.round(z * 10) / 10;
  return (r > 0 ? "+" : r < 0 ? "−" : "") + fmt(Math.abs(r), 1);
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const parseNum = (s) => Number(String(s).trim().replace(",", "."));

function withUtm(url, campaign) {
  const u = new URL(url);
  u.searchParams.set("utm_source", CONFIG.utmSource);
  u.searchParams.set("utm_medium", "website");
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

// ----- Điều khiển biểu mẫu -----
function selectButton(group, attr, value) {
  for (const b of group.querySelectorAll("button")) {
    const on = b.dataset[attr] === String(value);
    b.classList.toggle("on", on);
    b.setAttribute(b.getAttribute("role") === "tab" ? "aria-selected" : "aria-checked", on);
  }
}

document.querySelector(".toggle").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-sex]");
  if (!b) return;
  state.sex = Number(b.dataset.sex);
  selectButton(e.currentTarget, "sex", state.sex);
});

document.querySelector(".tabs[aria-label='Cách nhập tuổi']").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-mode]");
  if (!b) return;
  state.mode = b.dataset.mode;
  selectButton(e.currentTarget, "mode", state.mode);
  $("mode-date").hidden = state.mode !== "date";
  $("mode-age").hidden = state.mode !== "age";
  updateMeasureDefault();
});

// Đọc tuổi từ biểu mẫu. Trả về { ageDays } hoặc { ageMonths } kèm chữ mô tả tuổi.
function readAge() {
  if (state.mode === "date") {
    const birth = $("birth").value, measured = $("measured").value;
    if (!birth || !measured) return null;
    const days = ageInDays(birth, measured);
    return { ageDays: days, months: days / 30.4375, text: describeAge(birth, measured) };
  }
  const y = $("years").value === "" ? NaN : Number($("years").value);
  const m = $("months").value === "" ? 0 : Number($("months").value);
  if (Number.isNaN(y) && $("months").value === "") return null;
  const total = (Number.isNaN(y) ? 0 : y) * 12 + m;
  const yy = Math.floor(total / 12), mm = total % 12;
  const text = [yy && `${yy} tuổi`, mm && `${mm} tháng`].filter(Boolean).join(" ") || "Sơ sinh";
  return { ageMonths: total, months: total, text };
}

function describeAge(birth, measured) {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [my, mm, md] = measured.split("-").map(Number);
  let months = (my - by) * 12 + (mm - bm);
  let days = md - bd;
  if (days < 0) {
    months -= 1;
    days += new Date(my, mm - 1, 0).getDate(); // số ngày của tháng trước
  }
  if (months < 0) return "";
  const y = Math.floor(months / 12), m = months % 12;
  return [y && `${y} tuổi`, m && `${m} tháng`, days && `${days} ngày`].filter(Boolean).join(" ") || "Mới sinh";
}

// Dưới 2 tuổi mặc định đo nằm, từ 2 tuổi đo đứng; chỉ hỏi cách đo khi bé dưới 5 tuổi.
function updateMeasureDefault() {
  const age = readAge();
  $("measure-box").hidden = !!age && age.months >= 60;
  if (!age || state.measureTouched) return;
  const value = age.months < 24 ? "lying" : "standing";
  document.querySelector(`input[name=measure][value=${value}]`).checked = true;
}
for (const id of ["birth", "measured", "years", "months"]) $(id).addEventListener("input", updateMeasureDefault);
for (const r of document.querySelectorAll("input[name=measure]")) r.addEventListener("change", () => (state.measureTouched = true));

function showError(msg, fieldIds = []) {
  for (const f of document.querySelectorAll(".field")) f.classList.remove("invalid");
  for (const id of fieldIds) $(id).closest(".field").classList.add("invalid");
  $("error").textContent = msg;
  $("error").hidden = !msg;
}

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const age = readAge();
  if (!age) {
    return showError("Vui lòng nhập ngày sinh của bé (hoặc tuổi của bé).", state.mode === "date" ? ["birth"] : ["years", "months"]);
  }
  if (state.mode === "date" && $("measured").value > todayStr()) return showError("Ngày đo không được sau hôm nay.", ["measured"]);
  if (age.months < 0) return showError("Ngày sinh phải trước ngày đo.", ["birth"]);
  if (state.mode === "age" && Number($("months").value) > 11) return showError("Số tháng chỉ từ 0 đến 11.", ["months"]);
  const height = parseNum($("height").value), weight = parseNum($("weight").value);
  if (!(height >= 35 && height <= 220)) return showError("Chiều cao cần nằm trong khoảng 35–220 cm.", ["height"]);
  if (!(weight >= 1 && weight <= 200)) return showError("Cân nặng cần nằm trong khoảng 1–200 kg.", ["weight"]);

  try {
    const lying = document.querySelector("input[name=measure]:checked").value === "lying";
    const input = { sex: state.sex, weight, height, lying: age.months < 60 ? lying : undefined };
    if (age.ageDays !== undefined) input.ageDays = age.ageDays;
    else input.ageMonths = age.ageMonths;
    const result = assess(input);
    showError("");
    renderResult(result, age.text);
  } catch (err) {
    showError(err.message);
  }
});

$("again").addEventListener("click", () => {
  $("result").hidden = true;
  $("funnel-top").hidden = false;
  $("form").scrollIntoView({ behavior: "smooth" });
});

// ----- Hiển thị kết quả -----
function summarize(r) {
  const ind = r.indicators;
  const issues = [];
  if (ind.wfa.level === "danger" || ind.wfa.level === "warn") issues.push(ind.wfa.z < 0 ? "nhẹ cân" : "cân nặng cao so với tuổi");
  if (ind.hfa.z !== null && ind.hfa.z < -2) issues.push("thấp còi");
  if (ind.bfa.z < -2) issues.push(r.group === "under5" ? "gầy còm" : "gầy");
  if (ind.bfa.level !== "ok" && ind.bfa.z > 1) issues.push(ind.bfa.label.toLowerCase());
  // "cân nặng cao" trùng ý với thừa cân/béo phì thì bỏ bớt
  if (issues.length > 1 && issues.includes("cân nặng cao so với tuổi")) issues.splice(issues.indexOf("cân nặng cao so với tuổi"), 1);

  const low = ind.wfa.z < -2 || ind.hfa.z < -2 || ind.bfa.z < -2;
  const high = ind.bfa.z > 1 || ind.wfa.z > 2;
  const severe = Object.values(ind).some((i) => i.level === "danger");
  const watch = ind.bfa.level === "info" && issues.length === 1; // chỉ "có nguy cơ thừa cân"

  let title, text;
  if (r.warnings.length) {
    title = "Mẹ kiểm tra lại số liệu giúp nhé";
    text = "Một số chỉ số lệch quá xa so với chuẩn, thường do nhập nhầm chiều cao, cân nặng hoặc ngày sinh. Nếu số liệu đúng, mẹ nên đưa bé đi khám bác sĩ.";
  } else if (!issues.length) {
    title = "Bé đang phát triển bình thường 🎉";
    text = "Cân nặng và chiều cao của bé nằm trong khoảng chuẩn của WHO. Mẹ tiếp tục duy trì chế độ ăn và theo dõi định kỳ nhé!";
  } else if (watch) {
    title = "Bé phát triển bình thường, cần theo dõi cân nặng";
    text = "Cân nặng của bé hơi cao so với chiều cao. Mẹ nên cân đo lại sau 1–2 tháng và cân đối khẩu phần.";
  } else {
    title = "Bé đang " + issues.join(" và ").replace(/, ([^,]*)$/, " và $1");
    text = severe
      ? "Một số chỉ số của bé lệch nhiều so với chuẩn WHO. Mẹ nên đưa bé đi khám bác sĩ dinh dưỡng sớm."
      : "Mẹ nên xem lại chế độ ăn của bé và hỏi ý kiến chuyên gia dinh dưỡng.";
  }
  return { title, text, status: !issues.length ? "normal" : low ? "low" : high ? "high" : "normal" };
}

function renderResult(r, ageText) {
  state.result = r;
  const sum = summarize(r);
  $("summary").innerHTML = `
    <small>${r.sex === 1 ? "Bé trai" : "Bé gái"} · ${ageText}</small>
    <h2>${sum.title}</h2>
    <p>${sum.text}</p>
    <div class="stats">
      <div><b>${fmt(r.height)}</b>cm</div>
      <div><b>${fmt(r.weight)}</b>kg</div>
      <div><b>${fmt(r.bmi)}</b>BMI</div>
    </div>`;

  $("warnings").innerHTML = r.warnings.map((w) => `<div class="warning">⚠️ ${w}</div>`).join("");

  const units = { wfa: "kg", hfa: "cm", bfa: "" };
  $("cards").innerHTML = Object.keys(INDICATORS).map((key) => {
    const ind = r.indicators[key];
    if (ind.z === null) {
      return `<div class="card"><div class="head"><h3>${INDICATORS[key]}</h3><span class="pill info">${ind.label}</span></div><p>${ind.note}</p></div>`;
    }
    const pos = Math.min(Math.max((ind.z + 4) / 8, 0.01), 0.99) * 100;
    const range = `Bình thường: ${fmt(ind.range[0])} – ${fmt(ind.range[1])}${units[key] ? " " + units[key] : ""}`;
    return `<div class="card">
      <div class="head"><h3>${INDICATORS[key]}</h3><span class="pill ${ind.level}">${ind.label}</span></div>
      <div class="bar"><i style="left:${pos}%"></i></div>
      <div class="scale"><span style="left:12.5%">−3</span><span style="left:25%">−2</span><span style="left:50%">0</span><span style="left:75%">+2</span><span style="left:87.5%">+3</span></div>
      <p>Z-score ${fmtZ(ind.z)} · ${ind.note} ${range}</p>
    </div>`;
  }).join("");

  // Biểu đồ: trên 10 tuổi không có cân nặng theo tuổi
  const wfaTab = document.querySelector("#chart-tabs [data-key=wfa]");
  wfaTab.disabled = r.indicators.wfa.z === null;
  if (wfaTab.disabled && state.chartKey === "wfa") state.chartKey = "bfa";
  renderChart();

  renderFunnel(r, sum.status);
  $("result").hidden = false;
  $("funnel-top").hidden = true;
  $("result").scrollIntoView({ behavior: "smooth" });
}

function renderChart() {
  const r = state.result;
  selectButton($("chart-tabs"), "key", state.chartKey);
  const value = state.chartKey === "wfa" ? r.weight : state.chartKey === "hfa" ? r.height : r.bmi;
  drawChart($("chart"), { group: r.group, key: state.chartKey, sex: r.sex, ageMonths: r.ageMonths, value });
}

$("chart-tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-key]");
  if (!b || b.disabled) return;
  state.chartKey = b.dataset.key;
  renderChart();
});

// ----- Phễu: lời mời thay đổi theo tuổi và kết quả -----
function renderFunnel(r, status) {
  const campaign = `ket-qua-${status === "low" ? "cham-tang-truong" : status === "high" ? "thua-can" : "binh-thuong"}`;
  const course = withUtm(CONFIG.courseUrl, campaign);
  const contact = withUtm(CONFIG.contactUrl, campaign);
  let html;

  if (r.ageMonths < 24) {
    const title = r.ageMonths < 4
      ? "Chuẩn bị ăn dặm đúng ngay từ bây giờ"
      : status === "low"
        ? "Bé chậm tăng trưởng thường bắt nguồn từ ăn dặm chưa đúng cách"
        : status === "high"
          ? "Ăn dặm đúng cách giúp bé tăng trưởng cân đối"
          : "Giữ đà tăng trưởng tốt với ăn dặm khoa học";
    html = `
      <span class="badge">GỢI Ý CHO MẸ</span>
      <h2>${title}</h2>
      <p>${CONFIG.courseName} giúp mẹ:</p>
      <ul>
        <li>Xây lịch ăn – sữa – ngủ, khẩu phần theo tháng tuổi</li>
        <li>${status === "high" ? "Cân đối khẩu phần, tránh cho bé ăn quá nhiều" : "Tìm đúng nguyên nhân biếng ăn, chậm tăng cân"}</li>
        <li>50+ video, có đội ngũ chuyên môn đồng hành</li>
      </ul>
      <div class="price">${CONFIG.coursePrice}</div>
      <a class="btn gold" href="${course}" target="_top">ĐĂNG KÝ KHOÁ HỌC ⮕</a>
      <a class="link" href="${contact}" target="_top">Nhận tư vấn miễn phí</a>`;
  } else {
    html = `
      <span class="badge">GỢI Ý CHO MẸ</span>
      <h2>${status === "normal" ? "Đồng hành cùng con trên hành trình vươn tầm" : "Bé cần một lộ trình dinh dưỡng phù hợp"}</h2>
      <p>Để lại thông tin, chuyên gia dinh dưỡng NutriAZ sẽ tư vấn chế độ ăn phù hợp với tình trạng của bé.</p>
      <a class="btn gold" href="${contact}" target="_top">NHẬN TƯ VẤN MIỄN PHÍ ⮕</a>
      <a class="link" href="${course}" target="_top">Xem ${CONFIG.courseName} (cho bé 4–12 tháng)</a>`;
  }
  $("funnel-result").innerHTML = html;
}

// ----- Khởi tạo -----
$("measured").value = todayStr();
$("measured").max = todayStr();
$("birth").max = todayStr();
for (const a of document.querySelectorAll("a[data-link=course]")) a.href = withUtm(CONFIG.courseUrl, a.dataset.campaign);

// Khi trang được nhúng (iframe) vào website khác, báo chiều cao để khung tự giãn.
if (window.parent !== window) {
  new ResizeObserver(() => {
    window.parent.postMessage({ type: "nutriaz-growth-height", height: document.documentElement.scrollHeight }, "*");
  }).observe(document.body);
}
