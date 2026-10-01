/* =========================================================================
   ADAPTADOR SUPABASE
   Traduce entre las tablas de supabase/01_esquema.sql y el objeto `db` que
   usan las vistas. Solo se carga cuando CONFIG.mode === "supabase".
   Seguridad: este archivo usa la "anon key" (pública). Todo lo que un alumno
   puede leer o escribir lo deciden las políticas RLS del servidor.
   ========================================================================= */
import { CONFIG } from "../config.js";
import * as S from "./store.js";
import { CATEGORIES } from "../data/seed.js";

const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js";
const LIB_SRI = "sha384-Rj26LVGvoeRVR6+mwQmFfcR3QOBEwT+ZmuCWpuiqeTzJpCs0ER4ITAWGb4Hiy3Ok";
const NOREM = "amp_norem", TABFLAG = "amp_tab";

export let sb = null;
let me = null;               // id del usuario con sesión
let errorHandler = (msg) => console.error(msg);
export const onRemoteError = (fn) => (errorHandler = fn);

function loadLib() {
  if (window.supabase?.createClient) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = LIB; s.integrity = LIB_SRI; s.crossOrigin = "anonymous"; s.referrerPolicy = "no-referrer";
    s.onload = res; s.onerror = () => rej(new Error("No se pudo cargar la conexión con el servidor. Revisá tu internet."));
    document.head.appendChild(s);
  });
}

const ms = (t) => (t ? Date.parse(t) : 0);
const iso = (n) => new Date(n).toISOString();
const must = ({ data, error }) => { if (error) throw error; return data; };

function emptyDb() {
  return { v: 1, categories: CATEGORIES, instructors: [], courses: [], companies: [], paths: [], live: [], users: [], enr: [], certs: [], notes: [], threads: [], reviews: [], activity: {}, events: [], notifs: [], codes: [], watch: [], settings: {} };
}

/* ------------------------------------------------------------------ mapeos */
const toCourse = (r, qs) => ({
  id: r.id, key: r.id.replace(/^c-/, ""), slug: r.slug, title: r.title,
  subtitle: "", cat: "procesos", level: "Inicial", instructors: [], cover: null, desc: "", outcomes: [], forWho: "", req: "", modules: [],
  ...r.data,
  published: r.published, soon: r.soon, featured: r.featured, isNew: r.is_new, order: r.sort, updated: ms(r.updated_at),
  exam: r.exam_config ? { pass: r.exam_config.pass, minutes: r.exam_config.minutes, attempts: r.exam_config.attempts, qs: qs || Array.from({ length: r.exam_config.count || 0 }, () => ({})) } : null,
});
const fromCourse = (c) => {
  const { id, slug, title, published, soon, featured, isNew, order, exam, key, updated, ...data } = c;
  void key; void updated; void exam;
  return { id, slug, title, data, published: !!published, soon: !!soon, featured: !!featured, is_new: !!isNew, sort: order || 0, updated_at: new Date().toISOString() };
};
const toUser = (p) => ({ id: p.id, name: p.full_name, user: p.username, email: p.email, role: p.role, company: p.company, area: p.area, goal: p.goal, saved: p.saved || [], active: p.active, joined: ms(p.joined_at), lastSeen: ms(p.last_seen) });
const toLive = (r, rsvp, qs, votes) => ({
  id: r.id, title: r.title, desc: r.descr, at: ms(r.at), min: r.minutes, by: r.by_ids, cid: r.course_id, kind: r.kind, link: r.link, rec: r.rec, recUrl: r.rec_url,
  going: rsvp.filter((x) => x.session_id === r.id).map((x) => x.user_id),
  questions: qs.filter((q) => q.session_id === r.id).map((q) => ({ id: q.id, uid: q.user_id, text: q.text, at: ms(q.at), votes: votes.filter((v) => v.question_id === q.id).map((v) => v.user_id) })),
});

