/* Panel de administración: resumen, cursos (editor), alumnos, códigos, clases en vivo, reportes */
import { icon } from "../core/icons.js";
import { esc, fmtDate, fmtDur, fmtHours, relTime, dayKey, DAY, MON, toCSV, download, uid, slugify, plural, ytId, $, $$, debounce } from "../core/util.js";
import { KINDS } from "./agenda.js";
import * as S from "../core/store.js";
import { me } from "../core/auth.js";
import { go, refresh } from "../core/router.js";
import { avatar, bar, toast, modal, confirmDialog, field, cover, empty, animateIn, typeLabel, lessonIcon, resetShell } from "../core/ui.js";

const LEVELS = ["Inicial", "Intermedio", "Avanzado"];
const COVERS = ["lean", "layout", "logistica", "5s", "kaizen", "liderazgo", "equipos", "ia", "indicadores", "control"];
const DEMO_VIDEOS = ["ink", "drops", "wave", "light", "mist", "fil", "rise"];

const adminHead = (kicker, title, actions = "") => `<section class="page-head adm-head"><div><span class="kicker">${kicker}</span><h1 class="display">${title}</h1></div>${actions ? `<div class="head-acts">${actions}</div>` : ""}</section>`;

function studentStats(u) {
  const es = S.enrollmentsOf(u.id).map((e) => ({ e, c: S.course(e.cid) })).filter((x) => x.c);
  const ps = es.map((x) => S.progress(x.e, x.c));
  return {
    n: es.length,
    avg: ps.length ? Math.round(ps.reduce((s, p) => s + p.pct, 0) / ps.length) : 0,
    certs: S.certsOf(u.id).length,
    last: u.lastSeen || 0,
    pending: ps.filter((p) => p.status !== "done").length,
  };
}
const students = () => S.db.users.filter((u) => u.role !== "admin");
const safeName = (n) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "-").slice(-80);
/* Quita opciones vacías sin perder cuál es la correcta */
const compactQ = (qq) => { const kept = qq.o.map((t, j) => ({ t: String(t || "").trim(), j })).filter((x) => x.t); return { ...qq, q: qq.q.trim(), o: kept.map((x) => x.t), a: Math.max(0, kept.findIndex((x) => x.j === qq.a)) }; };
const tempPass = () => "Amp-" + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("") + "7";

/* ================================================================== RESUMEN */
export function adminHome() {
  const st = students();
  const now = Date.now();
  const active30 = st.filter((u) => now - (u.lastSeen || 0) < 30 * DAY).length;
  const enr = S.db.enr.filter((e) => S.user(e.uid)?.role !== "admin");
  const finished = enr.filter((e) => e.cert).length;
  const mins = st.reduce((s, u) => s + S.minutesTotal(u.id), 0);
  const attempts = enr.flatMap((e) => e.attempts);
  const avgScore = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;

  /* Minutos por semana (12 semanas) */
  const weeks = 12, start = now - weeks * 7 * DAY;
  const wk = Array(weeks).fill(0);
  st.forEach((u) => Object.entries(S.activityOf(u.id)).forEach(([k, m]) => { const t = new Date(k + "T12:00:00").getTime(); const i = Math.floor((t - start) / (7 * DAY)); if (i >= 0 && i < weeks) wk[i] += m; }));
  const maxW = Math.max(...wk, 1);

  const courses = S.db.courses.filter((c) => !c.soon).map((c) => {
    const es = enr.filter((e) => e.cid === c.id);
    const avg = es.length ? Math.round(es.reduce((s, e) => s + S.progress(e, c).pct, 0) / es.length) : 0;
    return { c, n: es.length, avg, done: es.filter((e) => e.cert).length, rt: S.rating(c.id) };
  }).sort((a, b) => b.n - a.n);

  const companies = S.db.companies.map((co) => {
    const us = st.filter((u) => u.company === co);
    const ss = us.map(studentStats);
    return { co, n: us.length, avg: ss.length ? Math.round(ss.reduce((s, x) => s + x.avg, 0) / ss.length) : 0, certs: ss.reduce((s, x) => s + x.certs, 0) };
  }).filter((x) => x.n);

  const atRisk = st.map((u) => ({ u, s: studentStats(u) })).filter((x) => x.s.pending && now - x.s.last > 14 * DAY).sort((a, b) => a.s.last - b.s.last).slice(0, 6);
  const open = S.db.threads.filter((t) => !t.replies.length).sort((a, b) => b.at - a.at);

  return {
    title: "Administración", nav: "admin",
    html: `${adminHead("Administración", "Así va el <em>campus</em>.", `<a class="btn ghost" href="#/admin/reportes">${icon("download", "sm")} Reportes</a><a class="btn" href="#/admin/cursos/nuevo">${icon("plus", "sm")} Nuevo curso</a>`)}
    <div class="kpis kpis-6">
      <div class="kpi"><b>${st.length}</b><small>alumnos</small><em>${active30} activos en 30 días</em></div>
      <div class="kpi"><b>${enr.length}</b><small>inscripciones</small><em>${S.db.courses.filter((c) => c.published && !c.soon).length} cursos publicados</em></div>
      <div class="kpi"><b>${enr.length ? Math.round((finished / enr.length) * 100) : 0}%</b><small>tasa de finalización</small><em>${finished} cursos aprobados</em></div>
      <div class="kpi"><b>${S.db.certs.length}</b><small>certificados emitidos</small></div>
      <div class="kpi"><b>${fmtHours(mins)}</b><small>horas de aprendizaje</small></div>
      <div class="kpi"><b>${avgScore}%</b><small>nota promedio</small><em>${attempts.length} exámenes rendidos</em></div>
    </div>

    <div class="adm-grid">
      <section class="panel span2">
        <div class="panel-head"><div><span class="kicker">Actividad</span><h2>Minutos de estudio por semana</h2></div></div>
        <div class="chart" role="img" aria-label="Minutos por semana">
          ${wk.map((m, i) => { const d = new Date(start + i * 7 * DAY); return `<div class="chart-col"><span class="chart-v">${Math.round(m)}</span><i style="--h:${(m / maxW) * 100}%" class="${i === weeks - 1 ? "is-cur" : ""}"></i><small>${d.getDate()} ${MON[d.getMonth()]}</small></div>`; }).join("")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><div><span class="kicker">Atención</span><h2>Alumnos sin actividad</h2></div></div>
        ${atRisk.length ? `<ul class="risk">${atRisk.map(({ u, s }) => `<li>${avatar(u)}<div><b>${esc(u.name)}</b><small>${esc(u.company || "Sin empresa")} · ${s.pending} cursos pendientes · última vez ${relTime(s.last)}</small></div><button class="btn ghost sm" data-nudge="${u.id}">${icon("bell", "sm")} Recordar</button></li>`).join("")}</ul>` : `<p class="muted small">Todos los alumnos estuvieron activos en las últimas dos semanas.</p>`}
      </section>

      <section class="panel">
        <div class="panel-head"><div><span class="kicker">Comunidad</span><h2>Preguntas sin responder <small class="count">${open.length}</small></h2></div></div>
        ${open.length ? `<ul class="qlist">${open.slice(0, 5).map((t) => { const c = S.course(t.cid); const f = c && S.findLesson(c, t.lid); return `<li><div><b>${esc(t.text)}</b><small>${esc(S.user(t.uid)?.name || "")} · ${esc(c?.title || "")} · ${esc(f?.l.t || "")}</small></div><button class="btn sm" data-answer="${t.id}">Responder</button></li>`; }).join("")}</ul>` : `<p class="muted small">No hay preguntas pendientes. ¡Bien!</p>`}
      </section>

      <section class="panel span2">
        <div class="panel-head"><div><span class="kicker">Cursos</span><h2>Desempeño por curso</h2></div><a class="link" href="#/admin/cursos">Gestionar ${icon("right", "sm")}</a></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Curso</th><th class="num">Inscriptos</th><th>Avance promedio</th><th class="num">Aprobados</th><th class="num">Valoración</th></tr></thead>
          <tbody>${courses.map((x) => `<tr><td><a class="cell-course" href="#/admin/cursos/${x.c.id}">${cover(x.c, "xs")}<span><b>${esc(x.c.title)}</b><small>${esc(S.category(x.c.cat).short)}${x.c.published ? "" : " · borrador"}</small></span></a></td><td class="num">${x.n}</td><td><div class="cell-bar">${bar(x.avg)}<small>${x.avg}%</small></div></td><td class="num">${x.done}</td><td class="num">${x.rt.n ? x.rt.avg.toFixed(1).replace(".", ",") + " ★" : "—"}</td></tr>`).join("")}</tbody>
        </table></div>
      </section>

      <section class="panel span2">
        <div class="panel-head"><div><span class="kicker">Empresas</span><h2>Avance por empresa</h2></div><a class="link" href="#/admin/alumnos">Ver alumnos ${icon("right", "sm")}</a></div>
        <div class="co-grid">${companies.map((x) => `<a class="co" href="#/admin/alumnos?empresa=${encodeURIComponent(x.co)}"><span class="co-ic">${icon("building")}</span><b>${esc(x.co)}</b><small>${x.n} alumnos · ${x.certs} certificados</small>${bar(x.avg)}<em>${x.avg}% de avance promedio</em></a>`).join("")}</div>
      </section>
    </div>`,
    mount(host) {
      animateIn(host);
      host.addEventListener("click", (e) => {
        const n = e.target.closest("[data-nudge]"), a = e.target.closest("[data-answer]");
        if (n) {
          const u = S.user(n.dataset.nudge);
          S.admin.nudge(u.id);
          n.disabled = true; n.innerHTML = `${icon("check", "sm")} Enviado`;
          toast(`Recordatorio enviado a ${u.name}`);
        }
        if (a) answerThread(a.dataset.answer);
      });
    },
  };
}

