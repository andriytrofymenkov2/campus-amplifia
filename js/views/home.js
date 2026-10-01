/* Inicio del alumno: continuar, línea de avance, actividad, logros, en vivo */
import { icon } from "../core/icons.js";
import { esc, greeting, firstName, fmtDate, fmtDur, relTime, dayKey, DAY, DAYS, MON, countUp, $$ } from "../core/util.js";
import * as S from "../core/store.js";
import { me } from "../core/auth.js";
import { cover, bar, ring, courseCard, animateIn, lessonIcon } from "../core/ui.js";

export function liveCard(s, compact = false) {
  const d = new Date(s.at);
  const by = s.by.map(S.instructor).filter(Boolean);
  const c = s.cid && S.course(s.cid);
  const soon = s.at - Date.now() < 15 * 60000 && s.at + s.min * 60000 > Date.now();
  const past = s.at + s.min * 60000 < Date.now();
  return `<article class="live ${compact ? "is-compact" : ""} ${past ? "is-past" : ""}">
    <div class="live-date"><b>${d.getDate()}</b><span>${MON[d.getMonth()]}</span></div>
    <div class="live-body">
      <span class="kicker">${soon ? `<i class="live-dot"></i>En vivo ahora` : past ? "Grabación disponible" : `${DAYS[d.getDay()]} · ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} h · ${fmtDur(s.min)}`}</span>
      <h3>${esc(s.title)}</h3>
      <div class="live-by">${by.map((i) => `<img src="${esc(i.photo)}" alt="">`).join("")}<small>${esc(by.map((i) => i.name).join(" y "))}${c ? ` · ${esc(c.title)}` : ""}</small></div>
    </div>
    ${compact ? `<a class="icon-btn" href="#/vivo/${s.id}" aria-label="Ir a la sala">${icon("right")}</a>` : ""}
  </article>`;
}

function heatmap(u) {
  const act = S.activityOf(u);
  const weeks = 15;
  const end = new Date(); end.setHours(12, 0, 0, 0);
  const dow = (end.getDay() + 6) % 7;
  const start = end.getTime() - (weeks * 7 - 7 + dow) * DAY;
  let cells = "";
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const t = start + (w * 7 + d) * DAY;
      if (t > end.getTime()) { cells += `<i class="hm-x"></i>`; continue; }
      const m = act[dayKey(t)] || 0;
      const lv = m === 0 ? 0 : m < 15 ? 1 : m < 30 ? 2 : m < 45 ? 3 : 4;
      cells += `<i class="l${lv}" title="${fmtDate(t, { short: true })}: ${m ? Math.round(m) + " min" : "sin actividad"}"></i>`;
    }
  }
  return `<div class="hm" style="--w:${weeks}">${cells}</div>`;
}

const EV = {
  enroll: ["book", (c) => `Te inscribiste en <b>${esc(c.title)}</b>`],
  lesson: ["check", (c, e) => { const f = S.findLesson(c, e.lid); return `Completaste <b>${esc(f ? f.l.t : "una lección")}</b> · ${esc(c.title)}`; }],
  exam: ["quiz", (c, e) => `Rendiste el examen de <b>${esc(c.title)}</b>: ${e.meta?.score ?? "—"} %`],
  cert: ["award", (c) => `Obtuviste el certificado de <b>${esc(c.title)}</b>`],
};

