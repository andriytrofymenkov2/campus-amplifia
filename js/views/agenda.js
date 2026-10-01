/* Clases en vivo (sincrónicas): agenda, sala de transmisión (YouTube Live), reuniones, grabaciones */
import { icon } from "../core/icons.js";
import { esc, fmtDate, fmtDur, DAYS, MON, download, ytId, relTime, $ } from "../core/util.js";
import * as S from "../core/store.js";
import { me } from "../core/auth.js";
import { refresh, go } from "../core/router.js";
import { toast, empty, avatar } from "../core/ui.js";

const pad = (n) => String(n).padStart(2, "0");
const icsDate = (t) => { const d = new Date(t); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`; };
const hour = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export const KINDS = { youtube: "Transmisión en YouTube", meet: "Google Meet", zoom: "Zoom", teams: "Microsoft Teams", otro: "Reunión en línea" };

export function liveState(s, now = Date.now()) {
  if (now > s.at + s.min * 60000) return "ended";
  if (now >= s.at - 15 * 60000) return "live";
  return "upcoming";
}
const roomUrl = (s) => `${location.origin}${location.pathname}#/vivo/${s.id}`;

function ics(s) {
  const by = s.by.map(S.instructor).filter(Boolean).map((i) => i.name).join(" y ");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Grupo Amplifia//Campus//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${s.id}@campus.grupoamplifia.com`, `DTSTAMP:${icsDate(Date.now())}`, `DTSTART:${icsDate(s.at)}`, `DTEND:${icsDate(s.at + s.min * 60000)}`,
    `SUMMARY:${s.title.replace(/[,;]/g, "\\$&")} · Campus Amplifia`, `DESCRIPTION:Clase en vivo con ${by}.\\nEntrá desde el campus: ${roomUrl(s)}`, `URL:${roomUrl(s)}`, `LOCATION:${roomUrl(s)}`,
    "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:Clase en vivo en 30 minutos", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

const toggleGoing = (s, u) => S.liveRsvp(s.id, u.id);

/* ------------------------------------------------------------------ agenda */
export function agendaView() {
  const u = me();
  const now = Date.now();
  const all = S.db.live.slice().sort((a, b) => a.at - b.at);
  const upcoming = all.filter((s) => liveState(s, now) !== "ended");
  const past = all.filter((s) => liveState(s, now) === "ended").reverse();
  const next = upcoming[0];
  const yt = S.setting("youtubeChannel");

  const card = (s) => {
    const d = new Date(s.at);
    const by = s.by.map(S.instructor).filter(Boolean);
    const c = s.cid && S.course(s.cid);
    const going = (s.going || []).includes(u.id);
    const st = liveState(s, now);
    return `<article class="live-row ${st === "ended" ? "is-past" : ""}">
      <div class="live-date lg"><small>${DAYS[d.getDay()].slice(0, 3)}</small><b>${d.getDate()}</b><span>${MON[d.getMonth()]}</span></div>
      <div class="live-body">
        <span class="kicker">${st === "live" ? `<i class="live-dot"></i> En vivo ahora` : `${hour(s.at)} h · ${fmtDur(s.min)}`} · ${icon(s.kind === "youtube" ? "video" : "users", "xs")} ${esc(KINDS[s.kind] || KINDS.otro)}</span>
        <h3><a href="#/vivo/${s.id}">${esc(s.title)}</a></h3>
        <div class="live-by">${by.map((i) => `<img src="${esc(i.photo)}" alt="">`).join("")}<small>${esc(by.map((i) => i.name).join(" y "))}${c ? ` · ${esc(c.title)}` : ""}${(s.going || []).length ? ` · ${(s.going || []).length} anotados` : ""}</small></div>
      </div>
      <div class="live-acts">
        ${st === "ended" ? (s.rec || s.recUrl ? `<a class="btn ghost sm" href="#/vivo/${s.id}">${icon("playo", "sm")} Ver grabación</a>` : `<small class="muted">Sin grabación</small>`)
          : `${st === "live" ? `<a class="btn sm" href="#/vivo/${s.id}"><i class="live-dot"></i> Entrar a la sala</a>` : `<button class="btn sm ${going ? "is-done" : ""}" data-go="${s.id}">${going ? `${icon("check", "sm")} Anotado` : "Anotarme"}</button><a class="btn ghost sm" href="#/vivo/${s.id}">Sala</a>`}
             <button class="icon-btn" data-ics="${s.id}" aria-label="Agregar a mi calendario" title="Agregar a mi calendario">${icon("calendar")}</button>`}
      </div>
    </article>`;
  };

  return {
    title: "Clases en vivo", nav: "agenda",
    html: `
    <section class="page-head"><div><span class="kicker">Clases en vivo</span><h1 class="display">Aprender <em>en vivo</em>, con tus instructores.</h1><p class="lead">Transmisiones, clínicas y mentorías grupales para llevar los cursos a tu realidad. Anotate, agendala y entrá desde el campus en cualquier dispositivo.</p></div>
      ${yt ? `<a class="btn ghost" href="${esc(yt)}" target="_blank" rel="noopener">${icon("video", "sm")} Canal de YouTube ${icon("ext", "sm")}</a>` : ""}</section>
    ${next ? `<section class="live-hero">
      <div><span class="kicker">${liveState(next, now) === "live" ? `<i class="live-dot"></i> En vivo ahora` : "Próxima clase"}</span><h2>${esc(next.title)}</h2><p>${DAYS[new Date(next.at).getDay()]} ${fmtDate(next.at)} · ${hour(next.at)} h · ${esc(KINDS[next.kind] || "")}</p><a class="btn" href="#/vivo/${next.id}">${liveState(next, now) === "live" ? "Entrar ahora" : "Ir a la sala"} ${icon("arrow", "sm")}</a></div>
      <div class="countdown" data-cd="${next.at}"><div><b>--</b><small>días</small></div><div><b>--</b><small>horas</small></div><div><b>--</b><small>min</small></div><div><b>--</b><small>seg</small></div></div>
    </section>` : ""}
    <section><div class="sec-head"><h2>Próximas</h2></div>${upcoming.length ? `<div class="live-list">${upcoming.map(card).join("")}</div>` : empty("calendar", "No hay clases programadas", "Te avisamos cuando se publique la próxima.")}</section>
    ${past.length ? `<section><div class="sec-head"><h2>Grabaciones</h2></div><div class="live-list">${past.map(card).join("")}</div></section>` : ""}`,
    mount(host) {
      const stop = countdown(host);
      host.addEventListener("click", (e) => {
        const g = e.target.closest("[data-go]"), ic = e.target.closest("[data-ics]");
        if (g) { const on = toggleGoing(S.db.live.find((x) => x.id === g.dataset.go), u); toast(on ? "Te anotaste. Te recordamos 30 minutos antes." : "Cancelaste tu lugar", on ? "ok" : "info"); refresh(); }
        if (ic) { const s = S.db.live.find((x) => x.id === ic.dataset.ics); download(`${s.title}.ics`, ics(s), "text/calendar;charset=utf-8"); toast("Abrí el archivo para sumarlo a tu calendario"); }
      });
      return stop;
    },
  };
}

function countdown(host) {
  const cd = $("[data-cd]", host);
  if (!cd) return null;
  const at = +cd.dataset.cd;
  const b = cd.querySelectorAll("b");
  const paint = () => {
    let s = Math.max(0, Math.floor((at - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    [d, h, m, s].forEach((v, i) => (b[i].textContent = pad(v)));
  };
  paint();
  const t = setInterval(paint, 1000);
  return () => clearInterval(t);
}

/* ------------------------------------------------------------------ sala en vivo */
export function liveRoomView({ id }) {
  const s = S.db.live.find((x) => x.id === id);
  if (!s) { toast("La clase no existe o fue eliminada", "err"); go("/agenda", { replace: true }); return null; }
  const u = me();
  const now = Date.now();
  const st = liveState(s, now);
  const by = s.by.map(S.instructor).filter(Boolean);
  const c = s.cid && S.course(s.cid);
  const going = (s.going || []).includes(u.id);
  const vid = ytId(s.link);
  const recId = ytId(s.recUrl);
  const isStream = s.kind === "youtube";
  const host = location.hostname || "campus.grupoamplifia.com";

  let stage;
  if (st === "ended") {
    if (recId) stage = `<div class="room-video"><iframe src="https://www.youtube-nocookie.com/embed/${recId}?rel=0&modestbranding=1" title="Grabación: ${esc(s.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
    else if (s.rec) stage = `<div class="room-video"><video controls playsinline preload="metadata" poster="media/rise.jpg" src="media/rise.mp4"></video><span class="vp-demo">Grabación de muestra</span></div>`;
    else stage = `<div class="room-wait">${icon("clock", "xl")}<h2>La clase terminó</h2><p>Esta clase no tiene grabación disponible.</p></div>`;
  } else if (isStream && vid) {
    stage = `<div class="room-video"><iframe src="https://www.youtube-nocookie.com/embed/${vid}?autoplay=${st === "live" ? 1 : 0}&rel=0&modestbranding=1" title="${esc(s.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  } else if (!isStream && st === "live") {
    stage = `<div class="room-wait is-live"><span class="kicker"><i class="live-dot"></i> La reunión está abierta</span><h2>Sumate a la clase en ${esc(KINDS[s.kind] || "la reunión")}</h2><p>Es un encuentro participativo: activá tu cámara y micrófono si podés.</p>${s.link ? `<a class="btn lg" href="${esc(s.link)}" target="_blank" rel="noopener">${icon("video", "sm")} Unirme ahora ${icon("ext", "sm")}</a>` : `<p class="muted">El enlace todavía no está cargado.</p>`}</div>`;
  } else {
    stage = `<div class="room-wait">
      <span class="kicker">${st === "live" ? `<i class="live-dot"></i> Por comenzar` : "Empieza en"}</span>
      <div class="countdown" data-cd="${s.at}"><div><b>--</b><small>días</small></div><div><b>--</b><small>horas</small></div><div><b>--</b><small>min</small></div><div><b>--</b><small>seg</small></div></div>
      <p>${isStream ? "La transmisión aparece en esta pantalla cuando empiece. No hace falta instalar nada." : `El botón para entrar a ${esc(KINDS[s.kind] || "la reunión")} se habilita 15 minutos antes.`}</p>
    </div>`;
  }

  const qs = (s.questions || []).slice().sort((a, b) => (b.votes || []).length - (a.votes || []).length || a.at - b.at);
  const chat = isStream && vid && st !== "ended";

  return {
    title: s.title, nav: "agenda",
    html: `
    <nav class="crumbs"><a href="#/agenda">En vivo</a>${icon("right", "xs")}<span>${esc(s.title)}</span></nav>
    <div class="room ${chat ? "has-chat" : ""}">
      <div class="room-main">
        <div class="room-stage">${stage}</div>
        <header class="room-head">
          <span class="kicker">${st === "live" ? `<i class="live-dot"></i> En vivo` : st === "ended" ? "Finalizada" : "Próximamente"} · ${esc(KINDS[s.kind] || KINDS.otro)}</span>
          <h1 class="display md">${esc(s.title)}</h1>
          <p class="muted">${DAYS[new Date(s.at).getDay()]} ${fmtDate(s.at)} · ${hour(s.at)} h · ${fmtDur(s.min)}</p>
          <div class="room-acts">
            ${st !== "ended" && !(st === "live" && !isStream) ? `<button class="btn ${going ? "is-done" : ""}" data-go>${going ? `${icon("check", "sm")} Anotado` : "Anotarme"}</button>` : ""}
            ${(vid || recId) ? `<a class="btn ghost" href="https://www.youtube.com/watch?v=${esc(st === "ended" ? recId || vid : vid)}" target="_blank" rel="noopener">${icon("video", "sm")} Abrir en YouTube ${icon("ext", "sm")}</a>` : ""}
            ${st !== "ended" ? `<button class="btn ghost" data-ics>${icon("calendar", "sm")} Agregar al calendario</button>` : ""}
            <button class="btn ghost" data-share>${icon("link", "sm")} Copiar enlace</button>
          </div>
        </header>
        ${s.desc ? `<p class="prose room-desc">${esc(s.desc)}</p>` : ""}
        <section class="sect">
          <div class="block-head"><h2>Preguntas para la clase</h2><small class="muted">Votá las que más te interesan: los instructores responden primero las más votadas.</small></div>
          ${st !== "ended" ? `<form class="qa-form" data-q><textarea class="input" name="text" rows="2" maxlength="300" placeholder="Escribí tu pregunta para ${esc(by.map((i) => i.name.split(" ")[0]).join(" y "))}…"></textarea><button class="btn sm" type="submit">Enviar pregunta</button></form>` : ""}
          <ul class="live-qs" data-qs>${qs.length ? qs.map((q) => { const qu = S.user(q.uid); const voted = (q.votes || []).includes(u.id); return `<li><button class="vote ${voted ? "on" : ""}" data-vote="${q.id}" aria-label="Votar pregunta" aria-pressed="${voted}">${icon("up", "sm")}<b>${(q.votes || []).length}</b></button><div><p>${esc(q.text)}</p><small>${esc(qu?.name || "Alumno")} · ${relTime(q.at)}</small></div></li>`; }).join("") : `<li class="muted small">Todavía no hay preguntas. ¡Hacé la primera!</li>`}</ul>
        </section>
      </div>
      <aside class="room-side">
        ${chat ? `<div class="room-chat"><div class="room-chat-h"><b>Chat en vivo</b><small>Con tu cuenta de YouTube</small></div><iframe src="https://www.youtube.com/live_chat?v=${vid}&embed_domain=${esc(host)}" title="Chat de la transmisión"></iframe></div>` : ""}
        <div class="panel">
          <span class="kicker">${by.length > 1 ? "Instructores" : "Instructor"}</span>
          <div class="room-ins">${by.map((i) => `<div>${avatar({ name: i.name, photo: i.photo })}<span><b>${esc(i.name)}</b><small>${esc(i.role)}</small></span></div>`).join("")}</div>
          ${c ? `<a class="room-course" href="#/curso/${c.slug}"><span class="kicker">Curso relacionado</span><b>${esc(c.title)}</b><small>${icon("arrow", "xs")} Ver curso</small></a>` : ""}
          <p class="muted small">${(s.going || []).length} ${(s.going || []).length === 1 ? "persona anotada" : "personas anotadas"}</p>
        </div>
      </aside>
    </div>`,
    mount(host) {
      const stop = countdown(host);
      /* Cuando llega la hora, la sala se actualiza sola para mostrar la transmisión */
      const flip = st === "upcoming" ? setTimeout(() => refresh(), Math.max(1000, s.at - 15 * 60000 - Date.now() + 500)) : null;
      host.addEventListener("click", async (e) => {
        if (e.target.closest("[data-go]")) { const on = toggleGoing(s, u); toast(on ? "Te anotaste. Te recordamos 30 minutos antes." : "Cancelaste tu lugar", on ? "ok" : "info"); refresh(); }
        if (e.target.closest("[data-ics]")) { download(`${s.title}.ics`, ics(s), "text/calendar;charset=utf-8"); toast("Abrí el archivo para sumarlo a tu calendario"); }
        if (e.target.closest("[data-share]")) { try { await navigator.clipboard.writeText(roomUrl(s)); toast("Enlace de la sala copiado"); } catch { toast("No se pudo copiar", "err"); } }
        const v = e.target.closest("[data-vote]");
        if (v) { S.liveVote(s.id, v.dataset.vote, u.id); refresh(); }
      });
      $("[data-q]", host)?.addEventListener("submit", (e) => {
        e.preventDefault();
        const t = e.target.text.value.trim();
        if (t.length < 5) return toast("Escribí la pregunta con un poco más de detalle", "err");
        S.liveAsk(s.id, u.id, t);
        toast("Pregunta enviada");
        refresh();
      });
      return () => { stop?.(); clearTimeout(flip); };
    },
  };
}
