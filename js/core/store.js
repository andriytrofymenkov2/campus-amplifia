/* =========================================================================
   STORE — capa de datos del campus
   · Modo DEMO: todo vive en localStorage de este navegador (datos de ejemplo,
     no apto para alumnos reales).
   · Modo SUPABASE: la sesión y los datos vienen de Supabase (js/core/remote.js).
     Las vistas leen el mismo objeto `db`; cada cambio se envía al servidor con
     push(). Las operaciones sensibles (ingreso, exámenes, certificados) se
     ejecutan en el servidor (ver supabase/01_esquema.sql).
   ========================================================================= */
import { CATEGORIES, INSTRUCTORS, COURSES, PATHS, LIVE, COMPANIES, STUDENTS, THREADS, REVIEWS, DEMO_ACCOUNTS } from "../data/seed.js";
import { uid, sha256, rng, dayKey, DAY, certCode, slugify, shuffle } from "./util.js";
import { CONFIG } from "../config.js";

const KEY = "amp_campus_db_v1";
export const MODE = CONFIG.mode === "supabase" && CONFIG.supabaseUrl && CONFIG.supabaseAnonKey ? "supabase" : "demo";

/* Ajustes editables desde el panel (con valores por defecto de config.js) */
export const setting = (k) => (db?.settings?.[k] ?? "") || CONFIG[k] || "";

export let db = null;
const listeners = new Set();
export const onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));

/* Adaptador remoto (Supabase). null en modo demo */
let R = null;
export const remote = () => R;
function push(fn, ...args) {
  if (!R || typeof R[fn] !== "function") return;
  Promise.resolve().then(() => R[fn](...args)).catch((err) => R.onError(err, fn));
}
/* Ids de texto: en Supabase son UUID (las tablas aceptan texto) */
const newId = (p) => (MODE === "supabase" && crypto.randomUUID ? crypto.randomUUID() : uid(p));

let saveT = 0;
export function save() {
  if (MODE === "demo") {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn("No se pudo guardar", e); }
    }, 60);
  }
  listeners.forEach((fn) => fn());
}

