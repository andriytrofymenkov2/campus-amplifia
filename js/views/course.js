/* Página de un curso: presentación, programa, instructores, opiniones */
import { icon } from "../core/icons.js";
import { esc, fmtDur, relTime, plural, $, $$ } from "../core/util.js";
import * as S from "../core/store.js";
import { me } from "../core/auth.js";
import { go, refresh } from "../core/router.js";
import { cover, ring, stars, toast, lessonIcon, typeLabel, avatar, animateIn, courseCard } from "../core/ui.js";

export function courseView({ slug }) {
  const c = S.course(slug);
  if (!c || (!c.published && me().role !== "admin")) { go("/catalogo", { replace: true }); return null; }
  const u = me();
  const e = S.enrollment(u.id, c.id);
  const p = S.progress(e, c);
  const ls = S.lessonsOf(c);
  const nl = S.nextLesson(e, c);
  const rt = S.rating(c.id);
  const reviews = S.reviewsOf(c.id);
  const ins = c.instructors.map(S.instructor).filter(Boolean);
  const saved = (u.saved || []).includes(c.id);
  const counts = { video: 0, lectura: 0, quiz: 0, res: 0 };
  ls.forEach((l) => { counts[l.type]++; counts.res += (l.res || []).length; });
  const mine = reviews.find((r) => r.uid === u.id);
  const related = S.visibleCourses().filter((x) => x.id !== c.id && x.cat === c.cat && !x.soon).slice(0, 3);

  let cta;
  if (c.soon) cta = `<button class="btn block lg ${S.watching(u.id, c.id) ? "ghost" : ""}" data-watch>${icon("bell")} <span>${S.watching(u.id, c.id) ? "Te avisaremos" : "Avisarme cuando esté disponible"}</span></button>`;
  else if (!e) cta = `<button class="btn block lg" data-enroll>Inscribirme ${icon("arrow")}</button><p class="cta-note">${icon("checkc", "sm")} Acceso inmediato · a tu ritmo</p>`;
  else if (p.status === "done") cta = `<a class="btn block lg" href="#/certificado/${e.cert}">${icon("award")} Ver mi certificado</a><a class="btn ghost block" href="#/aprender/${c.slug}/${ls[0].id}">Repasar el curso</a>`;
  else if (p.status === "exam") cta = `<a class="btn block lg" href="#/examen/${c.slug}">${icon("quiz")} Rendir examen final</a>`;
  else cta = `<a class="btn block lg" href="#/aprender/${c.slug}/${nl.id}">${p.done ? "Continuar" : "Empezar"} ${icon("arrow")}</a>${p.done ? `<p class="cta-note">Sigue: ${esc(nl.t)}</p>` : ""}`;

  const syllabus = c.modules.map((m, mi) => {
    const mp = S.modulePct(e, m);
    const mmin = m.lessons.reduce((s, l) => s + l.min, 0);
    return `<details class="mod" ${mi === 0 || (e && m.lessons.some((l) => l.id === nl.id)) ? "open" : ""}>
      <summary><span class="mod-n">${String(mi + 1).padStart(2, "0")}</span><span class="mod-t"><b>${esc(m.t)}</b><small>${m.lessons.length} lecciones · ${fmtDur(mmin)}${e ? ` · ${mp}%` : ""}</small></span>${e ? `<span class="mod-ring ${mp === 100 ? "is-done" : ""}">${mp === 100 ? icon("check", "sm") : ""}</span>` : ""}${icon("down", "chev")}</summary>
      <ol class="lessons">${m.lessons.map((l, li) => {
        const done = e && e.done[l.id];
        const preview = !e && mi === 0 && li === 0;
        const href = e || preview ? `#/aprender/${c.slug}/${l.id}` : "";
        return `<li><${href ? `a href="${href}"` : "button type=\"button\" data-need"} class="lesson ${done ? "is-done" : ""} ${e && l.id === nl.id && !done ? "is-next" : ""}">
          <span class="lesson-st">${done ? icon("check", "sm") : icon(lessonIcon(l), "sm")}</span>
          <span class="lesson-t">${esc(l.t)}${preview ? `<em class="tag">Vista previa</em>` : ""}${(l.res || []).length ? `<small>${icon("download", "xs")} ${l.res.length} material${l.res.length > 1 ? "es" : ""}</small>` : ""}</span>
          <span class="lesson-m">${typeLabel[l.type]} · ${l.min} min</span>
        </${href ? "a" : "button"}></li>`;
      }).join("")}</ol>
    </details>`;
  }).join("");

  const examRow = c.exam ? `<div class="exam-row ${p.examPassed ? "is-done" : p.lessonsDone ? "is-ready" : ""}">
      <span class="lesson-st">${p.examPassed ? icon("check", "sm") : p.lessonsDone ? icon("quiz", "sm") : icon("lock", "sm")}</span>
      <span><b>Examen final</b><small>${c.exam.qs.length} preguntas · ${c.exam.minutes} min · aprobás con ${c.exam.pass}% · ${c.exam.attempts} intentos</small></span>
      ${p.lessonsDone && !p.examPassed ? `<a class="btn sm" href="#/examen/${c.slug}">Rendir</a>` : p.examPassed ? `<span class="chip chip-ok">${icon("check", "sm")}Aprobado</span>` : `<small class="muted">Se habilita al completar las lecciones</small>`}
    </div>` : "";

  return {
    title: c.title, nav: "catalogo",
    html: `
    <nav class="crumbs" aria-label="Ruta"><a href="#/catalogo">Catálogo</a>${icon("right", "xs")}<a href="#/catalogo?cat=${c.cat}">${esc(S.category(c.cat).name)}</a></nav>
    <div class="course">
      <div class="course-main">
        <header class="course-head">
          <div class="course-tags"><span class="kicker">${esc(S.category(c.cat).name)}</span>${c.isNew ? `<span class="chip chip-new">Nuevo</span>` : ""}${c.soon ? `<span class="chip chip-soon">Próximamente</span>` : ""}${!c.published ? `<span class="chip">Borrador</span>` : ""}</div>
          <h1 class="display md">${esc(c.title)}</h1>
          <p class="lead">${esc(c.subtitle)}</p>
          <div class="course-facts">
            ${rt.n ? `<span>${stars(rt.avg, rt.n)}</span>` : ""}
            <span>${icon("users", "sm")} ${S.enrolledCount(c.id)} alumnos</span>
            <span>${icon("clock", "sm")} ${fmtDur(S.courseMinutes(c))}</span>
            <span>${icon("bolt", "sm")} ${esc(c.level)}</span>
            <span>${icon("refresh", "sm")} Actualizado ${relTime(c.updated)}</span>
          </div>
          <div class="course-ins">${ins.map((i) => `<span>${avatar({ name: i.name, photo: i.photo })}<span><b>${esc(i.name)}</b><small>${esc(i.role)}</small></span></span>`).join("")}</div>
        </header>

        <div class="course-cover-m">${cover(c)}</div>

        <section class="sect">
          <h2>Sobre este curso</h2>
          <p class="prose">${esc(c.desc)}</p>
        </section>

        <section class="sect">
          <h2>Lo que vas a aprender</h2>
          <ul class="outcomes">${c.outcomes.map((o) => `<li>${icon("check")}<span>${esc(o)}</span></li>`).join("")}</ul>
        </section>

        <section class="sect">
          <div class="block-head"><h2>Programa</h2><small class="muted">${c.modules.length} módulos · ${ls.length} lecciones · ${fmtDur(S.courseMinutes(c))}</small></div>
          <div class="syllabus">${syllabus}${examRow}</div>
        </section>

        <section class="sect two">
          <div><h2>Para quién es</h2><p class="prose">${esc(c.forWho)}</p></div>
          <div><h2>Requisitos</h2><p class="prose">${esc(c.req)}</p></div>
        </section>

        <section class="sect">
          <h2>${ins.length > 1 ? "Instructores" : "Instructor"}</h2>
          <div class="instructors">${ins.map((i) => `<article class="ins-card"><img src="${esc(i.portrait)}" alt="${esc(i.name)}" loading="lazy"><div><b>${esc(i.name)}</b><span class="kicker">${esc(i.role)}</span><p>${esc(i.bio)}</p></div></article>`).join("")}</div>
        </section>

        ${c.exam ? `<section class="sect cert-explain">
          <div class="ce-art">${icon("award")}</div>
          <div><h2>Evaluación y certificado</h2><p class="prose">Al completar todas las lecciones se habilita el examen final de ${c.exam.qs.length} preguntas. Aprobás con ${c.exam.pass}% o más y tenés ${c.exam.attempts} intentos. El certificado se emite al instante, con un código único que cualquier empresa puede verificar en línea y que podés sumar a tu perfil de LinkedIn.</p></div>
        </section>` : ""}

        <section class="sect">
          <div class="block-head"><h2>Opiniones</h2>${rt.n ? stars(rt.avg, rt.n) : ""}</div>
          ${e && p.done ? `<form class="review-form">
            <span class="field-l">${mine ? "Tu opinión" : "¿Qué te está pareciendo el curso?"}</span>
            <div class="star-input" role="radiogroup" aria-label="Puntaje">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${mine?.stars === n}" data-star="${n}" aria-label="${n} estrellas">${icon("starf")}</button>`).join("")}</div>
            <textarea class="input" name="text" rows="2" maxlength="400" placeholder="Contá en pocas palabras qué te sirvió">${esc(mine?.text || "")}</textarea>
            <button class="btn sm" type="submit">${mine ? "Actualizar opinión" : "Publicar opinión"}</button>
          </form>` : ""}
          <div class="reviews">${reviews.length ? reviews.slice(0, 6).map((r) => { const ru = S.user(r.uid); return `<article class="review">${avatar(ru)}<div><div class="review-h"><b>${esc(ru?.name || "Alumno")}</b>${stars(r.stars)}<time>${relTime(r.at)}</time></div><p>${esc(r.text)}</p></div></article>`; }).join("") : `<p class="muted">Todavía no hay opiniones. ${e ? "Completá una lección y dejá la tuya." : ""}</p>`}</div>
        </section>

        ${related.length ? `<section class="sect"><h2>También te puede interesar</h2><div class="cards cards-3">${related.map((x) => courseCard(x, { compact: true })).join("")}</div></section>` : ""}
      </div>

      <aside class="course-side">
        <div class="buy">
          <div class="buy-media">${cover(c)}</div>
          <div class="buy-in">
            ${e && !c.soon ? `<div class="buy-prog">${ring(p.pct, { size: 76, sw: 6, label: p.pct + "%" })}<div><b>${p.status === "done" ? "Curso aprobado" : p.status === "exam" ? "Listo para el examen" : "Tu progreso"}</b><small>${p.done} de ${p.total} lecciones${p.examPassed ? " · examen aprobado" : ""}</small></div></div>` : ""}
            ${cta}
            <button class="btn ghost block save-btn ${saved ? "is-on" : ""}" data-save>${icon(saved ? "bookmarkf" : "bookmark")} <span>${saved ? "Guardado" : "Guardar para después"}</span></button>
            <ul class="includes">
              ${counts.video ? `<li>${icon("video", "sm")} ${plural(counts.video, "video", "videos")}</li>` : ""}
              ${counts.lectura ? `<li>${icon("read", "sm")} ${plural(counts.lectura, "lectura", "lecturas")}</li>` : ""}
              ${counts.quiz ? `<li>${icon("quiz", "sm")} ${plural(counts.quiz, "control de módulo", "controles de módulo")}</li>` : ""}
              ${counts.res ? `<li>${icon("download", "sm")} ${plural(counts.res, "material descargable", "materiales descargables")}</li>` : ""}
              ${c.exam ? `<li>${icon("target", "sm")} Examen final</li><li>${icon("award", "sm")} Certificado verificable</li>` : ""}
              <li>${icon("chat", "sm")} Preguntas a los instructores</li>
              <li>${icon("sun", "sm")} Desde la computadora o el celular</li>
            </ul>
            <button class="link small share" data-share>${icon("link", "sm")} Compartir curso</button>
          </div>
        </div>
      </aside>
    </div>`,
    mount(host) {
      animateIn(host);
      $("[data-enroll]", host)?.addEventListener("click", () => {
        S.enroll(u.id, c.id);
        toast(`Te inscribiste en ${c.title}`);
        go(`/aprender/${c.slug}/${ls[0].id}`);
      });
      $("[data-watch]", host)?.addEventListener("click", () => { const on = S.toggleWatch(u.id, c.id); toast(on ? "Te avisamos apenas esté disponible" : "Ya no te avisaremos", on ? "ok" : "info"); refresh(); });
      $("[data-save]", host).addEventListener("click", () => { const on = S.toggleSaved(u.id, c.id); toast(on ? "Curso guardado" : "Lo quitaste de guardados", on ? "ok" : "info"); refresh(); });
      $$("[data-need]", host).forEach((b) => b.addEventListener("click", () => { toast("Inscribite para acceder a esta lección", "info"); $(".course-side .btn", host)?.focus(); }));
      $("[data-share]", host).addEventListener("click", async () => {
        const url = location.href.split("#")[0] + `#/curso/${c.slug}`;
        try { if (navigator.share) await navigator.share({ title: c.title, url }); else { await navigator.clipboard.writeText(url); toast("Enlace copiado"); } } catch { /* cancelado */ }
      });
      const rf = $(".review-form", host);
      if (rf) {
        let val = mine?.stars || 0;
        const paint = () => $$("[data-star]", rf).forEach((b) => { b.classList.toggle("on", +b.dataset.star <= val); b.setAttribute("aria-checked", String(+b.dataset.star === val)); });
        paint();
        $$("[data-star]", rf).forEach((b) => b.addEventListener("click", () => { val = +b.dataset.star; paint(); }));
        rf.addEventListener("submit", (ev) => {
          ev.preventDefault();
          if (!val) return toast("Elegí un puntaje de 1 a 5 estrellas", "err");
          S.addReview(u.id, c.id, val, rf.text.value.trim());
          toast("¡Gracias por tu opinión!");
          refresh();
        });
      }
    },
  };
}

