/* Utilidades generales del campus */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

export const uid = (p = "id") => p + "-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* PRNG determinístico (mulberry32) para datos de demo y portadas */
export function rng(seed) {
  let a = typeof seed === "number" ? seed : hashStr(String(seed));
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const slugify = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MON = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function fmtDate(ts, opts = {}) {
  const d = new Date(ts);
  if (opts.short) return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}
export const fmtHour = (ts) => new Date(ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

export function fmtDur(min) {
  min = Math.round(min);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
export function fmtHours(min) {
  const h = min / 60;
  return h < 10 ? h.toFixed(1).replace(".", ",") : String(Math.round(h));
}
export function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = String(m).padStart(2, "0"), ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function relTime(ts) {
  const diff = Date.now() - ts, abs = Math.abs(diff), fut = diff < 0;
  const m = Math.round(abs / 60000), h = Math.round(abs / 3600000), d = Math.round(abs / 86400000);
  let t;
  if (m < 1) return "recién";
  if (m < 60) t = `${m} min`;
  else if (h < 24) t = `${h} h`;
  else if (d === 1) return fut ? "mañana" : "ayer";
  else if (d < 30) t = `${d} días`;
  else return fmtDate(ts, { short: true });
  return fut ? `en ${t}` : `hace ${t}`;
}

export const dayKey = (ts = Date.now()) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const DAY = 86400000;

export function greeting() {
  const h = new Date().getHours();
  return h < 6 ? "Buenas noches" : h < 13 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches";
}

export const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "";
export const initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function download(name, content, mime = "text/plain;charset=utf-8") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
}

export const csvCell = (v) => {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCSV = (rows) => "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\n");

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function certCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => A[b % A.length]).join("");
  return `AMP-${new Date().getFullYear()}-${pick(4)}-${pick(4)}`;
}

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Cuenta numérica rápida (≈0,7 s) para los indicadores */
export function countUp(el, to, { dur = 700, dec = 0, suffix = "" } = {}) {
  if (reducedMotion() || document.visibilityState === "hidden") { el.textContent = fmtNum(to, dec) + suffix; return; }
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmtNum(to * e, dec) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
export const fmtNum = (n, dec = 0) => Number(n).toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

/* Id de un video o transmisión de YouTube a partir de cualquier formato de enlace */
export function ytId(url) {
  const m = String(url || "").match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
}