function answerThread(tid) {
  const t = S.db.threads.find((x) => x.id === tid);
  const c = S.course(t.cid);
  const m = modal({ title: "Responder pregunta", body: `<blockquote class="quote"><p>${esc(t.text)}</p><small>${esc(S.user(t.uid)?.name || "")} · ${esc(c?.title || "")}</small></blockquote>
    <form class="form" data-f><label class="field"><span class="field-l">Responder como</span><select class="input" name="as">${S.db.instructors.map((i) => `<option value="${i.id}">${esc(i.name)}</option>`).join("")}</select></label>
    <label class="field"><span class="field-l">Respuesta</span><textarea class="input" name="text" rows="4" required></textarea></label></form>`,
    actions: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" data-send>Publicar respuesta</button>` });
  $("[data-send]", m.el).addEventListener("click", () => {
    const f = $("[data-f]", m.el);
    if (!f.text.value.trim()) return toast("Escribí la respuesta", "err");
    S.addReply(t.id, me().id, f.text.value.trim(), f.as.value);
    S.notify(t.uid, "Respondieron tu pregunta", c?.title || "", `#/aprender/${c.slug}/${t.lid}`, "chat");
    m.close(); toast("Respuesta publicada"); refresh();
  });
}

/* ================================================================== CURSOS */
export function adminCourses() {
  const list = S.db.courses.slice().sort((a, b) => a.order - b.order);
  return {
    title: "Cursos", nav: "admin-cursos",
    html: `${adminHead("Administración · Cursos", `${list.length} <em>cursos</em>`, `<a class="btn" href="#/admin/cursos/nuevo">${icon("plus", "sm")} Nuevo curso</a>`)}
    <div class="table-wrap"><table class="table cards-m">
      <thead><tr><th>Curso</th><th>Estado</th><th class="num">Lecciones</th><th class="num">Duración</th><th class="num">Inscriptos</th><th class="num">Examen</th><th></th></tr></thead>
      <tbody>${list.map((c) => `<tr>
        <td data-l="Curso"><a class="cell-course" href="#/admin/cursos/${c.id}">${cover(c, "xs")}<span><b>${esc(c.title)}</b><small>${esc(S.category(c.cat).name)} · ${esc(c.instructors.map((i) => S.instructor(i)?.name.split(" ")[0]).join(", "))}</small></span></a></td>
        <td data-l="Estado"><span class="chip ${!c.published ? "" : c.soon ? "chip-soon" : "chip-ok"}">${!c.published ? "Borrador" : c.soon ? "Próximamente" : "Publicado"}</span></td>
        <td data-l="Lecciones" class="num">${S.lessonsOf(c).length}</td>
        <td data-l="Duración" class="num">${fmtDur(S.courseMinutes(c))}</td>
        <td data-l="Inscriptos" class="num">${S.enrolledCount(c.id)}</td>
        <td data-l="Examen" class="num">${c.exam ? c.exam.qs.length + " preg." : "—"}</td>
        <td class="acts"><a class="icon-btn" href="#/admin/cursos/${c.id}" aria-label="Editar">${icon("edit")}</a><a class="icon-btn" href="#/curso/${c.slug}" aria-label="Ver como alumno">${icon("eye")}</a><button class="icon-btn" data-dup="${c.id}" aria-label="Duplicar">${icon("copy")}</button><button class="icon-btn" data-del="${c.id}" aria-label="Eliminar">${icon("trash")}</button></td>
      </tr>`).join("")}</tbody>
    </table></div>`,
    mount(host) {
      host.addEventListener("click", async (e) => {
        const d = e.target.closest("[data-del]"), du = e.target.closest("[data-dup]");
        if (d) {
          const c = S.course(d.dataset.del);
          const n = S.enrolledCount(c.id);
          if (await confirmDialog(`Se elimina «${c.title}»${n ? ` y el progreso de ${n} alumnos inscriptos` : ""}. No se puede deshacer.`, { title: "¿Eliminar el curso?", ok: "Eliminar", danger: true })) { S.admin.deleteCourse(c.id); toast("Curso eliminado"); refresh(); }
        }
        if (du) {
          const c = structuredClone(S.course(du.dataset.dup));
          const key = uid("k").slice(2);
          c.id = "c-" + key; c.key = key; c.slug = c.slug + "-copia"; c.title += " (copia)"; c.published = false; c.order = S.db.courses.length;
          c.modules.forEach((m, mi) => { m.id = `${key}-m${mi + 1}`; m.lessons.forEach((l, li) => (l.id = `${key}-${mi + 1}-${li + 1}`)); });
          S.admin.saveCourse(c); toast("Curso duplicado como borrador"); refresh();
        }
      });
    },
  };
}

/* ------------------------------------------------------------------ editor */
export function adminCourseEditor({ id }) {
  const isNew = id === "nuevo";
  const src = isNew ? S.admin.newCourse() : S.course(id);
  if (!src) { go("/admin/cursos", { replace: true }); return null; }
  const d = structuredClone(src);
  if (!d.exam) d.exam = { pass: 70, minutes: 10, attempts: 3, qs: [], off: true };
  let dirty = isNew;
  let tab = "datos";

  const coverPicker = () => {
    const opts = [null, ...COVERS.map((k) => `img/covers/${k}.jpg`)];
    if (d.cover && !opts.includes(d.cover)) opts.push(d.cover);
    return `<div class="cover-pick">${opts.map((path) => `<button type="button" class="cp ${d.cover === path ? "on" : ""}" data-cover="${esc(path || "")}" aria-label="${path ? "Portada" : "Arte generado"}">${cover({ ...d, cover: path })}</button>`).join("")}
      ${S.MODE === "supabase" ? `<label class="cp cp-up">${icon("upload")}<span>Subir imagen</span><input type="file" accept="image/jpeg,image/png,image/webp" data-coverup hidden></label>` : ""}</div>`;
  };

  const lessonRow = (l, mi, li) => `<li class="ed-lesson"><span class="ed-ic">${icon(lessonIcon(l), "sm")}</span><span class="ed-lt"><b>${esc(l.t)}</b><small>${typeLabel[l.type]} · ${l.min} min${(l.res || []).length ? ` · ${plural(l.res.length, "material", "materiales")}` : ""}${l.type === "video" && !l.v ? " · <em>sin video</em>" : ""}${l.type === "quiz" ? ` · ${plural((l.qs || []).length, "pregunta", "preguntas")}` : ""}</small></span>
    <span class="ed-acts"><button type="button" class="icon-btn sm" data-lup="${mi}:${li}" aria-label="Subir">${icon("up", "sm")}</button><button type="button" class="icon-btn sm" data-ldown="${mi}:${li}" aria-label="Bajar">${icon("down", "sm")}</button><button type="button" class="icon-btn sm" data-ledit="${mi}:${li}" aria-label="Editar">${icon("edit", "sm")}</button><button type="button" class="icon-btn sm" data-ldel="${mi}:${li}" aria-label="Eliminar">${icon("trash", "sm")}</button></span></li>`;

  const qEditor = (qs, prefix) => qs.map((qq, i) => `<div class="qed" data-q="${prefix}${i}">
    <div class="qed-h"><b>Pregunta ${i + 1}</b><span><button type="button" class="icon-btn sm" data-qup="${prefix}${i}" aria-label="Subir">${icon("up", "sm")}</button><button type="button" class="icon-btn sm" data-qdel="${prefix}${i}" aria-label="Eliminar">${icon("trash", "sm")}</button></span></div>
    <textarea class="input" rows="2" data-qf="q" placeholder="Enunciado">${esc(qq.q)}</textarea>
    <div class="qed-opts">${[0, 1, 2, 3].map((j) => `<label class="qed-opt"><input type="radio" name="${prefix}a${i}" value="${j}" ${qq.a === j ? "checked" : ""} data-qf="a" aria-label="Marcar como correcta"><span class="opt-l">${"ABCD"[j]}</span><input class="input" data-qf="o${j}" value="${esc(qq.o[j] || "")}" placeholder="Opción ${"ABCD"[j]}"></label>`).join("")}</div>
    <input class="input" data-qf="e" value="${esc(qq.e || "")}" placeholder="Explicación (se muestra al corregir)">
  </div>`).join("");

  const panes = () => ({
    datos: `<div class="ed-form">
      <div class="grid2">${field("Título", `<input class="input" data-k="title" value="${esc(d.title)}" required>`)}${field("Dirección (slug)", `<input class="input mono" data-k="slug" value="${esc(d.slug)}">`, `#/curso/${esc(d.slug)}`)}</div>
      ${field("Subtítulo", `<input class="input" data-k="subtitle" value="${esc(d.subtitle)}" maxlength="120">`)}
      <div class="grid3">
        ${field("Frente", `<select class="input" data-k="cat">${S.db.categories.map((c) => `<option value="${c.id}" ${d.cat === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>`)}
        ${field("Nivel", `<select class="input" data-k="level">${LEVELS.map((l) => `<option ${d.level === l ? "selected" : ""}>${l}</option>`).join("")}</select>`)}
        <div class="field"><span class="field-l">Instructores</span><div class="checks">${S.db.instructors.map((i) => `<label class="check"><input type="checkbox" data-ins="${i.id}" ${d.instructors.includes(i.id) ? "checked" : ""}><span></span>${esc(i.name)}</label>`).join("")}</div></div>
      </div>
      <div class="field"><span class="field-l">Portada</span>${coverPicker()}<small class="field-h">${S.MODE === "supabase" ? "Imagen horizontal de 1200 × 750 px, hasta 2 MB." : "Al conectar Supabase se pueden subir imágenes propias (1200 × 750 px)."}</small></div>
      ${field("Descripción", `<textarea class="input" rows="4" data-k="desc">${esc(d.desc)}</textarea>`)}
      ${field("Lo que vas a aprender", `<textarea class="input" rows="5" data-k="outcomes" data-lines>${esc(d.outcomes.join("\n"))}</textarea>`, "Un objetivo por línea")}
      <div class="grid2">${field("Para quién es", `<textarea class="input" rows="3" data-k="forWho">${esc(d.forWho)}</textarea>`)}${field("Requisitos", `<textarea class="input" rows="3" data-k="req">${esc(d.req)}</textarea>`)}</div>
    </div>`,
    programa: `<div class="ed-prog">
      ${d.modules.map((m, mi) => `<section class="ed-mod">
        <div class="ed-mod-h"><span class="mod-n">${String(mi + 1).padStart(2, "0")}</span><input class="input" data-mt="${mi}" value="${esc(m.t)}" aria-label="Título del módulo">
          <span class="ed-acts"><button type="button" class="icon-btn sm" data-mup="${mi}" aria-label="Subir módulo">${icon("up", "sm")}</button><button type="button" class="icon-btn sm" data-mdown="${mi}" aria-label="Bajar módulo">${icon("down", "sm")}</button><button type="button" class="icon-btn sm" data-mdel="${mi}" aria-label="Eliminar módulo">${icon("trash", "sm")}</button></span></div>
        <ol class="ed-lessons">${m.lessons.map((l, li) => lessonRow(l, mi, li)).join("")}</ol>
        <div class="ed-add"><button type="button" class="btn ghost sm" data-ladd="${mi}:video">${icon("video", "sm")} Video</button><button type="button" class="btn ghost sm" data-ladd="${mi}:lectura">${icon("read", "sm")} Lectura</button><button type="button" class="btn ghost sm" data-ladd="${mi}:quiz">${icon("quiz", "sm")} Control</button></div>
      </section>`).join("")}
      <button type="button" class="btn ghost block" data-madd>${icon("plus", "sm")} Agregar módulo</button>
    </div>`,
    examen: `<div class="ed-form">
      <label class="switch"><input type="checkbox" data-examon ${d.exam.off ? "" : "checked"}><span></span>Este curso tiene examen final (necesario para el certificado)</label>
      <div class="grid3" ${d.exam.off ? "hidden" : ""}>
        ${field("Nota para aprobar (%)", `<input class="input" type="number" min="40" max="100" step="5" data-ex="pass" value="${d.exam.pass}">`)}
        ${field("Tiempo (minutos)", `<input class="input" type="number" min="1" max="180" data-ex="minutes" value="${d.exam.minutes}">`)}
        ${field("Intentos", `<input class="input" type="number" min="1" max="10" data-ex="attempts" value="${d.exam.attempts}">`)}
      </div>
      <div ${d.exam.off ? "hidden" : ""}>
        <div class="block-head"><h3>Preguntas <small class="count">${d.exam.qs.length}</small></h3><button type="button" class="btn ghost sm" data-qadd="x">${icon("plus", "sm")} Agregar pregunta</button></div>
        <p class="muted small">Marcá con el círculo la opción correcta. Los alumnos ven las preguntas y las opciones en orden aleatorio.</p>
        <div class="qeds" data-qeds="x">${qEditor(d.exam.qs, "x")}</div>
      </div>
    </div>`,
    publicacion: `<div class="ed-form">
      <div class="field"><span class="field-l">Estado</span><div class="seg-ctl">${[["draft", "Borrador", "Solo lo ven los administradores"], ["soon", "Próximamente", "Aparece en el catálogo con «Avisarme»"], ["pub", "Publicado", "Los alumnos pueden inscribirse"]].map(([v, t, s]) => `<label><input type="radio" name="status" value="${v}" ${(!d.published && v === "draft") || (d.published && d.soon && v === "soon") || (d.published && !d.soon && v === "pub") ? "checked" : ""}><span><b>${t}</b><small>${s}</small></span></label>`).join("")}</div></div>
      <label class="switch"><input type="checkbox" data-flag="featured" ${d.featured ? "checked" : ""}><span></span>Destacado en el catálogo</label>
      <label class="switch"><input type="checkbox" data-flag="isNew" ${d.isNew ? "checked" : ""}><span></span>Mostrar etiqueta «Nuevo»</label>
      <div class="notice">${icon("users")}<div><b>${S.enrolledCount(d.id)} alumnos inscriptos</b><small>Los cambios en el programa se aplican al instante; el progreso ya hecho se conserva.</small></div><a class="btn ghost sm" href="#/admin/alumnos">Asignar a alumnos</a></div>
    </div>`,
  });

  const html = () => `
    <nav class="crumbs"><a href="#/admin/cursos">Cursos</a>${icon("right", "xs")}<span>${isNew ? "Nuevo curso" : esc(src.title)}</span></nav>
    ${adminHead(isNew ? "Nuevo curso" : "Editar curso", esc(d.title || "Sin título"), `${isNew ? "" : `<a class="btn ghost" href="#/curso/${d.slug}">${icon("eye", "sm")} Ver</a>`}<button class="btn" data-save>${icon("check", "sm")} Guardar</button>`)}
    <div class="tabs" role="tablist">${[["datos", "Datos"], ["programa", "Programa"], ["examen", "Examen final"], ["publicacion", "Publicación"]].map(([k, t]) => `<button role="tab" data-etab="${k}" aria-selected="${tab === k}">${t}${k === "programa" ? ` <small>${S.lessonsOf(d).length}</small>` : k === "examen" && !d.exam.off ? ` <small>${d.exam.qs.length}</small>` : ""}</button>`).join("")}</div>
    <div class="ed-pane" data-pane>${panes()[tab]}</div>
    <div class="savebar ${dirty ? "is-dirty" : ""}" data-savebar><span>${icon("info", "sm")} Tenés cambios sin guardar</span><button class="btn sm" data-save>Guardar cambios</button></div>`;

  return {
    title: isNew ? "Nuevo curso" : "Editar · " + src.title, nav: "admin-cursos",
    html: `<div class="editor">${html()}</div>`,
    mount(host) {
      const root = $(".editor", host);
      const rerender = () => { readQs(); root.innerHTML = html(); };
      const mark = () => { dirty = true; $("[data-savebar]", root)?.classList.add("is-dirty"); };
      const readQs = () => {
        $$("[data-q]", root).forEach((el) => {
          const key = el.dataset.q;
          const arr = key[0] === "x" ? d.exam.qs : null;
          if (!arr) return;
          const qq = arr[+key.slice(1)];
          if (!qq) return;
          qq.q = $('[data-qf="q"]', el).value;
          qq.o = [0, 1, 2, 3].map((j) => $(`[data-qf="o${j}"]`, el).value);
          const ch = $('[data-qf="a"]:checked', el); qq.a = ch ? +ch.value : 0;
          qq.e = $('[data-qf="e"]', el).value;
        });
      };

      root.addEventListener("input", (e) => {
        const t = e.target;
        if (t.dataset.k) { d[t.dataset.k] = t.dataset.lines !== undefined ? t.value.split("\n").map((x) => x.trim()).filter(Boolean) : t.value; mark(); if (t.dataset.k === "title" && isNew && !d._slugTouched) { d.slug = slugify(t.value); const s = $('[data-k="slug"]', root); if (s) s.value = d.slug; } if (t.dataset.k === "slug") d._slugTouched = true; }
        if (t.dataset.mt !== undefined) { d.modules[+t.dataset.mt].t = t.value; mark(); }
        if (t.dataset.ex) { d.exam[t.dataset.ex] = +t.value; mark(); }
        if (t.dataset.qf) mark();
      });
      root.addEventListener("change", async (e) => {
        const t = e.target;
        if (t.dataset.coverup !== undefined && t.files[0]) {
          const f = t.files[0];
          if (f.size > 2 * 1024 * 1024) return toast("La imagen supera los 2 MB", "err");
          try { toast("Subiendo imagen…", "info"); d.cover = await S.api.upload("portadas", f, `${d.id}/${Date.now()}-${safeName(f.name)}`); mark(); rerender(); toast("Portada subida"); }
          catch (err) { toast(err.message, "err"); }
          return;
        }
        if (t.dataset.ins) { d.instructors = $$("[data-ins]", root).filter((x) => x.checked).map((x) => x.dataset.ins); mark(); }
        if (t.dataset.examon !== undefined) { d.exam.off = !t.checked; mark(); rerender(); }
        if (t.dataset.flag) { d[t.dataset.flag] = t.checked; mark(); }
        if (t.name === "status") { d.published = t.value !== "draft"; d.soon = t.value === "soon"; mark(); }
        if (t.dataset.qf === "a") mark();
      });
      root.addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const ds = b.dataset;
        const ml = (s) => s.split(":").map(Number);
        if (ds.etab) { readQs(); tab = ds.etab; rerender(); }
        if (ds.cover !== undefined) { d.cover = ds.cover || null; mark(); rerender(); }
        if (ds.madd !== undefined) { const key = d.key; d.modules.push({ id: `${key}-m${uid("").slice(1, 6)}`, t: `Módulo ${d.modules.length + 1}`, lessons: [] }); mark(); rerender(); }
        if (ds.mdel !== undefined) { const m = d.modules[+ds.mdel]; if (m.lessons.length && !(await confirmDialog(`Se eliminan sus ${m.lessons.length} lecciones.`, { title: `¿Eliminar «${m.t}»?`, ok: "Eliminar", danger: true }))) return; d.modules.splice(+ds.mdel, 1); mark(); rerender(); }
        if (ds.mup !== undefined || ds.mdown !== undefined) { const i = +(ds.mup ?? ds.mdown), j = ds.mup !== undefined ? i - 1 : i + 1; if (j < 0 || j >= d.modules.length) return; [d.modules[i], d.modules[j]] = [d.modules[j], d.modules[i]]; mark(); rerender(); }
        if (ds.ladd) { const [mi] = ml(ds.ladd); const type = ds.ladd.split(":")[1]; const l = { id: `${d.key}-${uid("").slice(1, 7)}`, t: type === "quiz" ? "Control del módulo" : type === "lectura" ? "Nueva lectura" : "Nueva lección", type, min: type === "quiz" ? 6 : 10, v: type === "video" ? "ink" : undefined, sum: "", res: [], body: type === "lectura" ? [] : undefined, qs: type === "quiz" ? [] : undefined }; d.modules[mi].lessons.push(l); mark(); rerender(); editLesson(mi, d.modules[mi].lessons.length - 1); }
        if (ds.ldel) { const [mi, li] = ml(ds.ldel); d.modules[mi].lessons.splice(li, 1); mark(); rerender(); }
        if (ds.lup || ds.ldown) { const [mi, li] = ml(ds.lup || ds.ldown); const arr = d.modules[mi].lessons; const j = ds.lup ? li - 1 : li + 1; if (j >= 0 && j < arr.length) { [arr[li], arr[j]] = [arr[j], arr[li]]; } else if (ds.lup && mi > 0) { d.modules[mi - 1].lessons.push(arr.splice(li, 1)[0]); } else if (ds.ldown && mi < d.modules.length - 1) { d.modules[mi + 1].lessons.unshift(arr.splice(li, 1)[0]); } mark(); rerender(); }
        if (ds.ledit) { const [mi, li] = ml(ds.ledit); editLesson(mi, li); }
        if (ds.qadd) { readQs(); d.exam.qs.push({ q: "", o: ["", "", "", ""], a: 0, e: "" }); mark(); rerender(); $$(".qed", root).pop()?.querySelector("textarea")?.focus(); }
        if (ds.qdel) { readQs(); d.exam.qs.splice(+ds.qdel.slice(1), 1); mark(); rerender(); }
        if (ds.qup) { readQs(); const i = +ds.qup.slice(1); if (i > 0) { [d.exam.qs[i - 1], d.exam.qs[i]] = [d.exam.qs[i], d.exam.qs[i - 1]]; mark(); rerender(); } }
        if (ds.save !== undefined) save();
      });

      const save = () => {
        readQs();
        const errs = [];
        if (!d.title.trim()) errs.push("El curso necesita un título.");
        d.slug = slugify(d.slug || d.title);
        if (S.db.courses.some((c) => c.slug === d.slug && c.id !== d.id)) errs.push("Ya existe otro curso con esa dirección (slug).");
        if (!d.instructors.length) errs.push("Elegí al menos un instructor.");
        if (!d.modules.length || !S.lessonsOf(d).length) errs.push("El programa necesita al menos una lección.");
        if (!d.exam.off) d.exam.qs.forEach((qq, i) => { if (!qq.q.trim() || qq.o.filter((x) => x.trim()).length < 2) errs.push(`Pregunta ${i + 1} del examen: completá el enunciado y al menos dos opciones.`); else if (!qq.o[qq.a]?.trim()) errs.push(`Pregunta ${i + 1}: la opción marcada como correcta está vacía.`); });
        if (!d.exam.off && d.published && !d.soon && !d.exam.qs.length) errs.push("Un curso publicado con examen necesita al menos una pregunta.");
        if (errs.length) { toast(errs[0], "err"); return; }
        const out = structuredClone(d);
        delete out._slugTouched;
        out.exam = out.exam.off ? null : { pass: out.exam.pass, minutes: out.exam.minutes, attempts: out.exam.attempts, qs: out.exam.qs.map(compactQ) };
        S.admin.saveCourse(out);
        dirty = false;
        toast("Curso guardado");
        if (isNew) go(`/admin/cursos/${out.id}`, { replace: true }); else $("[data-savebar]", root)?.classList.remove("is-dirty");
      };

      const editLesson = (mi, li) => {
        const l = d.modules[mi].lessons[li];
        const isDemo = l.v && DEMO_VIDEOS.includes(l.v);
        const m = modal({
          title: "Editar lección", cls: "wide",
          body: `<form class="form" data-lf>
            <div class="grid3">
              ${field("Título", `<input class="input" name="t" value="${esc(l.t)}" required>`)}
              ${field("Tipo", `<select class="input" name="type">${["video", "lectura", "quiz"].map((t) => `<option value="${t}" ${l.type === t ? "selected" : ""}>${typeLabel[t]}</option>`).join("")}</select>`)}
              ${field("Duración (min)", `<input class="input" type="number" name="min" min="1" max="240" value="${l.min}">`)}
            </div>
            <div data-only="video" ${l.type === "video" ? "" : "hidden"}>
              ${field("Video", `<input class="input" name="v" value="${esc(isDemo ? "" : l.v || "")}" placeholder="Enlace de Vimeo, YouTube, Bunny Stream o archivo .mp4">`, `O elegí un video de muestra: ${DEMO_VIDEOS.map((v) => `<button type="button" class="link small" data-demo="${v}">${v}</button>`).join(" · ")}${isDemo ? ` (actual: <b>${l.v}</b>)` : ""}`)}
            </div>
            ${field("Resumen", `<textarea class="input" name="sum" rows="2">${esc(l.sum || "")}</textarea>`)}
            ${field("Ideas clave", `<textarea class="input" name="pts" rows="3">${esc((l.pts || []).join("\n"))}</textarea>`, "Una por línea")}
            <div data-only="lectura" ${l.type === "lectura" ? "" : "hidden"}>${field("Texto de la lectura", `<textarea class="input" name="body" rows="8">${esc((l.body || []).join("\n\n"))}</textarea>`, "Separá los párrafos con una línea en blanco")}</div>
            <div data-only="quiz" ${l.type === "quiz" ? "" : "hidden"}>
              <div class="block-head"><h3>Preguntas del control</h3><button type="button" class="btn ghost sm" data-lqadd>${icon("plus", "sm")} Pregunta</button></div>
              <div class="qeds" data-lqs>${qEditor(l.qs || [], "l")}</div>
            </div>
            <div class="field"><span class="field-l">Materiales descargables</span>
              <div class="res-ed" data-resed></div>
              <div class="row-btns"><button type="button" class="btn ghost sm" data-radd>${icon("plus", "sm")} Agregar enlace</button>${S.MODE === "supabase" ? `<label class="btn ghost sm">${icon("upload", "sm")} Subir archivo<input type="file" data-resup hidden></label>` : ""}</div>
              <small class="field-h">${S.MODE === "supabase" ? "Los archivos subidos quedan privados: solo los alumnos con sesión iniciada pueden descargarlos (hasta 50 MB)." : "Al conectar Supabase se pueden subir archivos (PDF, planillas, documentos) al almacenamiento privado del campus."}</small>
            </div>
          </form>`,
          actions: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" data-ok>Aplicar</button>`,
        });
        const f = $("[data-lf]", m.el);
        let qs = structuredClone(l.qs || []);
        let res = structuredClone(l.res || []);
        const readLQ = () => $$("[data-q]", f).forEach((el) => { const qq = qs[+el.dataset.q.slice(1)]; if (!qq) return; qq.q = $('[data-qf="q"]', el).value; qq.o = [0, 1, 2, 3].map((j) => $(`[data-qf="o${j}"]`, el).value); const ch = $('[data-qf="a"]:checked', el); qq.a = ch ? +ch.value : 0; qq.e = $('[data-qf="e"]', el).value; });
        const readRes = () => { res = res.map((r, i) => ({ ...r, n: $(`[data-rn="${i}"]`, f)?.value ?? r.n, k: $(`[data-rk="${i}"]`, f)?.value ?? r.k, url: $(`[data-ru="${i}"]`, f)?.value || r.url })); };
        const drawRes = () => { $("[data-resed]", f).innerHTML = res.map((r, i) => `<div class="res-row"><input class="input" data-rn="${i}" value="${esc(r.n)}" placeholder="Nombre"><select class="input" data-rk="${i}">${[["pdf", "PDF"], ["xlsx", "Planilla"], ["doc", "Documento"]].map(([k, t]) => `<option value="${k}" ${r.k === k ? "selected" : ""}>${t}</option>`).join("")}</select>${r.path ? `<span class="res-file">${icon("checkc", "sm")} Archivo subido</span>` : `<input class="input" data-ru="${i}" value="${esc(r.url || "")}" placeholder="${r.gen ? "Material de muestra" : "Enlace al archivo (https://…)"}">`}<button type="button" class="icon-btn sm" data-rdel="${i}" aria-label="Quitar">${icon("x", "sm")}</button></div>`).join(""); };
        drawRes();
        let demoV = isDemo ? l.v : null;
        f.type.addEventListener("change", () => $$("[data-only]", f).forEach((el) => (el.hidden = el.dataset.only !== f.type.value)));
        f.addEventListener("change", async (e) => {
          if (e.target.dataset.resup === undefined || !e.target.files[0]) return;
          const file = e.target.files[0];
          if (file.size > 50 * 1024 * 1024) return toast("El archivo supera los 50 MB", "err");
          readRes();
          try {
            toast("Subiendo archivo…", "info");
            const path = await S.api.upload("materiales", file, `${d.id}/${l.id}/${Date.now()}-${safeName(file.name)}`);
            const ext = (file.name.split(".").pop() || "").toLowerCase();
            res.push({ n: file.name.replace(/\.[^.]+$/, ""), k: /xls|csv/.test(ext) ? "xlsx" : /doc|txt|ppt/.test(ext) ? "doc" : "pdf", path });
            drawRes();
            toast("Archivo subido");
          } catch (err) { toast(err.message, "err"); }
        });
        m.el.addEventListener("click", (e) => {
          const b = e.target.closest("button");
          if (!b) return;
          if (b.dataset.demo) { demoV = b.dataset.demo; f.v.value = ""; toast(`Video de muestra: ${demoV}`, "info"); }
          if (b.dataset.lqadd !== undefined) { readLQ(); qs.push({ q: "", o: ["", "", "", ""], a: 0, e: "" }); $("[data-lqs]", f).innerHTML = qEditor(qs, "l"); }
          if (b.dataset.qdel && b.dataset.qdel[0] === "l") { readLQ(); qs.splice(+b.dataset.qdel.slice(1), 1); $("[data-lqs]", f).innerHTML = qEditor(qs, "l"); }
          if (b.dataset.radd !== undefined) { readRes(); res.push({ n: "Nuevo material", k: "pdf", url: "" }); drawRes(); }
          if (b.dataset.rdel !== undefined) { readRes(); res.splice(+b.dataset.rdel, 1); drawRes(); }
          if (b.dataset.ok !== undefined) {
            readLQ(); readRes();
            if (!f.t.value.trim()) return toast("La lección necesita un título", "err");
            Object.assign(l, {
              t: f.t.value.trim(), type: f.type.value, min: Math.max(1, +f.min.value || 1),
              v: f.type.value === "video" ? (f.v.value.trim() || demoV || "") : undefined,
              sum: f.sum.value.trim(), pts: f.pts.value.split("\n").map((x) => x.trim()).filter(Boolean),
              body: f.type.value === "lectura" ? f.body.value.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean) : undefined,
              qs: f.type.value === "quiz" ? qs.filter((qq) => qq.q.trim()).map(compactQ) : undefined,
              res: res.filter((r) => r.n.trim()),
            });
            mark(); m.close(); rerender();
          }
        });
      };

      const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
      addEventListener("beforeunload", warn);
      return () => removeEventListener("beforeunload", warn);
    },
  };
}

/* ================================================================== ALUMNOS */
export function adminStudents(_, query) {
  const state = { q: query.q || "", co: query.empresa || "", sel: new Set() };
  return {
    title: "Alumnos", nav: "admin-alumnos",
    html: `${adminHead("Administración · Alumnos", `${students().length} <em>alumnos</em>`, `<button class="btn ghost" data-import>${icon("upload", "sm")} Importar</button><button class="btn" data-new>${icon("plus", "sm")} Nuevo alumno</button>`)}
    <div class="toolbar">
      <label class="search-box">${icon("search")}<input type="search" placeholder="Buscar por nombre, email o usuario" value="${esc(state.q)}" aria-label="Buscar alumnos"></label>
      <div class="selects"><label class="select">${icon("building", "sm")}<select name="co" aria-label="Empresa"><option value="">Todas las empresas</option>${S.db.companies.map((c) => `<option ${state.co === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label></div>
    </div>
    <div class="bulk" data-bulk hidden><span data-bulkn></span><button class="btn sm" data-assign>${icon("book", "sm")} Asignar curso</button><button class="btn ghost sm" data-unsel>Quitar selección</button></div>
    <div class="table-wrap"><table class="table cards-m">
      <thead><tr><th class="ck"><label class="check"><input type="checkbox" data-all aria-label="Seleccionar todos"><span></span></label></th><th>Alumno</th><th>Empresa</th><th class="num">Cursos</th><th>Avance</th><th class="num">Certificados</th><th>Última actividad</th><th></th></tr></thead>
      <tbody data-rows></tbody>
    </table></div>

    <section class="sect">
      <div class="block-head"><div><span class="kicker">Acceso para empresas</span><h2>Códigos de acceso</h2></div><button class="btn ghost sm" data-newcode>${icon("plus", "sm")} Nuevo código</button></div>
      <p class="muted small">Compartí el código (o el enlace) con los colaboradores de una empresa: al registrarse quedan asociados a ella y con los cursos asignados.</p>
      <div class="table-wrap"><table class="table cards-m"><thead><tr><th>Código</th><th>Empresa</th><th>Cursos</th><th>Usos</th><th>Estado</th><th></th></tr></thead>
      <tbody>${S.db.codes.map((cd) => `<tr><td data-l="Código"><code>${esc(cd.code)}</code></td><td data-l="Empresa">${esc(cd.company)}</td><td data-l="Cursos">${cd.courses.map((id) => esc(S.course(id)?.title || "")).join(", ")}</td><td data-l="Usos">${cd.uses} / ${cd.max}</td><td data-l="Estado"><span class="chip ${cd.active ? "chip-ok" : ""}">${cd.active ? "Activo" : "Pausado"}</span></td>
        <td class="acts"><button class="icon-btn" data-cplink="${esc(cd.code)}" aria-label="Copiar enlace de registro">${icon("link")}</button><button class="icon-btn" data-cptoggle="${esc(cd.code)}" aria-label="${cd.active ? "Pausar" : "Activar"}">${icon(cd.active ? "pause" : "play")}</button><button class="icon-btn" data-cpdel="${esc(cd.code)}" aria-label="Eliminar">${icon("trash")}</button></td></tr>`).join("") || `<tr><td colspan="6" class="muted">No hay códigos.</td></tr>`}</tbody></table></div>
    </section>`,
    mount(host) {
      const rows = $("[data-rows]", host);
      const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      const list = () => students().filter((u) => (!state.co || u.company === state.co) && (!state.q || norm(`${u.name} ${u.email} ${u.user}`).includes(norm(state.q)))).sort((a, b) => a.name.localeCompare(b.name, "es"));
      const draw = () => {
        const L = list();
        rows.innerHTML = L.length ? L.map((u) => { const s = studentStats(u); return `<tr class="${u.active ? "" : "is-off"}">
          <td class="ck"><label class="check"><input type="checkbox" data-sel="${u.id}" ${state.sel.has(u.id) ? "checked" : ""} aria-label="Seleccionar ${esc(u.name)}"><span></span></label></td>
          <td data-l="Alumno"><a class="cell-user" href="#/admin/alumnos/${u.id}">${avatar(u)}<span><b>${esc(u.name)}</b><small>${esc(u.email)}</small></span></a></td>
          <td data-l="Empresa">${esc(u.company || "—")}</td>
          <td data-l="Cursos" class="num">${s.n}</td>
          <td data-l="Avance"><div class="cell-bar">${bar(s.avg)}<small>${s.avg}%</small></div></td>
          <td data-l="Certificados" class="num">${s.certs}</td>
          <td data-l="Última actividad">${s.last ? relTime(s.last) : "Nunca"}${u.active ? "" : ` <span class="chip">Inactivo</span>`}</td>
          <td class="acts"><a class="icon-btn" href="#/admin/alumnos/${u.id}" aria-label="Ver detalle">${icon("right")}</a></td>
        </tr>`; }).join("") : `<tr><td colspan="8">${empty("users", "Sin resultados", "Probá con otra búsqueda.")}</td></tr>`;
        animateIn(rows);
        const n = state.sel.size;
        $("[data-bulk]", host).hidden = !n;
        $("[data-bulkn]", host).textContent = `${n} ${n === 1 ? "alumno seleccionado" : "alumnos seleccionados"}`;
      };
      draw();
      $(".search-box input", host).addEventListener("input", debounce((e) => { state.q = e.target.value; draw(); }, 120));
      $("select[name=co]", host).addEventListener("change", (e) => { state.co = e.target.value; draw(); });
      host.addEventListener("change", (e) => {
        if (e.target.dataset.sel) { e.target.checked ? state.sel.add(e.target.dataset.sel) : state.sel.delete(e.target.dataset.sel); draw(); }
        if (e.target.dataset.all !== undefined) { list().forEach((u) => (e.target.checked ? state.sel.add(u.id) : state.sel.delete(u.id))); draw(); }
      });
      host.addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.new !== undefined) userForm();
        if (b.dataset.import !== undefined) importUsers();
        if (b.dataset.unsel !== undefined) { state.sel.clear(); $("[data-all]", host).checked = false; draw(); }
        if (b.dataset.assign !== undefined) assignCourse([...state.sel], () => { state.sel.clear(); draw(); });
        if (b.dataset.newcode !== undefined) codeForm();
        if (b.dataset.cplink) { try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}#/registro?codigo=${b.dataset.cplink}`); toast("Enlace de registro copiado"); } catch { toast("No se pudo copiar", "err"); } }
        if (b.dataset.cptoggle) { S.admin.toggleCode(b.dataset.cptoggle); refresh(); }
        if (b.dataset.cpdel && (await confirmDialog(`Los alumnos ya registrados no se ven afectados.`, { title: `¿Eliminar el código ${b.dataset.cpdel}?`, ok: "Eliminar", danger: true }))) { S.admin.deleteCode(b.dataset.cpdel); refresh(); }
      });
    },
  };
}

