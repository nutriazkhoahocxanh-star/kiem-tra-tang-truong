// Vẽ biểu đồ tăng trưởng bằng SVG thuần: các đường chuẩn −3, −2, trung bình, +2, +3 và điểm của bé.
import { curves } from "./growth.js";

const W = 340, H = 250;
const PAD = { left: 34, right: 26, top: 12, bottom: 34 };
const UNITS = { wfa: "kg", hfa: "cm", bfa: "BMI" };
const LINE = {
  "-3": { color: "#D64545", dash: "4 3", label: "−3" },
  "-2": { color: "#E08A1E", label: "−2" },
  "0": { color: "#2E9E6A", width: 2.5, label: "TB" },
  "2": { color: "#E08A1E", label: "+2" },
  "3": { color: "#D64545", dash: "4 3", label: "+3" },
};

const fmt = (n) => String(Math.round(n * 10) / 10).replace(".", ",");

function niceStep(range, target = 6) {
  const raw = range / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
}

/**
 * @param {SVGSVGElement} svg
 * @param {{group: string, key: string, sex: 1|2, ageMonths: number, value: number}} p
 */
export function drawChart(svg, { group, key, sex, ageMonths, value }) {
  const lines = curves(group, key, sex);
  const all = lines.flatMap((l) => l.points);
  const x0 = all[0][0];
  const x1 = Math.max(...all.map((p) => p[0]));
  let y0 = Math.min(...all.map((p) => p[1]), value);
  let y1 = Math.max(...all.map((p) => p[1]), value);
  const step = niceStep(y1 - y0);
  y0 = Math.floor(y0 / step) * step;
  y1 = Math.ceil(y1 / step) * step;

  const sx = (x) => PAD.left + ((x - x0) / (x1 - x0)) * (W - PAD.left - PAD.right);
  const sy = (y) => H - PAD.bottom - ((y - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);
  const path = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`).join("");

  let out = "";
  // Lưới và trục tung
  for (let y = y0; y <= y1 + 1e-9; y += step) {
    out += `<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${sy(y)}" y2="${sy(y)}" stroke="#EEE9F5"/>`;
    out += `<text x="${PAD.left - 4}" y="${sy(y) + 3}" font-size="9" fill="#6B6480" text-anchor="end">${fmt(y)}</text>`;
  }
  // Trục hoành: dưới 5 tuổi chia theo tháng, từ 5 tuổi chia theo năm
  const under5 = group === "under5";
  const xStep = under5 ? 6 : 12;
  for (let x = Math.ceil(x0 / xStep) * xStep; x <= x1 + 1e-9; x += xStep) {
    out += `<line x1="${sx(x)}" x2="${sx(x)}" y1="${PAD.top}" y2="${H - PAD.bottom}" stroke="#F4F1F9"/>`;
    out += `<text x="${sx(x)}" y="${H - PAD.bottom + 12}" font-size="9" fill="#6B6480" text-anchor="middle">${under5 ? x : x / 12}</text>`;
  }
  out += `<text x="${(PAD.left + W - PAD.right) / 2}" y="${H - 6}" font-size="10" fill="#6B6480" text-anchor="middle">${under5 ? "Tháng tuổi" : "Tuổi (năm)"}</text>`;
  out += `<text x="4" y="${PAD.top - 2}" font-size="9" fill="#6B6480">${UNITS[key]}</text>`;

  // Vùng bình thường (−2 đến +2)
  const lo = lines.find((l) => l.z === -2).points;
  const hi = lines.find((l) => l.z === 2).points;
  out += `<path d="${path(hi)}${path([...lo].reverse()).replace("M", "L")}Z" fill="#E3F4EB"/>`;

  for (const l of lines) {
    const s = LINE[l.z];
    out += `<path d="${path(l.points)}" fill="none" stroke="${s.color}" stroke-width="${s.width || 1.3}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""}/>`;
  }
  // Nhãn cuối đường: đẩy ra cho khỏi chồng nhau (từ dưới lên)
  let prevY = Infinity;
  for (const l of [...lines].sort((a, b) => a.z - b.z)) {
    const s = LINE[l.z];
    const last = l.points[l.points.length - 1];
    const y = Math.min(sy(last[1]) + 3, prevY - 10);
    prevY = y;
    out += `<text x="${sx(last[0]) + 3}" y="${y}" font-size="9" font-weight="700" fill="${s.color}">${s.label}</text>`;
  }

  // Điểm của bé
  const cx = sx(Math.min(Math.max(ageMonths, x0), x1));
  const cy = sy(value);
  const labelLeft = cx > W - 90;
  out += `<circle cx="${cx}" cy="${cy}" r="9" fill="#5E4193" opacity=".18"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="5.5" fill="#5E4193" stroke="#fff" stroke-width="2"/>`;
  out += `<text x="${cx + (labelLeft ? -10 : 10)}" y="${cy - 9}" font-size="10" font-weight="800" fill="#5E4193" stroke="#fff" stroke-width="3" paint-order="stroke" text-anchor="${labelLeft ? "end" : "start"}">Bé: ${fmt(value)} ${UNITS[key] === "BMI" ? "" : UNITS[key]}</text>`;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("aria-label", `Biểu đồ ${UNITS[key]} theo tuổi, giá trị của bé ${fmt(value)}`);
  svg.innerHTML = out;
}