export async function init() {
  if (MODE === "supabase") {
    const mod = await import("./remote.js");
    R = mod.remoteAdapter;
    db = await R.boot();
    return db;
  }
  try { db = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { db = null; }
  if (!db || db.v !== 1) { db = await buildSeed(); localStorage.setItem(KEY, JSON.stringify(db)); }
  db.settings = db.settings || {};
  return db;
}

/* Reemplaza todos los datos (lo usa el adaptador remoto al iniciar sesión) */
export function setDb(next) { db = next; listeners.forEach((fn) => fn()); }

export async function resetDemo() {
  localStorage.removeItem(KEY);
  db = await buildSeed();
  localStorage.setItem(KEY, JSON.stringify(db));
}

/* ---------------------------------------------------------------- seed */
function normalizeCourse(c, i) {
  const id = "c-" + c.key;
  const modules = c.modules.map((m, mi) => ({
    id: `${c.key}-m${mi + 1}`,
    t: m.t,
    lessons: m.lessons.map((l, li) => ({ id: `${c.key}-${mi + 1}-${li + 1}`, res: [], ...l })),
  }));
  return {
    id, key: c.key, slug: c.slug || slugify(c.title), title: c.title, subtitle: c.subtitle, cat: c.cat, level: c.level,
    instructors: c.instructors, cover: c.cover, featured: !!c.featured, isNew: !!c.isNew, soon: !!c.soon,
    published: true, order: i, updated: Date.now() + (c.updated || 0) * DAY,
    desc: c.desc, outcomes: c.outcomes, forWho: c.forWho, req: c.req, modules, exam: c.exam,
  };
}

async function hashPass(pass, salt) { return sha256(salt + ":" + pass); }

async function buildSeed() {
  const now = Date.now();
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  const courses = COURSES.map(normalizeCourse);
  const byKey = Object.fromEntries(courses.map((c) => [c.key, c]));
  const D = {
    v: 1, seededAt: now,
    categories: CATEGORIES, instructors: INSTRUCTORS, courses, companies: COMPANIES.slice(),
    paths: PATHS.map((p) => ({ ...p, courses: p.courses.map((k) => byKey[k].id) })),
    live: LIVE.map((s, i) => {
      const [hh, mm] = s.h.split(":").map(Number);
      const at = today0.getTime() + s.d * DAY + (hh * 60 + mm) * 60000;
      return { id: "live-" + (i + 1), title: s.t, desc: s.desc || "", at, min: s.min, by: s.by, cid: s.course ? byKey[s.course].id : null, kind: s.kind || "youtube", link: s.kind === "meet" ? "https://meet.google.com/" : s.kind === "zoom" ? "https://zoom.us/" : "", rec: !!s.rec, recUrl: "", going: [], questions: [] };
    }),
    users: [], enr: [], certs: [], notes: [], threads: [], reviews: [], activity: {}, events: [], notifs: [], codes: [], watch: [],
    settings: {},
  };

  const mkUser = async (o) => {
    const salt = uid("s");
    const u = { id: o.id || uid("u"), name: o.name, user: o.user, email: o.email, salt, hash: await hashPass(o.pass, salt), role: o.role || "alumno", company: o.company || "", area: o.area || "", joined: o.joined || now, active: true, goal: 120, saved: [], lastSeen: o.lastSeen || now };
    D.users.push(u);
    return u;
  };

  const admin = await mkUser({ id: "u-admin", name: "Equipo Amplifia", user: DEMO_ACCOUNTS.admin.user, pass: DEMO_ACCOUNTS.admin.pass, email: "admin@demo.grupoamplifia.com", role: "admin", company: "Grupo Amplifia", joined: now - 120 * DAY });
  const me = await mkUser({ id: "u-martina", name: "Martina Sosa", user: DEMO_ACCOUNTS.alumno.user, pass: DEMO_ACCOUNTS.alumno.pass, email: "martina@demo.grupoamplifia.com", company: COMPANIES[0], area: "Operaciones", joined: now - 75 * DAY });
  me.saved = [byKey.kpi.id];
  void admin;

  const others = [];
  for (const [name, ci] of STUDENTS) {
    const user = slugify(name).replace(/-/g, ".");
    others.push(await mkUser({ name, user, pass: DEMO_ACCOUNTS.alumno.pass, email: `${user}@demo.grupoamplifia.com`, company: COMPANIES[ci], area: ["Operaciones", "Calidad", "Comercial", "Administración", "Logística"][others.length % 5], joined: now - (30 + others.length * 4) * DAY }));
  }

  const lessonsOf = (c) => c.modules.flatMap((m) => m.lessons);
  const addEnr = (u, c, { doneN = 0, startDaysAgo = 20, exam = null, lastPos = 0 }) => {
    const ls = lessonsOf(c);
    const start = now - startDaysAgo * DAY;
    const e = { id: uid("e"), uid: u.id, cid: c.id, at: start, done: {}, pos: {}, quiz: {}, attempts: [], completedAt: null, cert: null, last: ls[0].id };
    D.events.push({ uid: u.id, type: "enroll", cid: c.id, at: start });
    const n = Math.min(doneN, ls.length);
    for (let i = 0; i < n; i++) {
      const at = start + ((i + 1) / (n + 1)) * (now - start - DAY * 0.5);
      e.done[ls[i].id] = at;
      if (ls[i].type === "quiz") e.quiz[ls[i].id] = 100;
      D.events.push({ uid: u.id, type: "lesson", cid: c.id, lid: ls[i].id, at });
    }
    e.last = ls[Math.min(n, ls.length - 1)].id;
    if (lastPos && n < ls.length) e.pos[ls[n].id] = lastPos;
    if (exam && n === ls.length && c.exam) {
      const at = start + (now - start) * 0.92;
      e.attempts.push({ at, score: exam, passed: exam >= c.exam.pass });
      D.events.push({ uid: u.id, type: "exam", cid: c.id, at, meta: { score: exam } });
      if (exam >= c.exam.pass) {
        const code = certCode();
        e.completedAt = at; e.cert = code;
        D.certs.push({ code, uid: u.id, cid: c.id, at, score: exam, min: courseMinutes(c) });
        D.events.push({ uid: u.id, type: "cert", cid: c.id, at: at + 60000, meta: { code } });
      }
    }
    D.enr.push(e);
    return e;
  };

  /* Martina: un curso terminado con certificado, uno listo para el examen, dos en curso y uno recién empezado */
  addEnr(me, byKey["5s"], { doneN: 99, startDaysAgo: 62, exam: 90 });
  addEnr(me, byKey.kaizen, { doneN: 99, startDaysAgo: 34 });
  addEnr(me, byKey.liderazgo, { doneN: 5, startDaysAgo: 21, lastPos: 3 });
  addEnr(me, byKey.lean, { doneN: 4, startDaysAgo: 12 });
  addEnr(me, byKey.ia, { doneN: 1, startDaysAgo: 2 });

  /* Actividad de Martina: 10 semanas, con racha que llega hasta ayer */
  const r = rng(42);
  const act = (D.activity[me.id] = {});
  for (let d = 70; d >= 1; d--) {
    const dow = new Date(now - d * DAY).getDay();
    let m = r() < (dow === 0 || dow === 6 ? 0.25 : 0.62) ? Math.round(10 + r() * 45) : 0;
    if (d <= 6) m = Math.round(15 + r() * 35);
    if (d === 7) m = 0;
    if (m) act[dayKey(now - d * DAY)] = m;
  }

  /* Resto de los alumnos */
  const pub = courses.filter((c) => !c.soon);
  others.forEach((u, i) => {
    const rr = rng(1000 + i);
    const picks = shuffle(pub, rr).slice(0, 1 + Math.floor(rr() * 4));
    picks.forEach((c) => {
      const total = lessonsOf(c).length;
      const roll = rr();
      if (roll < 0.35) addEnr(u, c, { doneN: total, startDaysAgo: 20 + Math.floor(rr() * 50), exam: rr() < 0.85 ? 70 + Math.round(rr() * 6) * 5 : 60 });
      else addEnr(u, c, { doneN: Math.floor(rr() * total), startDaysAgo: 3 + Math.floor(rr() * 40) });
    });
    const a = (D.activity[u.id] = {});
    const quiet = rr() < 0.25 ? 18 : 0;
    for (let d = 56; d >= 1 + quiet; d--) if (rr() < 0.4) a[dayKey(now - d * DAY)] = Math.round(8 + rr() * 50);
    u.lastSeen = now - (quiet ? quiet + 1 : Math.floor(rr() * 3)) * DAY;
  });

  /* Preguntas y opiniones de ejemplo */
  THREADS.forEach((t) => {
    const c = byKey[t.course];
    const l = c.modules[t.lesson[0]].lessons[t.lesson[1]];
    D.threads.push({ id: uid("t"), cid: c.id, lid: l.id, uid: others[t.by].id, text: t.text, at: now + t.d * DAY, replies: t.reply ? [{ iid: t.reply.by, text: t.reply.text, at: now + t.reply.d * DAY }] : [] });
  });
  REVIEWS.forEach((rv) => D.reviews.push({ id: uid("r"), cid: byKey[rv.course].id, uid: others[rv.by].id, stars: rv.stars, text: rv.text, at: now + rv.d * DAY }));

  /* Notificaciones de Martina */
  const notif = (title, text, link, icon, ago, read = false) => D.notifs.push({ id: uid("n"), uid: me.id, title, text, link, icon, at: now - ago, read });
  notif("Clase en vivo en 2 días", "Clínica de implementación Lean: preguntas abiertas.", "#/agenda", "live", 2 * 3600e3);
  notif("Nuevo curso disponible", "Distribución de planta con SLP ya está en el catálogo.", "#/curso/layout-de-planta-slp", "sparkle", 5 * DAY);
  notif("Estás lista para el examen", "Completaste todas las lecciones de Kaizen con tu equipo.", "#/examen/kaizen-con-tu-equipo", "quiz", 6 * DAY);
  notif("Obtuviste tu certificado", "5S: el orden que se sostiene. ¡Felicitaciones!", "#/certificados", "award", 20 * DAY, true);

  /* Códigos de acceso para que los alumnos de una empresa se registren solos */
  D.codes.push({ code: "AUSTRAL-2026", company: COMPANIES[0], courses: [byKey.lean.id, byKey["5s"].id], uses: 6, max: 30, active: true, at: now - 70 * DAY });
  D.codes.push({ code: "ALAMOS-LIDERES", company: COMPANIES[1], courses: [byKey.liderazgo.id, byKey.coaching.id], uses: 4, max: 15, active: true, at: now - 40 * DAY });

  return D;
}

/* ---------------------------------------------------------------- lecturas */
export const courseMinutes = (c) => c.modules.reduce((s, m) => s + m.lessons.reduce((a, l) => a + (+l.min || 0), 0), 0) + (c.exam ? c.exam.minutes || 0 : 0);
export const lessonsOf = (c) => c.modules.flatMap((m) => m.lessons);
export const category = (id) => db.categories.find((c) => c.id === id) || { id, name: id, short: id };
export const instructor = (id) => db.instructors.find((i) => i.id === id);
export const user = (id) => db.users.find((u) => u.id === id);
export const course = (idOrSlug) => db.courses.find((c) => c.id === idOrSlug || c.slug === idOrSlug);
export const visibleCourses = () => db.courses.filter((c) => c.published).sort((a, b) => a.order - b.order);
export const enrollment = (u, cid) => db.enr.find((e) => e.uid === u && e.cid === cid);
export const enrollmentsOf = (u) => db.enr.filter((e) => e.uid === u);
export const certsOf = (u) => db.certs.filter((c) => c.uid === u).sort((a, b) => b.at - a.at);
export const cert = (code) => db.certs.find((c) => c.code === String(code).toUpperCase());

export function findLesson(c, lid) {
  for (let mi = 0; mi < c.modules.length; mi++) {
    const li = c.modules[mi].lessons.findIndex((l) => l.id === lid);
    if (li >= 0) return { m: c.modules[mi], mi, li, l: c.modules[mi].lessons[li] };
  }
  return null;
}

export function progress(e, c) {
  const ls = lessonsOf(c);
  const done = e ? ls.filter((l) => e.done[l.id]).length : 0;
  const total = ls.length;
  const examPassed = !!(e && (e.cert || e.attempts.some((a) => a.passed)));
  const units = total + (c.exam ? 1 : 0);
  const pct = units ? Math.round(((done + (c.exam && examPassed ? 1 : 0)) / units) * 100) : 0;
  const lessonsDone = done === total;
  const status = !e ? "none" : e.cert ? "done" : lessonsDone && !c.exam ? "done" : lessonsDone ? "exam" : done ? "progress" : "new";
  return { done, total, pct, examPassed, lessonsDone, status };
}

export function nextLesson(e, c) {
  const ls = lessonsOf(c);
  if (!e) return ls[0];
  return ls.find((l) => !e.done[l.id]) || ls.find((l) => l.id === e.last) || ls[0];
}

export function modulePct(e, m) {
  if (!e || !m.lessons.length) return 0;
  return Math.round((m.lessons.filter((l) => e.done[l.id]).length / m.lessons.length) * 100);
}

export function rating(cid) {
  const rs = db.reviews.filter((r) => r.cid === cid);
  if (!rs.length) return { avg: 0, n: 0 };
  return { avg: rs.reduce((s, r) => s + r.stars, 0) / rs.length, n: rs.length };
}
export const enrolledCount = (cid) => db.enr.filter((e) => e.cid === cid).length;

export function activityOf(u) { return db.activity[u] || {}; }
export function minutesTotal(u) { return Object.values(activityOf(u)).reduce((a, b) => a + b, 0); }
export function minutesThisWeek(u) {
  const a = activityOf(u), d = new Date(); const dow = (d.getDay() + 6) % 7;
  let s = 0;
  for (let i = 0; i <= dow; i++) s += a[dayKey(Date.now() - i * DAY)] || 0;
  return s;
}
export function streak(u) {
  const a = activityOf(u);
  let n = 0, i = a[dayKey()] ? 0 : 1;
  while (a[dayKey(Date.now() - i * DAY)]) { n++; i++; }
  return { days: n, today: !!a[dayKey()] };
}
export function longestStreak(u) {
  const keys = Object.keys(activityOf(u)).sort();
  let best = 0, cur = 0, prev = null;
  keys.forEach((k) => {
    const t = new Date(k + "T12:00:00").getTime();
    cur = prev && Math.round((t - prev) / DAY) === 1 ? cur + 1 : 1;
    best = Math.max(best, cur); prev = t;
  });
  return best;
}

export function badges(u) {
  const es = enrollmentsOf(u);
  const lessons = es.reduce((s, e) => s + Object.keys(e.done).length, 0);
  const cats = new Set(es.map((e) => course(e.cid)?.cat));
  const perfect = es.some((e) => e.attempts.some((a) => a.score === 100));
  const certs = certsOf(u).length;
  const doneIds = new Set(certsOf(u).map((c) => c.cid));
  const path = db.paths.some((p) => p.courses.length && p.courses.every((cid) => doneIds.has(cid) || course(cid)?.soon));
  const hours = minutesTotal(u) / 60;
  return [
    { id: "primer", icon: "playo", name: "Primer paso", desc: "Completaste tu primera lección", on: lessons > 0 },
    { id: "racha", icon: "flame", name: "Constancia", desc: "7 días seguidos aprendiendo", on: longestStreak(u) >= 7 },
    { id: "cert", icon: "award", name: "Certificado", desc: "Aprobaste tu primer curso", on: certs > 0 },
    { id: "explorador", icon: "compass", name: "Explorador", desc: "Cursos de 3 frentes distintos", on: cats.size >= 3 },
    { id: "horas", icon: "clock", name: "Diez horas", desc: "10 horas de aprendizaje", on: hours >= 10 },
    { id: "excelencia", icon: "trophy", name: "Excelencia", desc: "100 % en un examen final", on: perfect },
    { id: "ruta", icon: "route", name: "Ruta completa", desc: "Terminaste una ruta de aprendizaje", on: path },
  ];
}

export const notifsOf = (u) => db.notifs.filter((n) => n.uid === u).sort((a, b) => b.at - a.at);
export const eventsOf = (u) => db.events.filter((e) => e.uid === u).sort((a, b) => b.at - a.at);

/* ---------------------------------------------------------------- escrituras de alumno */
function event(u, type, cid, extra = {}) {
  const ev = { uid: u, type, cid, at: Date.now(), ...extra };
  db.events.push(ev);
  if (type === "enroll" || type === "lesson") push("event", ev);
}
export function notify(u, title, text, link, icon) {
  const n = { id: newId("n"), uid: u, title, text, link, icon, at: Date.now(), read: false };
  db.notifs.push(n);
  push("notify", n);
  return n;
}

export function enroll(u, cid) {
  let e = enrollment(u, cid);
  if (e) return e;
  const c = course(cid);
  e = { id: newId("e"), uid: u, cid, at: Date.now(), done: {}, pos: {}, quiz: {}, attempts: [], completedAt: null, cert: null, last: lessonsOf(c)[0]?.id || null };
  db.enr.push(e);
  push("enroll", e);
  event(u, "enroll", cid);
  save();
  return e;
}

export function setLast(u, cid, lid) { const e = enrollment(u, cid); if (e && e.last !== lid) { e.last = lid; push("progress", e); save(); } }
export function setPos(u, cid, lid, sec) { const e = enrollment(u, cid); if (e) { e.pos[lid] = Math.round(sec); push("progress", e); save(); } }

export function completeLesson(u, cid, lid, quizScore) {
  const e = enrollment(u, cid) || enroll(u, cid);
  if (quizScore != null) e.quiz[lid] = Math.max(e.quiz[lid] || 0, quizScore);
  if (e.done[lid]) { push("progress", e); save(); return { e, already: true }; }
  e.done[lid] = Date.now();
  push("progress", e);
  event(u, "lesson", cid, { lid });
  const c = course(cid);
  const p = progress(e, c);
  if (p.lessonsDone) {
    if (c.exam) notify(u, "Estás listo para el examen final", c.title, `#/examen/${c.slug}`, "quiz");
    else if (R) push("completeCourse", u, c);
    else issueCertificate(u, c, null);
  }
  save();
  return { e, p };
}

export function uncompleteLesson(u, cid, lid) { const e = enrollment(u, cid); if (e && e.done[lid] && !e.cert) { delete e.done[lid]; push("progress", e); save(); } }

export function logMinutes(u, min) {
  if (!u || min <= 0) return;
  const a = (db.activity[u] = db.activity[u] || {});
  const k = dayKey();
  a[k] = Math.round(((a[k] || 0) + min) * 100) / 100;
  push("minutes", min);
  save();
}

export function toggleSaved(u, cid) {
  const us = user(u);
  us.saved = us.saved.includes(cid) ? us.saved.filter((x) => x !== cid) : [...us.saved, cid];
  push("profile", us);
  save();
  return us.saved.includes(cid);
}
export function toggleWatch(u, cid) {
  const i = db.watch.findIndex((w) => w.uid === u && w.cid === cid);
  if (i >= 0) db.watch.splice(i, 1); else db.watch.push({ uid: u, cid, at: Date.now() });
  push("watch", cid, i < 0);
  save();
  return i < 0;
}
export const watching = (u, cid) => db.watch.some((w) => w.uid === u && w.cid === cid);

export function addNote(u, cid, lid, text, t) { const n = { id: newId("note"), uid: u, cid, lid, text, t, at: Date.now() }; db.notes.push(n); push("note", n); save(); return n; }
export function deleteNote(id) { db.notes = db.notes.filter((n) => n.id !== id); push("deleteNote", id); save(); }
export const notesOf = (u, lid) => db.notes.filter((n) => n.uid === u && (!lid || n.lid === lid)).sort((a, b) => (a.t ?? 1e9) - (b.t ?? 1e9) || a.at - b.at);

export function addThread(u, cid, lid, text) { const t = { id: newId("t"), cid, lid, uid: u, text, at: Date.now(), replies: [] }; db.threads.push(t); push("thread", t); save(); return t; }
/* Respuesta de un alumno (u) o de un instructor (iid, la publica un administrador) */
export function addReply(tid, u, text, iid = null) {
  const t = db.threads.find((x) => x.id === tid);
  if (!t) return;
  const r = { id: newId("rp"), uid: u, iid, text, at: Date.now() };
  t.replies.push(r);
  push("reply", t, r);
  save();
}
export const threadsOf = (cid, lid) => db.threads.filter((t) => t.cid === cid && (!lid || t.lid === lid)).sort((a, b) => b.at - a.at);

export function addReview(u, cid, stars, text) {
  let r = db.reviews.find((x) => x.uid === u && x.cid === cid);
  if (r) Object.assign(r, { stars, text, at: Date.now() });
  else { r = { id: newId("r"), cid, uid: u, stars, text, at: Date.now() }; db.reviews.push(r); }
  push("review", r);
  save();
}
export const reviewsOf = (cid) => db.reviews.filter((r) => r.cid === cid).sort((a, b) => b.at - a.at);

export function markNotifsRead(u) { db.notifs.forEach((n) => { if (n.uid === u) n.read = true; }); push("notifsRead", u); save(); }

export function updateProfile(u, data) { Object.assign(user(u), data); push("profile", user(u)); save(); }

/* Clases en vivo */
export const liveSession = (id) => db.live.find((x) => x.id === id);
export function liveRsvp(sid, u) {
  const s = liveSession(sid);
  s.going = s.going || [];
  const on = !s.going.includes(u);
  s.going = on ? [...s.going, u] : s.going.filter((x) => x !== u);
  push("rsvp", sid, on);
  save();
  return on;
}
export function liveAsk(sid, u, text) {
  const s = liveSession(sid);
  s.questions = s.questions || [];
  const q = { id: newId("lq"), uid: u, text, at: Date.now(), votes: [] };
  s.questions.push(q);
  push("liveQuestion", sid, q);
  liveVote(sid, q.id, u);
  return q;
}
export function liveVote(sid, qid, u) {
  const q = liveSession(sid)?.questions?.find((x) => x.id === qid);
  if (!q) return;
  q.votes = q.votes || [];
  const on = !q.votes.includes(u);
  q.votes = on ? [...q.votes, u] : q.votes.filter((x) => x !== u);
  push("vote", qid, on);
  save();
}

export function saveSettings(data) {
  db.settings = { ...(db.settings || {}), ...data };
  push("settings", data);
  save();
}

/* ---------------------------------------------------------------- operaciones sensibles
   En modo Supabase se ejecutan en el servidor (funciones SQL con validación). */
export const api = {
  /* Devuelve el examen SIN las respuestas correctas */
  async examForTaking(cid) {
    if (R) return R.startExam(cid);
    const c = course(cid);
    if (!c?.exam) return null;
    const qs = shuffle(c.exam.qs.map((qq, i) => ({ i, q: qq.q, o: shuffle(qq.o.map((t, j) => ({ j, t }))) })));
    return { pass: c.exam.pass, minutes: c.exam.minutes, attempts: c.exam.attempts, qs, startedAt: null };
  },

  /* Corrige y, si corresponde, emite el certificado. answers = { índicePregunta: índiceOpción } */
  async gradeExam(u, cid, answers) {
    if (R) return R.gradeExam(u, cid, answers);
    const c = course(cid);
    const e = enrollment(u, cid);
    if (!c?.exam || !e) throw new Error("Sin inscripción");
    if (!progress(e, c).lessonsDone) throw new Error("Completá todas las lecciones antes del examen");
    if (e.cert) throw new Error("Ya aprobaste este curso");
    if (e.attempts.length >= c.exam.attempts) throw new Error("No te quedan intentos");
    const results = c.exam.qs.map((qq, i) => ({ i, ok: answers[i] === qq.a }));
    const score = Math.round((results.filter((r) => r.ok).length / c.exam.qs.length) * 100);
    const passed = score >= c.exam.pass;
    e.attempts.push({ at: Date.now(), score, passed });
    event(u, "exam", cid, { meta: { score } });
    const left = c.exam.attempts - e.attempts.length;
    /* Las respuestas correctas solo se revelan si aprobaste o si ya no quedan intentos */
    const reveal = passed || left <= 0;
    const review = c.exam.qs.map((qq, i) => ({ q: qq.q, o: qq.o, chosen: answers[i], ok: results[i].ok, correct: reveal ? qq.a : null, e: reveal ? qq.e : null }));
    let certificate = null;
    if (passed) certificate = issueCertificate(u, c, score);
    save();
    return { score, passed, left, review, certificate, pass: c.exam.pass };
  },

  async login(identifier, pass) {
    if (R) return R.login(identifier, pass);
    const id = String(identifier).trim().toLowerCase();
    const u = db.users.find((x) => x.user.toLowerCase() === id || x.email.toLowerCase() === id);
    if (!u) return null;
    if ((await hashPass(pass, u.salt)) !== u.hash) return null;
    if (!u.active) throw new Error("Tu cuenta está desactivada. Escribinos si creés que es un error.");
    return u;
  },

  async register({ name, email, user: username, pass, code }) {
    if (R) return R.register({ name, email, user: username, pass, code });
    const em = email.trim().toLowerCase(), un = username.trim().toLowerCase();
    if (db.users.some((x) => x.email.toLowerCase() === em)) throw new Error("Ya existe una cuenta con ese email");
    if (db.users.some((x) => x.user.toLowerCase() === un)) throw new Error("Ese nombre de usuario ya está en uso");
    let cd = null;
    if (code) {
      cd = db.codes.find((x) => x.code.toUpperCase() === code.trim().toUpperCase() && x.active);
      if (!cd) throw new Error("El código de acceso no es válido");
      if (cd.uses >= cd.max) throw new Error("El código de acceso ya alcanzó su cupo");
    }
    const salt = uid("s");
    const u = { id: uid("u"), name: name.trim(), user: un, email: em, salt, hash: await hashPass(pass, salt), role: "alumno", company: cd ? cd.company : "", area: "", joined: Date.now(), active: true, goal: 120, saved: [], lastSeen: Date.now() };
    db.users.push(u);
    if (cd) { cd.uses++; cd.courses.forEach((cid) => enroll(u.id, cid)); }
    notify(u.id, "¡Bienvenido al campus!", cd ? `Tu empresa te asignó ${cd.courses.length} cursos.` : "Explorá el catálogo y elegí tu primer curso.", cd ? "#/mis-cursos" : "#/catalogo", "sparkle");
    save();
    return { user: u, needsConfirm: false };
  },

  async changePassword(u, current, next) {
    if (R) return R.changePassword(current, next);
    const us = user(u);
    if ((await hashPass(current, us.salt)) !== us.hash) throw new Error("La contraseña actual no es correcta");
    us.salt = uid("s");
    us.hash = await hashPass(next, us.salt);
    save();
  },

  /* Restablecer la contraseña de otro usuario (admin). En Supabase: se le envía un email */
  async resetUserPassword(u, next) {
    if (R) { await R.recover(user(u).email); return { emailed: true }; }
    const us = user(u); us.salt = uid("s"); us.hash = await hashPass(next, us.salt); save();
    return { emailed: false };
  },

  async recover(email) { if (R) return R.recover(email); },
  async updatePassword(next) { if (R) return R.updatePassword(next); },

  /* Verificación pública de un certificado */
  async verify(code) {
    if (R) return R.verify(code);
    const ct = cert(code);
    if (!ct) return { valid: false };
    const c = course(ct.cid), u = user(ct.uid);
    return { valid: true, code: ct.code, name: u?.name || "", course: c?.title || "", instructors: c?.instructors || [], issued_at: ct.at, score: ct.score, minutes: ct.min };
  },

  /* Archivos (Supabase Storage) */
  async materialUrl(path) { return R ? R.materialUrl(path) : null; },
  async upload(bucket, file, path) { if (!R) throw new Error("Disponible al conectar Supabase"); return R.upload(bucket, file, path); },
};

function issueCertificate(u, c, score) {
  const e = enrollment(u, c.id);
  if (e.cert) return cert(e.cert);
  const code = certCode();
  const ct = { code, uid: u, cid: c.id, at: Date.now(), score, min: courseMinutes(c) };
  db.certs.push(ct);
  e.cert = code;
  e.completedAt = ct.at;
  event(u, "cert", c.id, { meta: { code } });
  notify(u, "Obtuviste tu certificado", c.title, `#/certificado/${code}`, "award");
  return ct;
}

/* ---------------------------------------------------------------- administración */
export const admin = {
  saveCourse(c) {
    const i = db.courses.findIndex((x) => x.id === c.id);
    c.updated = Date.now();
    if (i >= 0) db.courses[i] = c; else db.courses.push(c);
    push("course", c);
    save();
  },
  newCourse() {
    const key = uid("k").slice(2);
    return {
      id: "c-" + key, key, slug: "nuevo-curso-" + key.slice(0, 4), title: "Nuevo curso", subtitle: "", cat: "procesos", level: "Inicial", instructors: [db.instructors[0]?.id].filter(Boolean), cover: null,
      featured: false, isNew: true, soon: false, published: false, order: db.courses.length, updated: Date.now(), desc: "", outcomes: [], forWho: "", req: "",
      modules: [{ id: key + "-m1", t: "Módulo 1", lessons: [{ id: key + "-1-1", t: "Primera lección", type: "video", min: 10, v: "ink", sum: "", res: [] }] }],
      exam: { pass: 70, minutes: 10, attempts: 3, qs: [] },
    };
  },
  deleteCourse(cid) {
    db.courses = db.courses.filter((c) => c.id !== cid);
    db.enr = db.enr.filter((e) => e.cid !== cid);
    push("deleteCourse", cid);
    save();
  },
  async createUser({ name, email, user: un, pass, role, company, area, courses = [] }) {
    if (R) return R.createUser({ name, email, user: un, pass, role, company, area, courses });
    if (db.users.some((x) => x.email.toLowerCase() === email.toLowerCase())) throw new Error(`Ya existe ${email}`);
    if (db.users.some((x) => x.user.toLowerCase() === un.toLowerCase())) throw new Error(`El usuario ${un} ya existe`);
    const salt = uid("s");
    const u = { id: uid("u"), name, user: un.toLowerCase(), email: email.toLowerCase(), salt, hash: await hashPass(pass, salt), role: role || "alumno", company: company || "", area: area || "", joined: Date.now(), active: true, goal: 120, saved: [], lastSeen: 0 };
    db.users.push(u);
    courses.forEach((cid) => enroll(u.id, cid));
    if (company && !db.companies.includes(company)) db.companies.push(company);
    save();
    return u;
  },
  updateUser(id, data) {
    Object.assign(user(id), data);
    if (data.company && !db.companies.includes(data.company)) db.companies.push(data.company);
    push("adminProfile", id, data);
    save();
  },
  /* En Supabase no se borra la cuenta desde el navegador: se desactiva (y se borra desde el panel de Supabase) */
  deleteUser(id) {
    if (R) { admin.updateUser(id, { active: false }); return { deactivated: true }; }
    db.users = db.users.filter((u) => u.id !== id);
    db.enr = db.enr.filter((e) => e.uid !== id);
    db.certs = db.certs.filter((c) => c.uid !== id);
    save();
    return { deleted: true };
  },
  assign(uids, cid) {
    uids.forEach((u) => enroll(u, cid));
    uids.forEach((u) => notify(u, "Te asignaron un curso", course(cid).title, `#/curso/${course(cid).slug}`, "book"));
    save();
  },
  unassign(u, cid) { db.enr = db.enr.filter((e) => !(e.uid === u && e.cid === cid)); push("unenroll", u, cid); save(); },
  resetAttempts(u, cid) { const e = enrollment(u, cid); if (e) { e.attempts = []; push("resetAttempts", u, cid); save(); } },
  createCode(data) { const c = { ...data, code: data.code.toUpperCase(), uses: 0, active: true, at: Date.now() }; db.codes.push(c); push("code", c); save(); },
  toggleCode(code) { const c = db.codes.find((x) => x.code === code); c.active = !c.active; push("code", c); save(); },
  deleteCode(code) { db.codes = db.codes.filter((x) => x.code !== code); push("deleteCode", code); save(); },
  saveLive(s) { const i = db.live.findIndex((x) => x.id === s.id); if (i >= 0) db.live[i] = s; else db.live.push(s); push("live", s); save(); },
  deleteLive(id) { db.live = db.live.filter((x) => x.id !== id); push("deleteLive", id); save(); },
  revokeCert(code) {
    const c = cert(code);
    if (!c) return;
    db.certs = db.certs.filter((x) => x.code !== code);
    const e = enrollment(c.uid, c.cid);
    if (e) { e.cert = null; e.completedAt = null; }
    push("revokeCert", code);
    save();
  },
  nudge(u) { notify(u, "Te extrañamos en el campus", "Tenés cursos en marcha. Una lección corta hoy te devuelve al ritmo.", "#/mis-cursos", "flame"); save(); },
};