export function homeView() {
  const u = me();
  const es = S.enrollmentsOf(u.id).map((e) => ({ e, c: S.course(e.cid) })).filter((x) => x.c);
  const active = es.filter((x) => S.progress(x.e, x.c).status !== "done").sort((a, b) => Math.max(...Object.values(b.e.done), b.e.at) - Math.max(...Object.values(a.e.done), a.e.at));
  const certs = S.certsOf(u.id);
  const st = S.streak(u.id);
  const mins = S.minutesTotal(u.id);
  const week = S.minutesThisWeek(u.id);
  const goal = u.goal || 120;
  const bs = S.badges(u.id);

  /* Línea de avance: todas las lecciones de todos los cursos inscriptos */
  const segs = es.map(({ e, c }) => ({ c, p: S.progress(e, c) })).sort((a, b) => b.p.pct - a.p.pct);
  const totalUnits = segs.reduce((s, x) => s + x.p.total + (x.c.exam ? 1 : 0), 0);
  const doneUnits = segs.reduce((s, x) => s + x.p.done + (x.p.examPassed ? 1 : 0), 0);
  const overall = totalUnits ? Math.round((doneUnits / totalUnits) * 100) : 0;

  const cont = active[0];
  let hero = "";
  if (cont) {
    const p = S.progress(cont.e, cont.c);
    const nl = S.nextLesson(cont.e, cont.c);
    const href = p.status === "exam" ? `#/examen/${cont.c.slug}` : `#/aprender/${cont.c.slug}/${nl.id}`;
    hero = `<a class="resume" href="${href}">
      <div class="resume-media">${cover(cont.c)}<span class="resume-play">${icon("play")}</span></div>
      <div class="resume-body">
        <span class="kicker">Continuá donde dejaste</span>
        <h2>${esc(cont.c.title)}</h2>
        <p class="resume-next">${p.status === "exam" ? `${icon("quiz", "sm")} Examen final · ${cont.c.exam.qs.length} preguntas` : `${icon(lessonIcon(nl), "sm")} ${esc(nl.t)} · ${fmtDur(nl.min)}`}</p>
        <div class="resume-prog">${bar(p.pct, "lg")}<span><b>${p.pct}%</b> · ${p.done} de ${p.total} lecciones</span></div>
        <span class="btn">${p.status === "exam" ? "Rendir examen" : "Continuar"} ${icon("arrow")}</span>
      </div>
    </a>`;
  } else {
    hero = `<a class="resume is-empty" href="#/catalogo"><div class="resume-body"><span class="kicker">Empezá hoy</span><h2>Elegí tu primer curso</h2><p class="muted">Explorá el catálogo y empezá a aprender a tu ritmo.</p><span class="btn">Ver catálogo ${icon("arrow")}</span></div></a>`;
  }

  const events = S.eventsOf(u.id).filter((x) => EV[x.type]).slice(0, 6);
  const nextLive = S.db.live.filter((s) => s.at + s.min * 60000 > Date.now()).sort((a, b) => a.at - b.at).slice(0, 2);
  const enrolledIds = new Set(es.map((x) => x.c.id));
  const cats = new Set(es.map((x) => x.c.cat));
  const recs = S.visibleCourses().filter((c) => !enrolledIds.has(c.id) && !c.soon).sort((a, b) => (cats.has(b.cat) - cats.has(a.cat)) || (b.featured - a.featured)).slice(0, 3);
  const now = new Date();

  return {
    title: "Inicio", nav: "inicio",
    html: `
    <section class="page-head home-head">
      <div>
        <span class="kicker">${DAYS[now.getDay()]} ${now.getDate()} de ${fmtDate(now).split(" de ").slice(1).join(" de ")}</span>
        <h1 class="display">${greeting()}, <em>${esc(firstName(u.name))}</em>.</h1>
        <p class="lead">${st.today ? `Ya aprendiste hoy. ¡Seguí así!` : st.days ? `Llevás <b>${st.days} ${st.days === 1 ? "día" : "días"}</b> seguidos aprendiendo. Una lección hoy mantiene tu racha.` : `Una lección corta hoy es un gran comienzo.`}</p>
      </div>
    </section>

    <div class="home-grid">
      <div class="home-main">
        ${hero}

        <section class="panel track" aria-labelledby="trk">
          <div class="panel-head">
            <div><span class="kicker">Tu línea de avance</span><h2 id="trk">Llevás el <em>${overall}%</em> de tu plan de capacitación</h2></div>
            <a class="link" href="#/mis-cursos">Ver mis cursos ${icon("right", "sm")}</a>
          </div>
          <div class="track-line" role="img" aria-label="Avance total ${overall} por ciento">
            ${segs.map(({ c, p }) => `<div class="seg" style="--w:${p.total + (c.exam ? 1 : 0)};--p:${p.pct}%" title="${esc(c.title)}: ${p.pct}%"><i></i></div>`).join("")}
          </div>
          <ul class="track-legend">
            ${segs.map(({ c, p }) => `<li><a href="#/curso/${c.slug}"><span class="tl-dot ${p.status === "done" ? "is-done" : p.pct ? "is-on" : ""}"></span><span class="tl-t">${esc(c.title)}</span><span class="tl-p">${p.status === "done" ? icon("award", "sm") : p.pct + "%"}</span></a></li>`).join("")}
          </ul>
          <div class="track-stats">
            <div><b data-count="${doneUnits}">0</b><small>de ${totalUnits} pasos completados</small></div>
            <div><b data-count="${certs.length}">0</b><small>certificados</small></div>
            <div><b data-count="${mins / 60}" data-dec="1">0</b><small>horas de aprendizaje</small></div>
            <div><b data-count="${S.longestStreak(u.id)}">0</b><small>días, tu mejor racha</small></div>
          </div>
        </section>

        <section class="panel" aria-labelledby="act">
          <div class="panel-head"><div><span class="kicker">Actividad</span><h2 id="act">Tus últimas 15 semanas</h2></div>
            <div class="hm-legend"><small>Menos</small><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><small>Más</small></div></div>
          <div class="act-grid">
          <div class="hm-box">${heatmap(u.id)}<div class="hm-days" aria-hidden="true"><small>L</small><small></small><small>M</small><small></small><small>V</small><small></small><small>D</small></div></div>
          <ol class="feed">
            ${events.map((ev) => { const c = S.course(ev.cid); if (!c) return ""; const [ic, fn] = EV[ev.type]; return `<li><span class="feed-ic ev-${ev.type}">${icon(ic, "sm")}</span><p>${fn(c, ev)}</p><time>${relTime(ev.at)}</time></li>`; }).join("")}
          </ol>
          </div>
        </section>

        ${active.length > 1 ? `<section aria-labelledby="enc"><div class="sec-head"><h2 id="enc">En curso</h2><a class="link" href="#/mis-cursos">Ver todos ${icon("right", "sm")}</a></div><div class="cards cards-3">${active.slice(1, 4).map((x) => courseCard(x.c, { compact: true })).join("")}</div></section>` : ""}

        <section aria-labelledby="rec"><div class="sec-head"><h2 id="rec">Recomendados para vos</h2><a class="link" href="#/catalogo">Catálogo completo ${icon("right", "sm")}</a></div><div class="cards cards-3">${recs.map((c) => courseCard(c, { compact: true })).join("")}</div></section>
      </div>

      <aside class="home-side">
        <section class="panel goal">
          <span class="kicker">Meta semanal</span>
          ${ring(Math.round((week / goal) * 100), { size: 148, sw: 10, label: `${Math.round(week)}<small>/${goal}</small>`, sub: "minutos" })}
          <p>${week >= goal ? "¡Cumpliste tu meta de la semana!" : `Te faltan <b>${Math.max(0, Math.round(goal - week))} min</b> para tu meta.`}</p>
          <a class="link small" href="#/perfil">Cambiar meta</a>
        </section>

        <section class="panel streak">
          <div class="streak-n">${icon("flame")}<b>${st.days}</b></div>
          <div><b>${st.days === 1 ? "día" : "días"} de racha</b><small>${st.today ? "Hoy ya sumaste minutos" : "Estudiá hoy para no cortarla"}</small></div>
          <div class="week">${[6, 5, 4, 3, 2, 1, 0].map((i) => { const t = Date.now() - i * DAY; const on = !!S.activityOf(u.id)[dayKey(t)]; return `<span class="${on ? "on" : ""} ${i === 0 ? "today" : ""}"><i></i><small>${DAYS[new Date(t).getDay()][0].toUpperCase()}</small></span>`; }).join("")}</div>
        </section>

        <section class="panel">
          <div class="panel-head"><div><span class="kicker">Próximas clases en vivo</span></div><a class="link small" href="#/agenda">Agenda</a></div>
          <div class="stack">${nextLive.map((s) => liveCard(s, true)).join("") || `<p class="muted small">No hay clases programadas.</p>`}</div>
        </section>

        <section class="panel">
          <div class="panel-head"><div><span class="kicker">Logros</span><h3>${bs.filter((b) => b.on).length} de ${bs.length}</h3></div><a class="link small" href="#/perfil">Ver todos</a></div>
          <div class="badges">${bs.map((b) => `<span class="badge ${b.on ? "on" : ""}" title="${esc(b.name)}: ${esc(b.desc)}">${icon(b.icon)}</span>`).join("")}</div>
        </section>

        ${certs[0] ? `<a class="panel cert-mini" href="#/certificado/${certs[0].code}"><span class="kicker">Último certificado</span><b>${esc(S.course(certs[0].cid)?.title || "")}</b><small>${fmtDate(certs[0].at)}</small>${icon("award")}</a>` : ""}
      </aside>
    </div>`,
    mount(host) {
      animateIn(host);
      $$("[data-count]", host).forEach((el) => countUp(el, +el.dataset.count, { dec: +(el.dataset.dec || 0) }));
    },
  };
}