/* ------------------------------------------------------------------ carga */
async function loadAll(uid) {
  const D = emptyDb();
  const prof = must(await sb.from("profiles").select("*").eq("id", uid).single());
  const isAdmin = prof.role === "admin" && prof.active;
  const q = (t, sel = "*") => sb.from(t).select(sel);

  const [cats, ins, courses, paths, settings, live, rsvp, lqs, votes, people, enr, attempts, certs, act, events, notes, threads, replies, reviews, notifs, watch] = await Promise.all([
    q("categories").order("sort"), q("instructors").order("sort"), q("courses").order("sort"), q("paths").order("sort"), q("settings"),
    q("live_sessions").order("at"), q("live_rsvp"), q("live_questions"), q("live_votes"),
    isAdmin ? q("profiles") : q("people"),
    q("enrollments"), q("exam_attempts").order("created_at"), q("certificates").eq("revoked", false),
    isAdmin ? q("activity") : q("activity").eq("user_id", uid),
    q("events").eq("user_id", uid).order("at", { ascending: false }).limit(60),
    q("notes"), q("threads"), q("thread_replies").order("at"), q("reviews"),
    q("notifications").order("at", { ascending: false }).limit(40), q("course_watch"),
  ]).then((rs) => rs.map(must));

  let examQs = {};
  if (isAdmin) {
    const eq = must(await q("exam_questions").order("idx"));
    eq.forEach((x) => (examQs[x.course_id] = examQs[x.course_id] || []).push({ q: x.q, o: x.options, a: x.answer, e: x.explanation }));
    D.codes = must(await q("access_codes")).map((c) => ({ code: c.code, company: c.company, courses: c.course_ids, uses: c.uses, max: c.max_uses, active: c.active, at: ms(c.created_at) }));
  }

  if (cats.length) D.categories = cats;
  D.instructors = ins;
  D.courses = courses.map((r) => toCourse(r, examQs[r.id]));
  D.paths = paths.map((p) => ({ id: p.id, title: p.title, desc: p.descr, courses: p.course_ids }));
  settings.forEach((s) => (D.settings[s.key] = s.value));
  D.live = live.map((r) => toLive(r, rsvp, lqs, votes));
  D.users = isAdmin ? people.map(toUser) : people.map((p) => ({ id: p.id, name: p.full_name, role: p.role, saved: [], active: true }));
  const mine = toUser(prof);
  D.users = D.users.filter((u) => u.id !== uid).concat(mine);
  D.enr = enr.map((e) => ({ id: e.id, uid: e.user_id, cid: e.course_id, at: ms(e.enrolled_at), done: e.done || {}, pos: e.pos || {}, quiz: e.quiz || {}, last: e.last, completedAt: ms(e.completed_at) || null, cert: e.cert_code,
    attempts: attempts.filter((a) => a.user_id === e.user_id && a.course_id === e.course_id).map((a) => ({ at: ms(a.created_at), score: a.score, passed: a.passed })) }));
  D.certs = certs.map((c) => ({ code: c.code, uid: c.user_id, cid: c.course_id, at: ms(c.issued_at), score: c.score, min: c.minutes }));
  act.forEach((a) => ((D.activity[a.user_id] = D.activity[a.user_id] || {})[a.day] = +a.minutes));
  D.events = events.map((e) => ({ uid: e.user_id, type: e.type, cid: e.course_id, lid: e.lesson_id, meta: e.meta, at: ms(e.at) }));
  D.notes = notes.map((n) => ({ id: n.id, uid: n.user_id, cid: n.course_id, lid: n.lesson_id, t: n.t, text: n.text, at: ms(n.at) }));
  D.threads = threads.map((t) => ({ id: t.id, cid: t.course_id, lid: t.lesson_id, uid: t.user_id, text: t.text, at: ms(t.at),
    replies: replies.filter((r) => r.thread_id === t.id).map((r) => ({ id: r.id, uid: r.instructor_id ? null : r.user_id, iid: r.instructor_id, text: r.text, at: ms(r.at) })) }));
  D.reviews = reviews.map((r) => ({ id: r.id, cid: r.course_id, uid: r.user_id, stars: r.stars, text: r.text, at: ms(r.at) }));
  D.notifs = notifs.map((n) => ({ id: n.id, uid: n.user_id, title: n.title, text: n.text, link: n.link, icon: n.icon, read: n.read, at: ms(n.at) }));
  D.watch = watch.map((w) => ({ uid: w.user_id, cid: w.course_id }));
  D.companies = [...new Set([...D.users.map((u) => u.company), ...D.codes.map((c) => c.company)].filter(Boolean))];
  D.me = uid;
  return D;
}

