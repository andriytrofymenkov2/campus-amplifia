/* Sesión del campus.
   · Demo: sesión local en este navegador (contraseñas con hash SHA-256 + sal).
   · Supabase: Supabase Auth (contraseñas cifradas con bcrypt en el servidor,
     tokens que vencen y se renuevan solos). */
import * as S from "./store.js";

const SKEY = "amp_campus_session";
const LKEY = "amp_campus_lock";
const MAX_TRIES = 5, LOCK_MS = 60_000, IDLE_MS = 8 * 3600_000;

let current = null;

export function restore() {
  if (S.MODE === "supabase") {
    current = S.db.me ? S.user(S.db.me) || null : null;
    return current;
  }
  try {
    const raw = sessionStorage.getItem(SKEY) || localStorage.getItem(SKEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.remember && Date.now() - s.at > IDLE_MS) { logout(); return null; }
    const u = S.user(s.uid);
    if (!u || !u.active) { logout(); return null; }
    current = u;
    touch();
    return u;
  } catch { return null; }
}

export const me = () => current;
export const isAdmin = () => current?.role === "admin";

function touch() {
  if (!current || S.MODE !== "demo") return;
  current.lastSeen = Date.now();
  S.save();
}

export function lockState() {
  try { return JSON.parse(localStorage.getItem(LKEY) || '{"n":0,"until":0}'); } catch { return { n: 0, until: 0 }; }
}
function setLock(l) { localStorage.setItem(LKEY, JSON.stringify(l)); }

export async function login(identifier, pass, remember) {
  const l = lockState();
  if (l.until > Date.now()) {
    const s = Math.ceil((l.until - Date.now()) / 1000);
    throw new Error(`Demasiados intentos. Probá de nuevo en ${s} s.`);
  }
  const u = await S.api.login(identifier, pass);
  if (!u) {
    l.n = (l.n || 0) + 1;
    if (l.n >= MAX_TRIES) { l.until = Date.now() + LOCK_MS; l.n = 0; }
    setLock(l);
    /* Mismo mensaje para usuario inexistente o contraseña incorrecta: no revela qué cuentas existen */
    throw new Error("Usuario o contraseña incorrectos.");
  }
  setLock({ n: 0, until: 0 });
  start(u, remember);
  return u;
}

export function start(u, remember = false) {
  current = u;
  if (S.MODE === "supabase") { S.remote()?.rememberSession(remember); return; }
  const s = JSON.stringify({ uid: u.id, at: Date.now(), remember });
  (remember ? localStorage : sessionStorage).setItem(SKEY, s);
  (remember ? sessionStorage : localStorage).removeItem(SKEY);
  touch();
}

export async function logout() {
  current = null;
  sessionStorage.removeItem(SKEY);
  localStorage.removeItem(SKEY);
  if (S.MODE === "supabase") await S.remote()?.logout();
}

export function passwordIssues(p) {
  const out = [];
  if (p.length < 8) out.push("al menos 8 caracteres");
  if (!/[A-ZÁÉÍÓÚÑ]/.test(p) || !/[a-záéíóúñ]/.test(p)) out.push("mayúsculas y minúsculas");
  if (!/\d/.test(p)) out.push("al menos un número");
  return out;
}
export function passwordScore(p) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-ZÁÉÍÓÚÑ]/.test(p) && /[a-záéíóúñ]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^\wÁÉÍÓÚÑáéíóúñ]/.test(p)) s++;
  return Math.min(4, s);
}