function courseChecks(selected = []) {
  return `<div class="checks col">${S.db.courses.filter((c) => c.published && !c.soon).map((c) => `<label class="check"><input type="checkbox" value="${c.id}" ${selected.includes(c.id) ? "checked" : ""}><span></span>${esc(c.title)}</label>`).join("")}</div>`;
}

function userForm() {
  const m = modal({
    title: "Nuevo alumno", cls: "wide",
    body: `<form class="form" data-uf>
      <div class="grid2">${field("Nombre y apellido", `<input class="input" name="fullname" required>`)}${field("Email", `<input class="input" type="email" name="email" required>`)}</div>
      <div class="grid3">${field("Usuario", `<input class="input" name="user" required autocapitalize="none">`)}${field("Empresa", `<input class="input" name="company" list="cos"><datalist id="cos">${S.db.companies.map((c) => `<option value="${esc(c)}">`).join("")}</datalist>`)}${field("Rol", `<select class="input" name="urole"><option value="alumno">Alumno</option><option value="admin">Administrador</option></select>`)}</div>
      <div class="field"><span class="field-l">Cursos asignados</span>${courseChecks()}</div>
      <p class="muted small">${icon("shield", "sm")} Se genera una contraseña temporal para compartir por un canal privado. El alumno puede cambiarla desde su perfil.</p>
    </form>`,
    actions: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" data-ok>Crear alumno</button>`,
  });
  const f = $("[data-uf]", m.el);
  f.fullname.addEventListener("blur", () => { if (!f.user.value) f.user.value = slugify(f.fullname.value).replace(/-/g, "."); });
  $("[data-ok]", m.el).addEventListener("click", async () => {
    if (!f.fullname.value.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value) || !f.user.value.trim()) return toast("Completá nombre, email y usuario", "err");
    const pass = tempPass();
    try {
      const u = await S.admin.createUser({ name: f.fullname.value.trim(), email: f.email.value.trim(), user: f.user.value.trim(), pass, role: f.urole.value, company: f.company.value.trim(), courses: $$("input[type=checkbox]:checked", f).map((x) => x.value) });
      m.close();
      showCredentials([{ name: u.name, user: u.user, pass }]);
    } catch (err) { toast(err.message, "err"); }
  });
}

