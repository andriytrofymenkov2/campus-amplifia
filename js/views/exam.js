/* Examen final: introducción, una pregunta por pantalla, revisión, resultado */
import { icon } from "../core/icons.js";
import { esc, fmtClock, fmtDate, $, $$ } from "../core/util.js";
import * as S from "../core/store.js";
import { me } from "../core/auth.js";
import { go } from "../core/router.js";
import { ring, toast, confirmDialog, animateIn } from "../core/ui.js";
import { linkedInUrl } from "./certs.js";

const AKEY = (u, c) => `amp_exam_${u}_${c}`;

export function examView({ slug }) {
  const c = S.course(slug);
  if (!c || !c.exam) { go("/catalogo", { replace: true }); return null; }
  const u = me();
  const e = S.enrollment(u.id, c.id);
  if (!e) { go(`/curso/${slug}`, { replace: true }); return null; }
  const p = S.progress(e, c);
  const used = e.attempts.length;
  const left = c.exam.attempts - used;
  const best = e.attempts.reduce((m, a) => Math.max(m, a.score), 0);

  const head = `<header class="pl-top ex-top">
    <a class="icon-btn" href="#/curso/${c.slug}" aria-label="Volver al curso">${icon("back")}</a>
    <div class="pl-title"><small>Examen final</small><b>${esc(c.title)}</b></div>
    <div class="ex-timer" data-timer hidden>${icon("clock", "sm")}<b>--:--</b></div>
  </header>`;

  let intro;
  if (e.cert) {
    const ct = S.cert(e.cert);
    intro = `<div class="ex-card ex-center">${icon("award", "xl lime")}<h1 class="display md">Ya aprobaste este curso</h1><p class="lead">Obtuviste ${ct?.score ?? best}% el ${fmtDate(e.completedAt)}.</p><div class="ex-btns"><a class="btn" href="#/certificado/${e.cert}">Ver certificado</a><a class="btn ghost" href="#/curso/${c.slug}">Volver al curso</a></div></div>`;
  } else if (!p.lessonsDone) {
    intro = `<div class="ex-card ex-center">${icon("lock", "xl")}<h1 class="display md">El examen todavía no está habilitado</h1><p class="lead">Completaste ${p.done} de ${p.total} lecciones. El examen se habilita al terminar todas.</p><div class="ex-btns"><a class="btn" href="#/aprender/${c.slug}/${S.nextLesson(e, c).id}">Seguir con el curso ${icon("arrow")}</a></div></div>`;
  } else if (left <= 0) {
    intro = `<div class="ex-card ex-center">${icon("alert", "xl")}<h1 class="display md">Usaste todos los intentos</h1><p class="lead">Tu mejor resultado fue ${best}%. Escribinos y un instructor revisa tu caso para habilitarte un intento más.</p><div class="ex-btns"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/5491133278023?text=${encodeURIComponent(`Hola, necesito un nuevo intento para el examen de "${c.title}" (usuario ${u.user}).`)}">${icon("chat", "sm")} Escribir por WhatsApp</a><a class="btn ghost" href="#/curso/${c.slug}">Repasar el curso</a></div></div>`;
  } else {
    intro = `<div class="ex-card">
      <span class="kicker">Examen final</span>
      <h1 class="display md">¿Listo para demostrar lo que <em>aprendiste</em>?</h1>
      <div class="ex-facts">
        <div><b>${c.exam.qs.length}</b><small>preguntas</small></div>
        <div><b>${c.exam.minutes}</b><small>minutos</small></div>
        <div><b>${c.exam.pass}%</b><small>para aprobar</small></div>
        <div><b>${left}</b><small>${left === 1 ? "intento disponible" : "intentos disponibles"}</small></div>
      </div>
      <ul class="ex-rules">
        <li>${icon("list", "sm")} Una pregunta por pantalla. Podés volver atrás y cambiar respuestas antes de enviar.</li>
        <li>${icon("clock", "sm")} El tiempo corre desde que empezás, aunque cierres la página. Al terminar el tiempo se envía solo.</li>
        <li>${icon("shield", "sm")} Las respuestas correctas se muestran cuando aprobás o cuando ya no te quedan intentos.</li>
        <li>${icon("award", "sm")} Si aprobás, el certificado se emite al instante.</li>
      </ul>
      ${used ? `<p class="muted small">Intentos anteriores: ${e.attempts.map((a) => `<b>${a.score}%</b>`).join(" · ")}</p>` : ""}
      <div class="ex-btns"><button class="btn lg" data-start>Comenzar examen ${icon("arrow")}</button><a class="btn ghost lg" href="#/curso/${c.slug}">Repasar antes</a></div>
    </div>`;
  }

  return {
    title: "Examen · " + c.title, layout: "focus",
    html: `<div class="exam">${head}<div class="ex-body" data-body>${intro}</div></div>`,
    mount(host) {
      const body = $("[data-body]", host);
      const timerEl = $("[data-timer]", host);
      let tick = 0, session = null;
      const stored = (() => { try { return JSON.parse(sessionStorage.getItem(AKEY(u.id, c.id)) || localStorage.getItem(AKEY(u.id, c.id)) || "null"); } catch { return null; } })();
      const persist = () => localStorage.setItem(AKEY(u.id, c.id), JSON.stringify(session));
      const clear = () => { localStorage.removeItem(AKEY(u.id, c.id)); sessionStorage.removeItem(AKEY(u.id, c.id)); };

      const start = async (resume) => {
        let ex;
        try { ex = await S.api.examForTaking(c.id); } catch (err) { toast(err.message, "err"); return; }
        const at = ex.startedAt || Date.now();
        if (resume && (!ex.startedAt || Math.abs(resume.at - ex.startedAt) < 2000)) session = resume;
        else { session = { at, qs: ex.qs, ans: {}, cur: 0 }; persist(); }
        timerEl.hidden = false;
        const endAt = session.at + c.exam.minutes * 60000;
        const paint = () => {
          const ms = endAt - Date.now();
          timerEl.querySelector("b").textContent = fmtClock(Math.max(0, ms / 1000));
          timerEl.classList.toggle("is-low", ms < 60000);
          if (ms <= 0) { clearInterval(tick); toast("Se terminó el tiempo: enviamos tus respuestas", "info"); submit(); }
        };
        paint();
        tick = setInterval(paint, 500);
        drawQ();
      };

      const drawQ = () => {
        const n = session.qs.length;
        if (session.cur >= n) return drawReview();
        const qq = session.qs[session.cur];
        const chosen = session.ans[qq.i];
        body.innerHTML = `<div class="ex-q">
          <div class="ex-dots" aria-hidden="true">${session.qs.map((x, i) => `<button type="button" data-go="${i}" class="${i === session.cur ? "is-cur" : ""} ${session.ans[x.i] != null ? "is-ans" : ""}">${i + 1}</button>`).join("")}</div>
          <span class="kicker">Pregunta ${session.cur + 1} de ${n}</span>
          <h2 class="ex-text">${esc(qq.q)}</h2>
          <div class="ex-opts" role="radiogroup" aria-label="Opciones">
            ${qq.o.map((o, k) => `<button type="button" role="radio" aria-checked="${chosen === o.j}" class="opt ${chosen === o.j ? "is-sel" : ""}" data-j="${o.j}"><span class="opt-l">${"ABCD"[k]}</span><span>${esc(o.t)}</span></button>`).join("")}
          </div>
          <div class="ex-nav">
            <button class="btn ghost" data-prev ${session.cur === 0 ? "disabled" : ""}>${icon("left", "sm")} Anterior</button>
            <small class="muted hide-xs">Teclas A–D para elegir · Enter para seguir</small>
            <button class="btn" data-next>${session.cur === n - 1 ? "Revisar y enviar" : "Siguiente"} ${icon("right", "sm")}</button>
          </div>
        </div>`;
        $(".ex-opts .opt", body)?.focus({ preventScroll: true });
      };

      const drawReview = () => {
        const n = session.qs.length;
        const answered = session.qs.filter((x) => session.ans[x.i] != null).length;
        body.innerHTML = `<div class="ex-card">
          <span class="kicker">Revisión</span>
          <h2 class="display sm">Respondiste ${answered} de ${n} preguntas</h2>
          <p class="muted">Tocá una pregunta para revisarla. Cuando estés seguro, enviá el examen.</p>
          <div class="ex-grid">${session.qs.map((x, i) => `<button type="button" data-go="${i}" class="${session.ans[x.i] != null ? "is-ans" : ""}"><b>${i + 1}</b><small>${session.ans[x.i] != null ? "Respondida" : "Sin responder"}</small></button>`).join("")}</div>
          <div class="ex-btns"><button class="btn ghost" data-go="${n - 1}">${icon("left", "sm")} Volver</button><button class="btn lg" data-submit>Enviar examen ${icon("check", "sm")}</button></div>
        </div>`;
      };

      let sending = false;
      const submit = async () => {
        if (sending) return;
        sending = true;
        clearInterval(tick);
        timerEl.hidden = true;
        body.innerHTML = `<div class="ex-card ex-center"><span class="spinner" aria-hidden="true"></span><p class="lead">Corrigiendo tu examen…</p></div>`;
        let r;
        try { r = await S.api.gradeExam(u.id, c.id, session.ans); } catch (err) { clear(); toast(err.message, "err"); go(`/curso/${c.slug}`); return; }
        clear();
        drawResult(r);
      };

      const drawResult = (r) => {
        const ct = r.certificate;
        body.innerHTML = `<div class="ex-result ${r.passed ? "is-pass" : "is-fail"}">
          ${r.passed ? `<div class="burst" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--a:${i * 20}deg;--d:${(i % 3) * 40 + 90}px"></i>`).join("")}</div>` : ""}
          ${ring(r.score, { size: 168, sw: 12, label: r.score + "%", sub: r.passed ? "Aprobado" : `Necesitás ${r.pass}%` })}
          <h1 class="display md">${r.passed ? "¡Aprobaste! <em>Felicitaciones.</em>" : "Esta vez no alcanzó."}</h1>
          <p class="lead">${r.passed ? `Tu certificado de <b>${esc(c.title)}</b> ya está disponible y es verificable en línea.` : r.left > 0 ? `Te ${r.left === 1 ? "queda 1 intento" : `quedan ${r.left} intentos`}. Repasá las preguntas marcadas y volvé a intentarlo.` : "Usaste todos los intentos. Escribinos para revisar tu caso."}</p>
          <div class="ex-btns">
            ${r.passed ? `<a class="btn lg" href="#/certificado/${ct.code}">${icon("award")} Ver certificado</a><a class="btn ghost lg" target="_blank" rel="noopener" href="${linkedInUrl(ct, c)}">${icon("linkedin")} Sumar a LinkedIn</a>`
              : `<a class="btn ghost lg" href="#/curso/${c.slug}">Repasar el curso</a>${r.left > 0 ? `<button class="btn lg" data-again>Intentar de nuevo</button>` : ""}`}
          </div>
          <section class="ex-review">
            <h2>Tus respuestas</h2>
            ${r.review.map((x, i) => `<article class="rv ${x.ok ? "is-ok" : "is-bad"}">
              <div class="rv-h"><span>${icon(x.ok ? "check" : "x", "sm")}</span><b>${i + 1}. ${esc(x.q)}</b></div>
              <p class="rv-a">Tu respuesta: ${x.chosen != null ? esc(x.o[x.chosen]) : "<em>sin responder</em>"}</p>
              ${x.correct != null && !x.ok ? `<p class="rv-c">${icon("checkc", "sm")} Correcta: ${esc(x.o[x.correct])}</p>` : ""}
              ${x.e ? `<p class="rv-e">${esc(x.e)}</p>` : ""}
            </article>`).join("")}
            ${r.review[0].correct == null ? `<p class="muted small">${icon("shield", "sm")} Las respuestas correctas se muestran al aprobar o cuando no quedan intentos.</p>` : ""}
          </section>
        </div>`;
        animateIn(body);
        $("[data-again]", body)?.addEventListener("click", () => go(`/examen/${c.slug}`));
        window.scrollTo(0, 0);
      };

      body.addEventListener("click", async (ev) => {
        const t = ev.target;
        if (t.closest("[data-start]")) { t.closest("[data-start]").disabled = true; start(); }
        const opt = t.closest(".ex-opts .opt");
        if (opt) { session.ans[session.qs[session.cur].i] = +opt.dataset.j; persist(); $$(".ex-opts .opt", body).forEach((o) => { const on = o === opt; o.classList.toggle("is-sel", on); o.setAttribute("aria-checked", String(on)); }); $(`.ex-dots [data-go="${session.cur}"]`, body)?.classList.add("is-ans"); }
        if (t.closest("[data-prev]")) { session.cur--; persist(); drawQ(); }
        if (t.closest("[data-next]")) { session.cur++; persist(); drawQ(); }
        const g = t.closest("[data-go]");
        if (g) { session.cur = +g.dataset.go; persist(); drawQ(); }
        if (t.closest("[data-submit]")) {
          const missing = session.qs.filter((x) => session.ans[x.i] == null).length;
          if (missing && !(await confirmDialog(`Tenés ${missing} ${missing === 1 ? "pregunta" : "preguntas"} sin responder: cuentan como incorrectas.`, { title: "¿Enviar igual?", ok: "Enviar examen" }))) return;
          submit();
        }
      });

      const onKey = (ev) => {
        if (!session || session.cur >= session.qs.length || ev.target.closest("input,textarea")) return;
        const k = ev.key.toLowerCase();
        const idx = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
        const opts = $$(".ex-opts .opt", body);
        if (idx >= 0 && opts[idx]) opts[idx].click();
        if (k === "enter" && session.ans[session.qs[session.cur].i] != null) { ev.preventDefault(); $("[data-next]", body)?.click(); }
      };
      document.addEventListener("keydown", onKey);

      /* Retomar un examen en curso (si se cerró la página) */
      if (stored && !e.cert && left > 0 && p.lessonsDone) {
        if (Date.now() - stored.at < c.exam.minutes * 60000) start(stored);
        else { session = stored; toast("El tiempo del examen terminó: se enviaron tus respuestas", "info"); submit(); }
      }

      return () => { clearInterval(tick); document.removeEventListener("keydown", onKey); };
    },
  };
}