/* ------------------------------------------------------------------ avance (con demora para no saturar) */
const pending = new Map();
function queueProgress(e) {
  clearTimeout(pending.get(e.id)?.t);
  pending.set(e.id, { e, t: setTimeout(() => flushProgress(e.id), 1500) });
}
async function flushProgress(id) {
  const p = pending.get(id);
  if (!p) return;
  pending.delete(id);
  const { e } = p;
  must(await sb.from("enrollments").update({ done: e.done, pos: e.pos, quiz: e.quiz, last: e.last }).eq("id", e.id));
}
let minutesAcc = 0;
async function flushMinutes() {
  if (minutesAcc < 0.25) return;
  const m = Math.min(30, minutesAcc);
  minutesAcc -= m;
  must(await sb.rpc("log_minutes", { p_min: Math.round(m * 100) / 100 }));
}
addEventListener("pagehide", () => { pending.forEach((_, id) => flushProgress(id)); flushMinutes(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { pending.forEach((_, id) => flushProgress(id)); flushMinutes(); } });

/* ------------------------------------------------------------------ adaptador */
export const remoteAdapter = {
  onError(err, op) {
    console.error("Supabase", op, err);
    errorHandler(friendly(err));
  },

  async boot() {
    await loadLib();
    sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "amp_campus_auth" },
    });
    sb.auth.onAuthStateChange((ev) => {
      if (ev === "PASSWORD_RECOVERY") location.hash = "#/nueva-clave";
      if (ev === "SIGNED_OUT") { me = null; }
    });
    /* "Mantener la sesión iniciada" desmarcado: la sesión no sobrevive a cerrar el navegador */
    if (localStorage.getItem(NOREM) && !sessionStorage.getItem(TABFLAG)) { await sb.auth.signOut(); localStorage.removeItem(NOREM); }
    const { data } = await sb.auth.getSession();
    if (!data.session) return emptyDb();
    try {
      me = data.session.user.id;
      const D = await loadAll(me);
      if (!D.users.find((u) => u.id === me)?.active) { await sb.auth.signOut(); me = null; return emptyDb(); }
      sb.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", me).then(() => {});
      return D;
    } catch (err) {
      console.error(err);
      return emptyDb();
    }
  },

  async login(identifier, pass) {
    let email = String(identifier).trim();
    if (!email.includes("@")) {
      const { data, error } = await sb.rpc("login_email", { p_ident: email, p_pass: pass });
      if (error) throw new Error(friendly(error));
      if (!data) return null;
      email = data;
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) {
      if (/confirm/i.test(error.message)) throw new Error("Todavía no confirmaste tu email. Revisá tu bandeja de entrada.");
      if (/invalid/i.test(error.message)) return null;
      throw new Error(friendly(error));
    }
    me = data.user.id;
    const D = await loadAll(me);
    const u = D.users.find((x) => x.id === me);
    if (!u?.active) { await sb.auth.signOut(); throw new Error("Tu cuenta todavía no está activa. Un administrador tiene que habilitarla."); }
    S.setDb(D);
    return u;
  },

  rememberSession(remember) {
    if (remember) localStorage.removeItem(NOREM); else { localStorage.setItem(NOREM, "1"); sessionStorage.setItem(TABFLAG, "1"); }
  },

  async logout() {
    pending.forEach((_, id) => flushProgress(id));
    await flushMinutes().catch(() => {});
    await sb.auth.signOut();
    me = null;
    localStorage.removeItem(NOREM);
    S.setDb(emptyDb());
  },

  async register({ name, email, user, pass, code }) {
    const chk = must(await sb.rpc("check_access_code", { p_code: code || "" }));
    if (!chk?.ok) throw new Error("El código de acceso no es válido o ya alcanzó su cupo");
    if (!must(await sb.rpc("username_available", { p_user: user }))) throw new Error("Ese nombre de usuario ya está en uso");
    const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { full_name: name, username: user.toLowerCase(), code: code.toUpperCase() }, emailRedirectTo: CONFIG.siteUrl } });
    if (error) throw new Error(/registered|exists/i.test(error.message) ? "Ya existe una cuenta con ese email" : friendly(error));
    if (!data.session) return { user: null, needsConfirm: true };
    me = data.user.id;
    const D = await loadAll(me);
    S.setDb(D);
    return { user: D.users.find((x) => x.id === me), needsConfirm: false };
  },

  async recover(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: CONFIG.siteUrl });
    if (error && !/rate/i.test(error.message)) throw new Error(friendly(error));
    if (error) throw new Error("Pediste demasiados correos seguidos. Probá de nuevo en unos minutos.");
  },
  async updatePassword(next) { const { error } = await sb.auth.updateUser({ password: next }); if (error) throw new Error(friendly(error)); },
  async changePassword(current, next) {
    const u = S.user(me);
    const { error } = await sb.auth.signInWithPassword({ email: u.email, password: current });
    if (error) throw new Error("La contraseña actual no es correcta");
    await remoteAdapter.updatePassword(next);
  },

  async verify(code) {
    const r = must(await sb.rpc("verify_certificate", { p_code: code }));
    return r || { valid: false };
  },

  /* ---------------- exámenes (corrección en el servidor) */
  async startExam(cid) {
    const r = must(await sb.rpc("start_exam", { p_course: cid }));
    return { ...r, startedAt: ms(r.started_at) };
  },
  async gradeExam(u, cid, answers) {
    const r = must(await sb.rpc("grade_exam", { p_course: cid, p_answers: answers }));
    const e = S.enrollment(u, cid);
    if (e) e.attempts.push({ at: Date.now(), score: r.score, passed: r.passed });
    if (r.certificate) {
      const c = r.certificate;
      const ct = { code: c.code, uid: c.user_id, cid: c.course_id, at: ms(c.issued_at), score: c.score, min: c.minutes };
      S.db.certs.push(ct);
      if (e) { e.cert = ct.code; e.completedAt = ct.at; }
      r.certificate = ct;
    }
    S.save();
    return r;
  },
  async completeCourse(u, c) {
    await flushProgress(S.enrollment(u, c.id)?.id);
    const r = must(await sb.rpc("complete_course", { p_course: c.id }));
    const ct = { code: r.code, uid: r.user_id, cid: r.course_id, at: ms(r.issued_at), score: r.score, min: r.minutes };
    if (!S.cert(ct.code)) S.db.certs.push(ct);
    const e = S.enrollment(u, c.id);
    if (e) { e.cert = ct.code; e.completedAt = ct.at; }
    S.save();
  },

  /* ---------------- escrituras del alumno */
  async enroll(e) {
    const r = must(await sb.from("enrollments").insert({ id: e.id, user_id: e.uid, course_id: e.cid, last: e.last }).select().single());
    e.id = r.id;
  },
  async progress(e) { queueProgress(e); },
  async event(ev) { if (ev.uid !== me) return; must(await sb.from("events").insert({ type: ev.type, course_id: ev.cid, lesson_id: ev.lid || null })); },
  async minutes(m) { minutesAcc += m; if (minutesAcc >= 1) await flushMinutes(); },
  async notify(n) { must(await sb.from("notifications").insert({ id: n.id, user_id: n.uid, title: n.title, text: n.text, link: n.link || "", icon: n.icon || "bell" })); },
  async notifsRead() { must(await sb.from("notifications").update({ read: true }).eq("user_id", me).eq("read", false)); },
  async profile(u) {
    if (u.id !== me) return;
    must(await sb.from("profiles").update({ full_name: u.name, area: u.area || "", goal: u.goal, saved: u.saved || [] }).eq("id", me));
  },
  async watch(cid, on) {
    if (on) must(await sb.from("course_watch").insert({ course_id: cid }));
    else must(await sb.from("course_watch").delete().eq("course_id", cid).eq("user_id", me));
  },
  async note(n) { must(await sb.from("notes").insert({ id: n.id, course_id: n.cid, lesson_id: n.lid, t: n.t, text: n.text })); },
  async deleteNote(id) { must(await sb.from("notes").delete().eq("id", id)); },
  async thread(t) { must(await sb.from("threads").insert({ id: t.id, course_id: t.cid, lesson_id: t.lid, text: t.text })); },
  async reply(t, r) { must(await sb.from("thread_replies").insert({ id: r.id, thread_id: t.id, instructor_id: r.iid || null, text: r.text })); },
  async review(r) { must(await sb.from("reviews").upsert({ id: r.id, course_id: r.cid, user_id: me, stars: r.stars, text: r.text, at: iso(r.at) }, { onConflict: "course_id,user_id" })); },
  async rsvp(sid, on) {
    if (on) must(await sb.from("live_rsvp").insert({ session_id: sid }));
    else must(await sb.from("live_rsvp").delete().eq("session_id", sid).eq("user_id", me));
  },
  async liveQuestion(sid, q) { must(await sb.from("live_questions").insert({ id: q.id, session_id: sid, text: q.text })); },
  async vote(qid, on) {
    if (on) must(await sb.from("live_votes").insert({ question_id: qid }));
    else must(await sb.from("live_votes").delete().eq("question_id", qid).eq("user_id", me));
  },

  /* ---------------- archivos */
  async materialUrl(path) {
    const { data, error } = await sb.storage.from("materiales").createSignedUrl(path, 120, { download: true });
    if (error) throw new Error(friendly(error));
    return data.signedUrl;
  },
  async upload(bucket, file, path) {
    must(await sb.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || undefined }));
    return bucket === "portadas" ? sb.storage.from(bucket).getPublicUrl(path).data.publicUrl : path;
  },

  /* ---------------- administración */
  async course(c) {
    must(await sb.from("courses").upsert(fromCourse(c)));
    const cfg = c.exam ? { pass: c.exam.pass, minutes: c.exam.minutes, attempts: c.exam.attempts } : null;
    if (!c.exam || c.exam.qs.every((q) => q && q.q)) must(await sb.rpc("admin_set_exam", { p_course: c.id, p_config: cfg, p_questions: c.exam ? c.exam.qs : [] }));
  },
  async deleteCourse(cid) { must(await sb.from("courses").delete().eq("id", cid)); },
  async adminProfile(id, data) {
    const p = {};
    if ("name" in data) p.full_name = data.name;
    ["company", "area", "role", "active"].forEach((k) => { if (k in data) p[k] = data[k]; });
    must(await sb.rpc("admin_update_profile", { p_user: id, p_data: p }));
  },
  async unenroll(u, cid) { must(await sb.from("enrollments").delete().eq("user_id", u).eq("course_id", cid)); },
  async resetAttempts(u, cid) { must(await sb.rpc("admin_reset_attempts", { p_user: u, p_course: cid })); },
  async code(c) { must(await sb.from("access_codes").upsert({ code: c.code, company: c.company, course_ids: c.courses, max_uses: c.max, active: c.active })); },
  async deleteCode(code) { must(await sb.from("access_codes").delete().eq("code", code)); },
  async live(s) {
    must(await sb.from("live_sessions").upsert({ id: s.id, title: s.title, descr: s.desc || "", at: iso(s.at), minutes: s.min, by_ids: s.by, course_id: s.cid || null, kind: s.kind || "youtube", link: s.link || "", rec: !!s.rec, rec_url: s.recUrl || "" }));
  },
  async deleteLive(id) { must(await sb.from("live_sessions").delete().eq("id", id)); },
  async revokeCert(code) { must(await sb.rpc("admin_revoke_cert", { p_code: code })); },
  async settings(data) { must(await sb.from("settings").upsert(Object.entries(data).map(([key, value]) => ({ key, value: String(value ?? "") })))); },

  /* Alta de alumnos desde el panel: se crea un código de un solo uso y se registra la cuenta
     con un cliente aparte (así la sesión del administrador no se toca) */
  async createUser({ name, email, user, pass, company, courses }) {
    const code = ("ALTA-" + crypto.randomUUID().replace(/-/g, "").slice(0, 10)).toUpperCase();
    must(await sb.from("access_codes").insert({ code, company: company || "", course_ids: courses || [], max_uses: 1 }));
    const tmp = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "amp_tmp_" + code } });
    const { data, error } = await tmp.auth.signUp({ email, password: pass, options: { data: { full_name: name, username: user.toLowerCase(), code }, emailRedirectTo: CONFIG.siteUrl } });
    await sb.from("access_codes").update({ active: false }).eq("code", code);
    if (error) throw new Error(/registered|exists/i.test(error.message) ? `Ya existe una cuenta con ${email}` : friendly(error));
    const id = data.user?.id;
    const u = { id, name, user: user.toLowerCase(), email, role: "alumno", company: company || "", area: "", goal: 120, saved: [], active: true, joined: Date.now(), lastSeen: 0, pendingConfirm: !data.session };
    S.db.users.push(u);
    (courses || []).forEach((cid) => S.db.enr.push({ id: crypto.randomUUID(), uid: id, cid, at: Date.now(), done: {}, pos: {}, quiz: {}, attempts: [], completedAt: null, cert: null, last: null }));
    if (company && !S.db.companies.includes(company)) S.db.companies.push(company);
    S.save();
    return u;
  },
};

function friendly(err) {
  const m = String(err?.message || err || "");
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "Sin conexión con el servidor. Revisá tu internet.";
  if (/JWT|expired|token/i.test(m)) return "Tu sesión venció. Volvé a ingresar.";
  if (/row-level security|permission denied|not allowed/i.test(m)) return "No tenés permiso para hacer eso.";
  if (/duplicate key/i.test(m)) return "Ese dato ya existe.";
  if (/Password should be at least|weak/i.test(m)) return "La contraseña es demasiado débil.";
  return m || "Ocurrió un error inesperado.";
}