function showCredentials(list) {
  const txt = list.map((x) => `${x.name}\t${x.user}\t${x.pass}`).join("\n");
  const m = modal({
    title: list.length === 1 ? "Alumno creado" : `${list.length} alumnos creados`, cls: "wide",
    body: `<p class="muted">Compartí estos datos por un canal privado. Se pide cambiar la contraseña al primer ingreso.</p>
      <div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Usuario</th><th>Contraseña temporal</th></tr></thead><tbody>${list.map((x) => `<tr><td>${esc(x.name)}</td><td><code>${esc(x.user)}</code></td><td><code>${esc(x.pass)}</code></td></tr>`).join("")}</tbody></table></div>`,
    actions: `<button class="btn ghost" data-copy>${icon("copy", "sm")} Copiar</button><button class="btn" data-close>Listo</button>`,
    onClose: () => refresh(),
  });
  $("[data-copy]", m.el).addEventListener("click", async () => { try { await navigator.clipboard.writeText(txt); toast("Copiado"); } catch { toast("No se pudo copiar", "err"); } });
}

function importUsers() {
  const m = modal({
    title: "Importar alumnos", cls: "wide",
    body: `<p class="muted">Pegá una fila por alumno con <b>nombre; email; empresa</b> (podés copiarlas desde Excel). El usuario se arma con el nombre.</p>
      <textarea class="input mono" rows="7" data-csv placeholder="Ana Pérez; ana.perez@empresa.com; Logística Austral&#10;Juan Gómez; juan.gomez@empresa.com; Logística Austral"></textarea>
      <div class="field"><span class="field-l">Asignarles los cursos</span>${courseChecks()}</div>`,
    actions: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" data-ok>Importar</button>`,
  });
  $("[data-ok]", m.el).addEventListener("click", async () => {
    const lines = $("[data-csv]", m.el).value.split("\n").map((l) => l.split(/[;\t,]/).map((x) => x.trim())).filter((r) => r[0] && r[1]);
    if (!lines.length) return toast("No hay filas para importar", "err");
    const courses = $$("input[type=checkbox]:checked", m.el).map((x) => x.value);
    const out = [], errs = [];
    for (const [name, email, company] of lines) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { errs.push(`${email}: email inválido`); continue; }
      let un = slugify(name).replace(/-/g, "."), k = 1;
      while (S.db.users.some((x) => x.user === un)) un = slugify(name).replace(/-/g, ".") + ++k;
      const pass = tempPass();
      try { await S.admin.createUser({ name, email, user: un, pass, company: company || "", courses }); out.push({ name, user: un, pass }); } catch (err) { errs.push(err.message); }
    }
    m.close();
    if (errs.length) toast(`${errs.length} filas con error: ${errs[0]}`, "err");
    if (out.length) showCredentials(out);
  });
}

function assignCourse(uids, done) {
  const m = modal({ title: `Asignar curso a ${uids.length} ${uids.length === 1 ? "alumno" : "alumnos"}`, body: `<div class="field"><span class="field-l">Cursos</span>${courseChecks()}</div><p class="muted small">Los alumnos reciben una notificación.</p>`, actions: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" data-ok>Asignar</button>` });
  $("[data-ok]", m.el).addEventListener("click", () => {
    const cs = $$("input[type=checkbox]:checked", m.el).map((x) => x.value);
    if (!cs.length) return toast("Elegí al menos un curso", "err");
    cs.forEach((cid) => S.admin.assign(uids, cid));
    m.close(); toast("Cursos asignados"); done?.(); refresh();
  });
}

function codeForm() {
  const m = modal({
    title: "Nuevo código de acceso",
    body: `<form class="form" data-cf>
      <div class="grid2">${field("Código", `<input class="input mono" name="code" required placeholder="EMPRESA-2026" autocapitalize="characters">`)}${field("Cupo", `<input class="input" type="number" name="max" min="1" value="25">`)}</div>
      ${field("Empresa", `<input class="input" name="company" required list="cos2"><datalist id="cos2">${S.db.companies.map((c) => `<option value="${esc(c)}">`).join("")}</datalist>`)}
      <div class="field"><span class="field-l">Cursos incluidos</span>${courseChecks()}</div>
    </form>`,
    actions: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" data-ok>Crear código</button>`,
  });
  const f = $("[data-cf]", m.el);
  $("[data-ok]", m.el).addEventListener("click", () => {
    const code = f.code.value.trim().toUpperCase().replace(/\s+/g, "-");
    if (!/^[A-Z0-9-]{4,}$/.test(code)) return toast("El código debe tener al menos 4 letras o números", "err");
    if (S.db.codes.some((c) => c.code === code)) return toast("Ese código ya existe", "err");
    if (!f.company.value.trim()) return toast("Indicá la empresa", "err");
    const courses = $$("input[type=checkbox]:checked", f).map((x) => x.value);
    S.admin.createCode({ code, company: f.company.value.trim(), courses, max: Math.max(1, +f.max.value || 1) });
    if (!S.db.companies.includes(f.company.value.trim())) { S.db.companies.push(f.company.value.trim()); S.save(); }
    m.close(); toast("Código creado"); refresh();
  });
}

/* ------------------------------------------------------------------ detalle de alumno */
export function adminStudent({ id }) {
  const u = S.user(id);
  if (!u) { go("/admin/alumnos", { replace: true }); return null; }
  const s = studentStats(u);
  const es = S.enrollmentsOf(u.id).map((e) => ({ e, c: S.course(e.cid) })).filter((x) => x.c);
  return {
    title: u.name, nav: "admin-alumnos",
    html: `<nav class="crumbs"><a href="#/admin/alumnos">Alumnos</a>${icon("right", "xs")}<span>${esc(u.name)}</span></nav>
    <section class="profile-head">${avatar(u, "xl")}<div><span class="kicker">${u.role === "admin" ? "Administrador" : "Alumno"}${u.company ? " · " + esc(u.company) : ""}${u.active ? "" : " · Inactivo"}</span><h1 class="display md">${esc(u.name)}</h1><p class="muted">${esc(u.email)} · usuario <code>${esc(u.user)}</code> · alta ${fmtDate(u.joined)} · última actividad ${s.last ? relTime(s.last) : "nunca"}</p></div>
      <div class="head-acts"><button class="btn ghost sm" data-pass>${icon("key", "sm")} Nueva contraseña</button><button class="btn ghost sm" data-active>${icon(u.active ? "pause" : "play", "sm")} ${u.active ? "Desactivar" : "Activar"}</button><button class="btn ghost sm danger-t" data-delete>${icon("trash", "sm")} Eliminar</button></div></section>
    <div class="kpis"><div class="kpi"><b>${s.n}</b><small>cursos</small></div><div class="kpi"><b>${s.avg}%</b><small>avance promedio</small></div><div class="kpi"><b>${s.certs}</b><small>certificados</small></div><div class="kpi"><b>${fmtHours(S.minutesTotal(u.id))}</b><small>horas</small></div></div>
    <section class="sect">
      <div class="block-head"><h2>Cursos</h2><button class="btn sm" data-assign>${icon("plus", "sm")} Asignar curso</button></div>
      <div class="table-wrap"><table class="table cards-m"><thead><tr><th>Curso</th><th>Avance</th><th>Exámenes</th><th>Estado</th><th></th></tr></thead><tbody>
        ${es.map(({ e, c }) => { const p = S.progress(e, c); return `<tr><td data-l="Curso"><a class="cell-course" href="#/curso/${c.slug}">${cover(c, "xs")}<span><b>${esc(c.title)}</b><small>Inscripto ${fmtDate(e.at, { short: true })}</small></span></a></td>
          <td data-l="Avance"><div class="cell-bar">${bar(p.pct)}<small>${p.done}/${p.total}</small></div></td>
          <td data-l="Exámenes">${e.attempts.length ? e.attempts.map((a) => `<span class="chip ${a.passed ? "chip-ok" : ""}">${a.score}%</span>`).join(" ") : "—"}</td>
          <td data-l="Estado">${p.status === "done" ? `<a class="chip chip-ok" href="#/certificado/${e.cert}">${icon("award", "sm")} ${esc(e.cert)}</a>` : p.status === "exam" ? "Listo para el examen" : p.status === "new" ? "Sin empezar" : "En curso"}</td>
          <td class="acts">${e.attempts.length && !e.cert ? `<button class="icon-btn" data-reset="${c.id}" aria-label="Habilitar nuevos intentos" title="Habilitar nuevos intentos">${icon("refresh")}</button>` : ""}${e.cert ? `<button class="icon-btn" data-revoke="${e.cert}" aria-label="Anular certificado" title="Anular certificado">${icon("x")}</button>` : ""}<button class="icon-btn" data-unassign="${c.id}" aria-label="Quitar curso" title="Quitar curso">${icon("trash")}</button></td></tr>`; }).join("") || `<tr><td colspan="5" class="muted">Sin cursos asignados.</td></tr>`}
      </tbody></table></div>
    </section>`,
    mount(host) {
      animateIn(host);
      host.addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.assign !== undefined) assignCourse([u.id]);
        if (b.dataset.reset) { S.admin.resetAttempts(u.id, b.dataset.reset); toast("Intentos habilitados nuevamente"); refresh(); }
        if (b.dataset.revoke && (await confirmDialog("El certificado deja de ser válido en la página de verificación.", { title: "¿Anular el certificado?", ok: "Anular", danger: true }))) { S.admin.revokeCert(b.dataset.revoke); toast("Certificado anulado"); refresh(); }
        if (b.dataset.unassign && (await confirmDialog("Se borra el progreso del alumno en este curso.", { title: "¿Quitar el curso?", ok: "Quitar", danger: true }))) { S.admin.unassign(u.id, b.dataset.unassign); refresh(); }
        if (b.dataset.active !== undefined) { S.admin.updateUser(u.id, { active: !u.active }); toast(u.active ? "Cuenta activada" : "Cuenta desactivada: ya no puede ingresar"); refresh(); }
        if (b.dataset.pass !== undefined) {
          if (S.MODE === "supabase") {
            if (!(await confirmDialog(`Le enviamos a ${u.email} un enlace para crear una contraseña nueva.`, { title: "¿Restablecer la contraseña?", ok: "Enviar email" }))) return;
            try { await S.api.resetUserPassword(u.id); toast("Email enviado"); } catch (err) { toast(err.message, "err"); }
          } else if (await confirmDialog("Se genera una contraseña temporal nueva y la anterior deja de funcionar.", { title: "¿Restablecer la contraseña?", ok: "Generar" })) {
            const p = tempPass(); await S.api.resetUserPassword(u.id, p); showCredentials([{ name: u.name, user: u.user, pass: p }]);
          }
        }
        if (b.dataset.delete !== undefined) {
          if (u.id === me().id) return toast("No podés eliminar tu propia cuenta", "err");
          const msg = S.MODE === "supabase" ? "La cuenta queda desactivada y ya no puede ingresar. Para borrarla por completo, eliminala en Supabase → Authentication → Users." : "Se eliminan la cuenta, el progreso y los certificados. No se puede deshacer.";
          if (await confirmDialog(msg, { title: `¿Eliminar a ${u.name}?`, ok: S.MODE === "supabase" ? "Desactivar" : "Eliminar", danger: true })) { const r = S.admin.deleteUser(u.id); toast(r.deactivated ? "Cuenta desactivada" : "Alumno eliminado"); go("/admin/alumnos"); }
        }
      });
    },
  };
}

/* ================================================================== CLASES EN VIVO */
export function adminLive() {
  const list = S.db.live.slice().sort((a, b) => b.at - a.at);
  return {
    title: "Clases en vivo", nav: "admin-agenda",
    html: `${adminHead("Administración · Clases en vivo", `Agenda <em>en vivo</em>`, `<button class="btn" data-newlive>${icon("plus", "sm")} Nueva clase</button>`)}
    <div class="table-wrap"><table class="table cards-m"><thead><tr><th>Fecha</th><th>Clase</th><th>Formato</th><th>Instructores</th><th class="num">Anotados</th><th class="num">Preguntas</th><th></th></tr></thead><tbody>
      ${list.map((s) => `<tr class="${s.at < Date.now() ? "is-off" : ""}"><td data-l="Fecha">${fmtDate(s.at, { short: true })} · ${new Date(s.at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} h</td><td data-l="Clase"><b>${esc(s.title)}</b><small class="block-s">${fmtDur(s.min)}${s.cid ? " · " + esc(S.course(s.cid)?.title || "") : ""}${s.rec ? " · con grabación" : ""}</small></td><td data-l="Formato">${esc(KINDS[s.kind] || KINDS.otro)}${s.link ? "" : ` <span class="chip chip-soon">Sin enlace</span>`}</td><td data-l="Instructores">${esc(s.by.map((i) => S.instructor(i)?.name).join(", "))}</td><td data-l="Anotados" class="num">${(s.going || []).length}</td><td data-l="Preguntas" class="num">${(s.questions || []).length}</td><td class="acts"><a class="icon-btn" href="#/vivo/${s.id}" aria-label="Abrir la sala">${icon("eye")}</a><button class="icon-btn" data-edit="${s.id}" aria-label="Editar">${icon("edit")}</button><button class="icon-btn" data-del="${s.id}" aria-label="Eliminar">${icon("trash")}</button></td></tr>`).join("")}
    </tbody></table></div>`,
    mount(host) {
      host.addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.newlive !== undefined) liveForm();
        if (b.dataset.edit) liveForm(S.db.live.find((x) => x.id === b.dataset.edit));
        if (b.dataset.del && (await confirmDialog("Se quita de la agenda de todos los alumnos.", { title: "¿Eliminar la clase?", ok: "Eliminar", danger: true }))) { S.admin.deleteLive(b.dataset.del); refresh(); }
      });
    },
  };
}

function liveForm(s) {
  const at = s ? new Date(s.at) : new Date(Date.now() + 7 * DAY);
  const m = modal({
    title: s ? "Editar clase" : "Nueva clase en vivo", cls: "wide",
    body: `<form class="form" data-lf>
      ${field("Título", `<input class="input" name="ltitle" value="${esc(s?.title || "")}" required>`)}
      <div class="grid3">${field("Fecha", `<input class="input" type="date" name="date" value="${dayKey(at)}" required>`)}${field("Hora", `<input class="input" type="time" name="time" value="${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}" required>`)}${field("Duración (min)", `<input class="input" type="number" name="min" min="15" step="15" value="${s?.min || 60}">`)}</div>
      ${field("Descripción", `<textarea class="input" name="desc" rows="2">${esc(s?.desc || "")}</textarea>`)}
      <div class="grid2">${field("Formato", `<select class="input" name="kind">${Object.entries(KINDS).map(([k, t]) => `<option value="${k}" ${(s?.kind || "youtube") === k ? "selected" : ""}>${t}</option>`).join("")}</select>`, "Transmisión: muchos alumnos miran y preguntan por chat. Reunión: grupo chico y participativo.")}${field("Curso relacionado", `<select class="input" name="cid"><option value="">Ninguno</option>${S.db.courses.map((c) => `<option value="${c.id}" ${s?.cid === c.id ? "selected" : ""}>${esc(c.title)}</option>`).join("")}</select>`)}</div>
      ${field("Enlace de la transmisión o reunión", `<input class="input" name="link" value="${esc(s?.link || "")}" placeholder="https://www.youtube.com/live/… · https://meet.google.com/… · https://zoom.us/j/…">`, "En YouTube: programá la transmisión como «No listada» y pegá acá su enlace. Se ve dentro del campus, con el chat al costado.")}
      ${field("Grabación (después de la clase)", `<input class="input" name="recUrl" value="${esc(s?.recUrl || "")}" placeholder="Enlace de YouTube de la grabación (opcional)">`, "Si la transmisión fue por YouTube, suele quedar grabada en el mismo enlace.")}
      <div class="field"><span class="field-l">Instructores</span><div class="checks">${S.db.instructors.map((i) => `<label class="check"><input type="checkbox" name="by" value="${i.id}" ${!s || s.by.includes(i.id) ? "checked" : ""}><span></span>${esc(i.name)}</label>`).join("")}</div></div>
      <label class="switch"><input type="checkbox" name="rec" ${s?.rec ? "checked" : ""}><span></span>Grabación disponible después de la clase</label>
    </form>`,
    actions: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" data-ok>${s ? "Guardar" : "Crear clase"}</button>`,
  });
  const f = $("[data-lf]", m.el);
  $("[data-ok]", m.el).addEventListener("click", () => {
    if (!f.ltitle.value.trim()) return toast("Poné un título", "err");
    if (f.link.value.trim() && !/^https:\/\//.test(f.link.value.trim())) return toast("El enlace tiene que empezar con https://", "err");
    if (f.kind.value === "youtube" && f.link.value.trim() && !ytId(f.link.value)) return toast("No reconocemos ese enlace de YouTube", "err");
    if (f.recUrl.value.trim() && !ytId(f.recUrl.value)) return toast("La grabación tiene que ser un enlace de YouTube", "err");
    const by = $$("input[name=by]:checked", f).map((x) => x.value);
    if (!by.length) return toast("Elegí al menos un instructor", "err");
    const when = new Date(`${f.date.value}T${f.time.value}`).getTime();
    if (!when) return toast("Revisá la fecha y la hora", "err");
    S.admin.saveLive({ ...(s || {}), id: s?.id || uid("live"), title: f.ltitle.value.trim(), at: when, min: +f.min.value || 60, by, cid: f.cid.value || null, link: f.link.value.trim(), kind: f.kind.value, desc: f.desc.value.trim(), recUrl: f.recUrl.value.trim(), rec: f.rec.checked || !!f.recUrl.value.trim(), going: s?.going || [], questions: s?.questions || [] });
    m.close(); toast(s ? "Clase actualizada" : "Clase creada"); refresh();
  });
}

/* ================================================================== REPORTES */
export function adminReports(_, query) {
  const co = query.empresa || "";
  const st = students().filter((u) => !co || u.company === co).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const cs = S.db.courses.filter((c) => c.published && !c.soon);
  const cell = (u, c) => { const e = S.enrollment(u.id, c.id); if (!e) return `<td class="mx-none" title="No inscripto">·</td>`; const p = S.progress(e, c); return `<td class="mx ${p.status === "done" ? "is-done" : ""}" style="--p:${p.pct / 100}" title="${esc(u.name)} · ${esc(c.title)}: ${p.pct}%">${p.status === "done" ? icon("award", "xs") : p.pct}</td>`; };
  return {
    title: "Reportes", nav: "admin-reportes",
    html: `${adminHead("Administración · Reportes", `Progreso <em>en detalle</em>`, `<button class="btn ghost" data-csv="certs">${icon("download", "sm")} Certificados (CSV)</button><button class="btn" data-csv="detail">${icon("download", "sm")} Progreso (CSV)</button>`)}
    <div class="toolbar"><div class="selects"><label class="select">${icon("building", "sm")}<select name="co" aria-label="Empresa"><option value="">Todas las empresas</option>${S.db.companies.map((c) => `<option ${co === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label></div><p class="muted small mx-note">Cada celda muestra el % de avance del alumno en el curso · <span class="mx-key">${icon("award", "xs")}</span> aprobado</p></div>
    <div class="table-wrap mx-wrap"><table class="table matrix">
      <thead><tr><th class="mx-name">Alumno</th>${cs.map((c) => `<th class="mx-h" title="${esc(c.title)}"><span>${esc(c.title)}</span></th>`).join("")}</tr></thead>
      <tbody>${st.map((u) => `<tr><th class="mx-name"><a href="#/admin/alumnos/${u.id}">${esc(u.name)}</a><small>${esc(u.company || "")}</small></th>${cs.map((c) => cell(u, c)).join("")}</tr>`).join("")}</tbody>
    </table></div>`,
    mount(host) {
      $("select[name=co]", host).addEventListener("change", (e) => go("/admin/reportes" + (e.target.value ? "?empresa=" + encodeURIComponent(e.target.value) : "")));
      host.addEventListener("click", (e) => {
        const b = e.target.closest("[data-csv]");
        if (!b) return;
        const stamp = dayKey();
        if (b.dataset.csv === "detail") {
          const rows = [["Alumno", "Email", "Empresa", "Área", "Curso", "Inscripción", "Lecciones", "Avance %", "Mejor nota", "Intentos", "Estado", "Certificado", "Fecha de aprobación"]];
          st.forEach((u) => S.enrollmentsOf(u.id).forEach((en) => { const c = S.course(en.cid); if (!c) return; const p = S.progress(en, c); rows.push([u.name, u.email, u.company, u.area, c.title, fmtDate(en.at, { short: true }), `${p.done}/${p.total}`, p.pct, en.attempts.length ? Math.max(...en.attempts.map((a) => a.score)) : "", en.attempts.length, p.status === "done" ? "Aprobado" : p.status === "exam" ? "Examen pendiente" : p.status === "new" ? "Sin empezar" : "En curso", en.cert || "", en.completedAt ? fmtDate(en.completedAt, { short: true }) : ""]); }));
          download(`progreso-campus-${stamp}.csv`, toCSV(rows), "text/csv;charset=utf-8");
        } else {
          const rows = [["Código", "Alumno", "Email", "Empresa", "Curso", "Nota", "Carga horaria (min)", "Fecha"]];
          S.db.certs.forEach((ct) => { const u = S.user(ct.uid); if (!u || (co && u.company !== co)) return; rows.push([ct.code, u.name, u.email, u.company, S.course(ct.cid)?.title || "", ct.score ?? "", ct.min, fmtDate(ct.at, { short: true })]); });
          download(`certificados-campus-${stamp}.csv`, toCSV(rows), "text/csv;charset=utf-8");
        }
        toast("Archivo descargado: se abre con Excel");
      });
    },
  };
}

/* ================================================================== AJUSTES */
export function adminSettings() {
  const st = S.db.settings || {};
  return {
    title: "Ajustes", nav: "admin-ajustes",
    html: `${adminHead("Administración · Ajustes", "Ajustes del <em>campus</em>")}
    <div class="profile-grid">
      <section class="panel">
        <h2>Transmisiones y contacto</h2>
        <form class="form" data-f>
          ${field("Canal de YouTube", `<input class="input" name="youtubeChannel" value="${esc(st.youtubeChannel || "")}" placeholder="https://www.youtube.com/@grupoamplifia">`, "Aparece en el menú y en la agenda de clases en vivo.")}
          ${field("WhatsApp de ayuda", `<input class="input" name="supportWhatsApp" value="${esc(st.supportWhatsApp || S.setting("supportWhatsApp"))}" placeholder="5491133278023">`, "Código de país y área, sin + ni espacios.")}
          ${field("Email de contacto", `<input class="input" type="email" name="supportEmail" value="${esc(st.supportEmail || S.setting("supportEmail"))}">`)}
          <button class="btn" type="submit">Guardar ajustes</button>
        </form>
      </section>
      <section class="panel">
        <h2>Estado del sistema</h2>
        <ul class="sys">
          <li><b>Modo</b><span>${S.MODE === "demo" ? `<span class="chip chip-soon">Demostración</span> datos guardados en este navegador` : `<span class="chip chip-ok">Supabase</span> datos en la nube`}</span></li>
          <li><b>Cursos</b><span>${S.db.courses.length} (${S.db.courses.filter((c) => c.published && !c.soon).length} publicados)</span></li>
          <li><b>Usuarios</b><span>${S.db.users.length}</span></li>
          <li><b>Certificados</b><span>${S.db.certs.length}</span></li>
        </ul>
        ${S.MODE === "demo" ? `<p class="muted small">Para usar el campus con alumnos reales hay que conectar Supabase (ver <code>docs/SUPABASE.md</code>). En este modo nada sale de este navegador.</p>` : ""}
      </section>
    </div>`,
    mount(host) {
      $("[data-f]", host).addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target;
        const yt = f.youtubeChannel.value.trim();
        if (yt && !/^https:\/\/(www\.)?youtube\.com\//.test(yt)) return toast("El canal tiene que ser un enlace de youtube.com", "err");
        if (f.supportWhatsApp.value && !/^\d{8,15}$/.test(f.supportWhatsApp.value.trim())) return toast("El WhatsApp debe tener solo números", "err");
        S.saveSettings({ youtubeChannel: yt, supportWhatsApp: f.supportWhatsApp.value.trim(), supportEmail: f.supportEmail.value.trim() });
        resetShell();
        toast("Ajustes guardados");
        refresh();
      });
    },
  };
}
