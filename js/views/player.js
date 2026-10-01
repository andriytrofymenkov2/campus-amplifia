/* Aula: reproductor de lecciones (video, lectura, control de módulo) */
import { icon } from "../core/icons.js";
import { esc, fmtClock, fmtDur, relTime, download, ytId, $, $$ } from "../core/util.js";
import * as S from "../core/store.js";
import { me } from "../core/auth.js";
import { go } from "../core/router.js";
import { toast, modal, lessonIcon, typeLabel, avatar, confirmDialog } from "../core/ui.js";
import { makeResource } from "../data/resources.js";

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

function videoSource(v) {
  if (!v) return { kind: "none" };
  const yt = ytId(v);
  if (yt) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1` };
  const vm = String(v).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "iframe", src: `https://player.vimeo.com/video/${vm[1]}?dnt=1` };
  if (/^https?:\/\//.test(v)) return { kind: "file", src: v, poster: "" };
  return { kind: "file", src: `media/${v}.mp4`, poster: `media/${v}.jpg`, demo: true };
}

export function playerView({ slug, lid }) {
  const c = S.course(slug);
  if (!c) { go("/catalogo", { replace: true }); return null; }
  const u = me();
  const ls = S.lessonsOf(c);
  const f = S.findLesson(c, lid);
  if (!f) { go(`/curso/${slug}`, { replace: true }); return null; }
  let e = S.enrollment(u.id, c.id);
  const isPreview = !e && f.mi === 0 && f.li === 0;
  if (!e && !isPreview) { toast("Inscribite para acceder a esta lección", "info"); go(`/curso/${slug}`, { replace: true }); return null; }
  if (e) S.setLast(u.id, c.id, lid);
  const l = f.l;
  const idx = ls.findIndex((x) => x.id === lid);
  const prev = ls[idx - 1], next = ls[idx + 1];
  const lessonIns = S.instructor(l.instructor || c.instructors[0]);
  const threads = S.threadsOf(c.id, l.id);
  const notes = S.notesOf(u.id, l.id);
  const resAll = c.modules.flatMap((m) => m.lessons.flatMap((x) => (x.res || []).map((r) => ({ ...r, lesson: x }))));

  const outline = () => {
    const ee = S.enrollment(u.id, c.id);
    const p = S.progress(ee, c);
    return c.modules.map((m, mi) => `<div class="ol-mod">
      <div class="ol-head"><span class="ol-n">${String(mi + 1).padStart(2, "0")}</span><b>${esc(m.t)}</b><small>${S.modulePct(ee, m)}%</small></div>
      <ol>${m.lessons.map((x) => `<li><a class="ol-l ${x.id === lid ? "is-cur" : ""} ${ee && ee.done[x.id] ? "is-done" : ""}" href="#/aprender/${c.slug}/${x.id}" ${x.id === lid ? 'aria-current="page"' : ""}>
        <span class="ol-st">${ee && ee.done[x.id] ? icon("check", "xs") : icon(lessonIcon(x), "xs")}</span><span class="ol-t">${esc(x.t)}</span><small>${x.min}′</small></a></li>`).join("")}</ol>
    </div>`).join("") + (c.exam ? `<a class="ol-exam ${p.examPassed ? "is-done" : p.lessonsDone ? "is-ready" : ""}" href="${p.lessonsDone ? `#/examen/${c.slug}` : "#"}" ${p.lessonsDone ? "" : 'aria-disabled="true"'}>
        <span class="ol-st">${p.examPassed ? icon("check", "xs") : p.lessonsDone ? icon("quiz", "xs") : icon("lock", "xs")}</span><span class="ol-t"><b>Examen final</b><small>${p.examPassed ? "Aprobado" : p.lessonsDone ? "Habilitado" : "Completá las lecciones"}</small></span></a>` : "");
  };

  const progHTML = () => { const p = S.progress(S.enrollment(u.id, c.id), c); return `<span class="pl-pbar"><i style="width:${p.pct}%"></i></span><b>${p.pct}%</b>`; };

  let stage = "";
  const src = l.type === "video" ? videoSource(l.v) : null;
  if (l.type === "video") {
    if (src.kind === "iframe") stage = `<div class="vp is-embed"><iframe src="${esc(src.src)}" title="${esc(l.t)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    else if (src.kind === "file") stage = `<div class="vp" tabindex="0" aria-label="Reproductor de video. Espacio para reproducir o pausar.">
      <video playsinline preload="metadata" ${src.poster ? `poster="${esc(src.poster)}"` : ""} src="${esc(src.src)}"></video>
      ${src.demo ? `<span class="vp-demo">Video de muestra</span>` : ""}
      <button class="vp-big" type="button" aria-label="Reproducir">${icon("play")}</button>
      <div class="vp-ctrl">
        <div class="vp-seek"><div class="vp-buf"></div><div class="vp-fill"></div><input type="range" min="0" max="1000" value="0" step="1" aria-label="Posición del video"></div>
        <div class="vp-row">
          <button type="button" class="vp-b" data-k="play" aria-label="Reproducir">${icon("play")}</button>
          <button type="button" class="vp-b hide-xs" data-k="back" aria-label="Retroceder 10 segundos">${icon("rewind")}</button>
          <button type="button" class="vp-b hide-xs" data-k="fwd" aria-label="Adelantar 10 segundos">${icon("forward")}</button>
          <span class="vp-vol"><button type="button" class="vp-b" data-k="mute" aria-label="Silenciar">${icon("volume")}</button><input type="range" min="0" max="1" step="0.05" value="1" aria-label="Volumen"></span>
          <span class="vp-time">00:00 / 00:00</span>
          <span class="vp-sp"></span>
          <button type="button" class="vp-b vp-speed" data-k="speed" aria-label="Velocidad de reproducción">1×</button>
          <button type="button" class="vp-b" data-k="full" aria-label="Pantalla completa">${icon("full")}</button>
        </div>
      </div>
      <div class="vp-end" hidden>
        <div class="vp-end-in">
          <span class="vp-end-ok">${icon("checkc")} Lección completada</span>
          ${next ? `<small>A continuación</small><b>${esc(next.t)}</b><div class="vp-end-btns"><button class="btn ghost sm" type="button" data-k="stay">Quedarme</button><a class="btn sm" href="#/aprender/${c.slug}/${next.id}">Siguiente en <span data-cd>6</span> s ${icon("arrow", "sm")}</a></div>`
            : c.exam ? `<b>Terminaste la última lección</b><div class="vp-end-btns"><a class="btn sm" href="#/examen/${c.slug}">Ir al examen final ${icon("arrow", "sm")}</a></div>` : ""}
        </div>
      </div>
    </div>`;
    else stage = `<div class="vp is-empty">${icon("video")}<p>Esta lección todavía no tiene video cargado.</p></div>`;
  } else if (l.type === "lectura") {
    stage = `<article class="reading"><span class="kicker">${icon("read", "sm")} Lectura · ${l.min} min</span><h2>${esc(l.t)}</h2>${(l.body || []).map((p) => `<p>${esc(p)}</p>`).join("")}<div class="reading-end">${icon("checkc")}<span>Llegaste al final de la lectura.</span></div></article>`;
  } else if (l.type === "quiz") {
    stage = `<form class="mquiz"><span class="kicker">${icon("quiz", "sm")} Control de módulo · ${l.qs.length} preguntas · sin límite de intentos</span><h2>${esc(l.t)}</h2>
      ${l.qs.map((qq, i) => `<fieldset class="mq"><legend><span>${i + 1}</span>${esc(qq.q)}</legend>${qq.o.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}"><span class="opt-l">${"ABCD"[j]}</span><span>${esc(o)}</span></label>`).join("")}<p class="mq-fb" hidden></p></fieldset>`).join("")}
      <div class="mquiz-foot"><p class="muted small" data-qres>Respondé todas las preguntas para ver tu resultado.</p><button class="btn" type="submit">Corregir</button></div>
    </form>`;
  }

  const doneNow = () => !!S.enrollment(u.id, c.id)?.done[l.id];

  return {
    title: l.t, layout: "focus",
    html: `
    <div class="player">
      <header class="pl-top">
        <a class="icon-btn" href="#/curso/${c.slug}" aria-label="Volver al curso">${icon("back")}</a>
        <div class="pl-title"><small>${esc(f.m.t)}</small><b>${esc(c.title)}</b></div>
        <div class="pl-prog" data-prog>${progHTML()}</div>
        <button class="btn ghost sm pl-toggle" type="button" data-side aria-expanded="false">${icon("list", "sm")}<span>Contenido</span></button>
      </header>
      <div class="pl-body">
        <main class="pl-main">
          ${isPreview ? `<div class="preview-bar">${icon("eye", "sm")}<span>Estás viendo una vista previa. Inscribite para guardar tu progreso.</span><a class="btn sm" href="#/curso/${c.slug}">Inscribirme</a></div>` : ""}
          <div class="pl-stage ${l.type}">${stage}</div>
          <div class="pl-bar">
            <div class="pl-h"><span class="kicker">Lección ${idx + 1} de ${ls.length} · ${typeLabel[l.type]} · ${fmtDur(l.min)}</span><h1>${esc(l.t)}</h1></div>
            <div class="pl-nav">
              ${prev ? `<a class="btn ghost sm" href="#/aprender/${c.slug}/${prev.id}" aria-label="Lección anterior">${icon("left", "sm")}<span class="hide-xs">Anterior</span></a>` : ""}
              ${l.type !== "quiz" && !isPreview ? `<button class="btn sm ${doneNow() ? "is-done" : "ghost"}" type="button" data-done>${doneNow() ? `${icon("check", "sm")} Completada` : `${icon("checkc", "sm")} Marcar como completada`}</button>` : ""}
              ${next ? `<a class="btn sm" href="#/aprender/${c.slug}/${next.id}">Siguiente ${icon("right", "sm")}</a>` : c.exam && !isPreview ? `<a class="btn sm" href="#/examen/${c.slug}">Examen final ${icon("right", "sm")}</a>` : ""}
            </div>
          </div>

          <div class="tabs pl-tabs" role="tablist">
            <button role="tab" aria-selected="true" data-tab="sum">Resumen</button>
            <button role="tab" aria-selected="false" data-tab="res">Materiales <small>${(l.res || []).length + 1}</small></button>
            <button role="tab" aria-selected="false" data-tab="notes">Notas <small data-ncount>${notes.length}</small></button>
            <button role="tab" aria-selected="false" data-tab="qa">Preguntas <small>${threads.length}</small></button>
          </div>

          <section class="pl-pane" data-pane="sum">
            <div class="sum">
              <div>
                <p class="prose">${esc(l.sum || (l.type === "lectura" ? "Leé el texto completo y marcá la lección como completada al terminar." : l.type === "quiz" ? "Repasá los conceptos del módulo antes de seguir. Necesitás 60 % para dar el control por aprobado." : ""))}</p>
                ${l.pts?.length ? `<h3 class="kicker">Ideas clave</h3><ul class="keypts">${l.pts.map((p) => `<li>${icon("check", "sm")}<span>${esc(p)}</span></li>`).join("")}</ul>` : ""}
              </div>
              ${lessonIns ? `<aside class="sum-ins"><img src="${esc(lessonIns.photo)}" alt=""><div><small>Dicta</small><b>${esc(lessonIns.name)}</b><span>${esc(lessonIns.role)}</span></div></aside>` : ""}
            </div>
          </section>

          <section class="pl-pane" data-pane="res" hidden>
            <h3 class="kicker">De esta lección</h3>
            <ul class="files">
              ${(l.res || []).map((r, i) => `<li><span class="file-ic ${r.k}">${r.k === "xlsx" ? "XLS" : r.k === "doc" ? "DOC" : "PDF"}</span><span><b>${esc(r.n)}</b><small>${r.k === "xlsx" ? "Planilla editable" : "Documento"}</small></span><button class="btn ghost sm" type="button" data-res="${i}">${icon("download", "sm")} Descargar</button></li>`).join("")}
              <li><span class="file-ic txt">TXT</span><span><b>Resumen de la lección</b><small>Ideas clave para repasar</small></span><button class="btn ghost sm" type="button" data-sumdl>${icon("download", "sm")} Descargar</button></li>
            </ul>
            ${resAll.filter((r) => r.lesson.id !== l.id).length ? `<h3 class="kicker">Del curso</h3><ul class="files">${resAll.filter((r) => r.lesson.id !== l.id).map((r) => `<li><span class="file-ic ${r.k}">${r.k === "xlsx" ? "XLS" : r.k === "doc" ? "DOC" : "PDF"}</span><span><b>${esc(r.n)}</b><small>${esc(r.lesson.t)}</small></span><button class="btn ghost sm" type="button" data-resall="${resAll.indexOf(r)}" aria-label="Descargar ${esc(r.n)}">${icon("download", "sm")}</button></li>`).join("")}</ul>` : ""}
          </section>

          <section class="pl-pane" data-pane="notes" hidden>
            ${isPreview ? `<p class="muted">Inscribite para tomar notas.</p>` : `<form class="note-form">
              <textarea class="input" name="text" rows="3" maxlength="1000" placeholder="Escribí una nota para vos…"></textarea>
              <div class="note-foot"><small class="muted" data-stamp>${l.type === "video" ? "Se guarda con el minuto del video" : ""}</small><button class="btn sm" type="submit">Guardar nota</button></div>
            </form>
            <ul class="notes" data-notes></ul>
            <button class="link small" type="button" data-notesdl>${icon("download", "sm")} Descargar todas mis notas del curso</button>`}
          </section>

          <section class="pl-pane" data-pane="qa" hidden>
            ${isPreview ? "" : `<form class="qa-form"><textarea class="input" name="text" rows="2" maxlength="800" placeholder="¿Tenés una duda sobre esta lección? Preguntale al instructor y a tus compañeros."></textarea><button class="btn sm" type="submit">Publicar pregunta</button></form>`}
            <div class="threads" data-threads></div>
          </section>
        </main>
        <div class="pl-drawer">
          <div class="pl-scrim" data-side-close></div>
          <aside class="pl-side" aria-label="Contenido del curso">
            <div class="pl-side-head"><b>Contenido del curso</b><button class="icon-btn" type="button" data-side-close aria-label="Cerrar">${icon("x")}</button></div>
            <div class="pl-outline" data-outline>${outline()}</div>
          </aside>
        </div>
      </div>
    </div>`,
    mount(host) {
      const cleanups = [];
      const player = $(".player", host);

      /* ---- panel lateral (cajón en celular) */
      const side = (open) => { player.classList.toggle("side-open", open); $("[data-side]", host).setAttribute("aria-expanded", String(open)); };
      $("[data-side]", host).addEventListener("click", () => {
        if (matchMedia("(max-width: 1080px)").matches) side(!player.classList.contains("side-open"));
        else player.classList.toggle("side-hidden");
      });
      $$("[data-side-close]", host).forEach((b) => b.addEventListener("click", () => side(false)));
      /* Centra la lección actual dentro del índice (sin mover la página) */
      const sideEl = $(".pl-side", host), curEl = $(".pl-outline .is-cur", host);
      if (sideEl && curEl) sideEl.scrollTop = Math.max(0, curEl.offsetTop - sideEl.clientHeight / 2);

      /* ---- pestañas */
      $$("[data-tab]", host).forEach((t) => t.addEventListener("click", () => {
        $$("[data-tab]", host).forEach((x) => x.setAttribute("aria-selected", String(x === t)));
        $$("[data-pane]", host).forEach((p) => (p.hidden = p.dataset.pane !== t.dataset.tab));
      }));

      /* ---- completar */
      const refreshProgress = () => {
        $("[data-prog]", host).innerHTML = progHTML();
        $("[data-outline]", host).innerHTML = outline();
        const b = $("[data-done]", host);
        if (b) { const d = doneNow(); b.classList.toggle("is-done", d); b.classList.toggle("ghost", !d); b.innerHTML = d ? `${icon("check", "sm")} Completada` : `${icon("checkc", "sm")} Marcar como completada`; }
      };
      const complete = (score) => {
        if (isPreview) return;
        const wasDone = doneNow();
        const r = S.completeLesson(u.id, c.id, l.id, score);
        e = r.e;
        refreshProgress();
        if (!wasDone) {
          const p = S.progress(e, c);
          if (p.lessonsDone && c.exam && !p.examPassed) {
            const m = modal({ title: "¡Completaste todas las lecciones!", body: `<div class="celebrate">${icon("trophy")}<p>Ya podés rendir el examen final de <b>${esc(c.title)}</b>. Aprobás con ${c.exam.pass}% y obtenés tu certificado al instante.</p></div>`, actions: `<button class="btn ghost" data-close>Más tarde</button><a class="btn" href="#/examen/${c.slug}" data-close>Rendir examen</a>` });
            void m;
          } else if (p.status === "done" && !c.exam) toast("¡Terminaste el curso! Tu certificado está listo.");
          else toast("Lección completada");
        }
      };
      $("[data-done]", host)?.addEventListener("click", async () => {
        if (doneNow()) {
          if (e?.cert) return toast("El curso ya está aprobado", "info");
          if (await confirmDialog("La lección va a volver a figurar como pendiente.", { title: "¿Desmarcar la lección?", ok: "Desmarcar" })) { S.uncompleteLesson(u.id, c.id, l.id); refreshProgress(); }
        } else complete();
      });

      /* ---- registro de tiempo de estudio (minutos reales) */
      let pending = 0;
      const flush = () => { if (pending >= 0.25 && !isPreview) { S.logMinutes(u.id, pending); pending = 0; } };
      const addSec = (s) => { pending += s / 60; if (pending >= 1) flush(); };
      cleanups.push(flush);

      /* ---- video */
      const vp = $(".vp:not(.is-embed):not(.is-empty)", host);
      if (vp) cleanups.push(wireVideo(vp, { u, c, l, e, next, addSec, complete, isPreview }));
      else if (l.type !== "quiz") {
        /* lectura o video embebido: cuenta tiempo con la pestaña visible, hasta 1,5 veces la duración estimada */
        let secs = 0;
        const t = setInterval(() => { if (document.visibilityState === "visible" && secs < l.min * 90) { secs += 5; addSec(5); } }, 5000);
        cleanups.push(() => clearInterval(t));
      }

      /* ---- control de módulo */
      const quiz = $(".mquiz", host);
      if (quiz) {
        quiz.addEventListener("submit", (ev) => {
          ev.preventDefault();
          const ans = l.qs.map((_, i) => quiz.querySelector(`input[name=q${i}]:checked`));
          if (ans.some((a) => !a)) { $("[data-qres]", quiz).textContent = "Te falta responder alguna pregunta."; return; }
          let ok = 0;
          l.qs.forEach((qq, i) => {
            const fs = quiz.querySelectorAll(".mq")[i];
            const chosen = +ans[i].value, good = chosen === qq.a;
            if (good) ok++;
            fs.classList.toggle("is-ok", good); fs.classList.toggle("is-bad", !good);
            fs.querySelectorAll(".opt").forEach((o, j) => { o.classList.toggle("is-correct", j === qq.a); o.classList.toggle("is-wrong", j === chosen && !good); });
            const fb = fs.querySelector(".mq-fb"); fb.hidden = false; fb.innerHTML = `${icon(good ? "checkc" : "info", "sm")} ${esc(qq.e || "")}`;
          });
          const score = Math.round((ok / l.qs.length) * 100);
          const pass = score >= 60;
          $("[data-qres]", quiz).innerHTML = `<b class="${pass ? "ok" : "bad"}">${score}%</b> · ${ok} de ${l.qs.length} correctas. ${pass ? "¡Control aprobado!" : "Repasá el módulo y probá de nuevo."}`;
          const btn = quiz.querySelector("button[type=submit]");
          btn.textContent = pass ? "Volver a intentar" : "Reintentar";
          btn.type = "button";
          btn.onclick = () => { quiz.reset(); quiz.querySelectorAll(".mq").forEach((fs) => { fs.classList.remove("is-ok", "is-bad"); fs.querySelector(".mq-fb").hidden = true; fs.querySelectorAll(".opt").forEach((o) => o.classList.remove("is-correct", "is-wrong")); }); btn.type = "submit"; btn.textContent = "Corregir"; btn.onclick = null; $("[data-qres]", quiz).textContent = "Respondé todas las preguntas para ver tu resultado."; quiz.scrollIntoView({ behavior: "smooth" }); };
          addSec(60);
          if (pass) complete(score);
        });
      }

      /* ---- materiales */
      const getRes = async (r) => {
        if (r.path) { try { const url = await S.api.materialUrl(r.path); if (url) window.open(url, "_blank", "noopener"); } catch (err) { toast(err.message, "err"); } return; }
        if (r.url) { window.open(r.url, "_blank", "noopener"); return; }
        const f2 = makeResource(r.gen, r.n);
        if (f2) { download(f2.file, f2.body, f2.mime); toast("Descargando " + r.n); }
      };
      $$("[data-res]", host).forEach((b) => b.addEventListener("click", () => getRes(l.res[+b.dataset.res])));
      $$("[data-resall]", host).forEach((b) => b.addEventListener("click", () => getRes(resAll[+b.dataset.resall])));
      $("[data-sumdl]", host)?.addEventListener("click", () => {
        const txt = [`${c.title}`, `${f.m.t} — ${l.t}`, "", l.sum || "", "", ...(l.pts || []).map((p) => "• " + p), ...(l.body || []), "", "Campus Amplifia · www.grupoamplifia.com"].join("\n");
        download(`Resumen - ${l.t}.txt`, txt);
      });

      /* ---- notas */
      const notesBox = $("[data-notes]", host);
      const vid = $("video", host);
      const drawNotes = () => {
        if (!notesBox) return;
        const ns = S.notesOf(u.id, l.id);
        $("[data-ncount]", host).textContent = ns.length;
        notesBox.innerHTML = ns.length ? ns.map((n) => `<li class="note">${n.t != null ? `<button class="note-t" type="button" data-seek="${n.t}">${icon("play", "xs")} ${fmtClock(n.t)}</button>` : ""}<p>${esc(n.text)}</p><button class="icon-btn sm" type="button" data-del="${n.id}" aria-label="Borrar nota">${icon("trash", "sm")}</button></li>`).join("") : `<li class="muted small">Todavía no tenés notas en esta lección.</li>`;
      };
      drawNotes();
      $(".note-form", host)?.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const ta = ev.target.text;
        if (!ta.value.trim()) return;
        S.addNote(u.id, c.id, l.id, ta.value.trim(), vid ? Math.floor(vid.currentTime) : null);
        ta.value = "";
        drawNotes();
        toast("Nota guardada");
      });
      notesBox?.addEventListener("click", (ev) => {
        const s = ev.target.closest("[data-seek]"), d = ev.target.closest("[data-del]");
        if (s && vid) { vid.currentTime = +s.dataset.seek; vid.play(); vp?.scrollIntoView({ behavior: "smooth", block: "center" }); }
        if (d) { S.deleteNote(d.dataset.del); drawNotes(); }
      });
      $("[data-notesdl]", host)?.addEventListener("click", () => {
        const all = S.db.notes.filter((n) => n.uid === u.id && n.cid === c.id);
        if (!all.length) return toast("Todavía no tenés notas en este curso", "info");
        const txt = [`Mis notas — ${c.title}`, ""].concat(c.modules.flatMap((m) => m.lessons.flatMap((x) => { const ns = all.filter((n) => n.lid === x.id); return ns.length ? [`## ${x.t}`, ...ns.map((n) => `${n.t != null ? "[" + fmtClock(n.t) + "] " : ""}${n.text}`), ""] : []; }))).join("\n");
        download(`Notas - ${c.title}.txt`, txt);
      });
      if (vid) {
        const stamp = $("[data-stamp]", host);
        const upd = () => { if (stamp) stamp.innerHTML = `${icon("clock", "xs")} Se guarda en el minuto ${fmtClock(vid.currentTime)}`; };
        vid.addEventListener("timeupdate", upd);
      }

      /* ---- preguntas */
      const thBox = $("[data-threads]", host);
      const drawThreads = () => {
        const ts = S.threadsOf(c.id, l.id);
        thBox.innerHTML = ts.length ? ts.map((t) => { const tu = S.user(t.uid); return `<article class="thread">
          <div class="th-q">${avatar(tu)}<div><div class="th-h"><b>${esc(tu?.name || "Alumno")}</b><time>${relTime(t.at)}</time></div><p>${esc(t.text)}</p></div></div>
          ${t.replies.map((r) => { const ri = r.iid && S.instructor(r.iid); const ru = r.uid && S.user(r.uid); const who = ri ? { name: ri.name, photo: ri.photo } : ru; return `<div class="th-r ${ri ? "is-ins" : ""}">${avatar(who)}<div><div class="th-h"><b>${esc(who?.name || "")}</b>${ri ? `<span class="chip chip-ok">Instructor</span>` : ru?.role === "admin" ? `<span class="chip chip-ok">Amplifia</span>` : ""}<time>${relTime(r.at)}</time></div><p>${esc(r.text)}</p></div></div>`; }).join("")}
          ${isPreview ? "" : `<form class="th-reply" data-tid="${t.id}"><input class="input" name="text" maxlength="600" placeholder="Responder…" aria-label="Responder"><button class="icon-btn" type="submit" aria-label="Enviar respuesta">${icon("arrow")}</button></form>`}
        </article>`; }).join("") : `<p class="muted small">Nadie preguntó todavía en esta lección.</p>`;
      };
      drawThreads();
      $(".qa-form", host)?.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const v = ev.target.text.value.trim();
        if (v.length < 5) return toast("Escribí tu pregunta con un poco más de detalle", "err");
        S.addThread(u.id, c.id, l.id, v);
        ev.target.text.value = "";
        drawThreads();
        toast("Pregunta publicada. Te avisamos cuando respondan.");
      });
      thBox.addEventListener("submit", (ev) => {
        const fm = ev.target.closest(".th-reply");
        if (!fm) return;
        ev.preventDefault();
        const v = fm.text.value.trim();
        if (!v) return;
        S.addReply(fm.dataset.tid, u.id, v);
        drawThreads();
      });

      return () => cleanups.forEach((fn) => fn());
    },
  };
}

/* ------------------------------------------------------------------ reproductor propio */
function wireVideo(vp, { u, c, l, e, next, addSec, complete, isPreview }) {
  const v = $("video", vp);
  const big = $(".vp-big", vp), seek = $(".vp-seek input", vp), fill = $(".vp-fill", vp), buf = $(".vp-buf", vp);
  const time = $(".vp-time", vp), vol = $(".vp-vol input", vp), speedB = $(".vp-speed", vp), endBox = $(".vp-end", vp);
  let speed = +(localStorage.getItem("amp_speed") || 1);
  let lastT = 0, watched = 0, savedAt = 0, hideT, cdT, completed = !!(e && e.done[l.id]);
  const startPos = e?.pos?.[l.id] || 0;

  const setPlayIcon = () => {
    const playing = !v.paused && !v.ended;
    $('[data-k="play"]', vp).innerHTML = icon(playing ? "pause" : "play");
    $('[data-k="play"]', vp).setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
    vp.classList.toggle("is-playing", playing);
  };
  const paintTime = () => {
    const d = v.duration || 0;
    const p = d ? v.currentTime / d : 0;
    fill.style.width = p * 100 + "%";
    seek.value = Math.round(p * 1000);
    time.textContent = `${fmtClock(v.currentTime)} / ${fmtClock(d)}`;
    if (v.buffered.length && d) buf.style.width = (v.buffered.end(v.buffered.length - 1) / d) * 100 + "%";
  };
  const showCtrl = () => { vp.classList.add("show-ctrl"); clearTimeout(hideT); hideT = setTimeout(() => { if (!v.paused) vp.classList.remove("show-ctrl"); }, 2400); };
  const toggle = () => { if (v.paused || v.ended) { endBox.hidden = true; clearInterval(cdT); v.play().catch(() => {}); } else v.pause(); };
  const savePos = () => { if (e && !isPreview && v.currentTime > 2 && v.duration && v.currentTime < v.duration - 2) S.setPos(u.id, c.id, l.id, v.currentTime); };

  v.playbackRate = speed;
  speedB.textContent = String(speed).replace(".", ",") + "×";
  v.addEventListener("loadedmetadata", () => {
    if (startPos && startPos < v.duration - 3) { v.currentTime = startPos; if (!completed) toastResume(startPos); }
    paintTime();
  });
  const toastResume = (s) => toast(`Seguís desde ${fmtClock(s)}`, "info");
  v.addEventListener("play", () => { setPlayIcon(); showCtrl(); big.hidden = true; });
  v.addEventListener("pause", () => { setPlayIcon(); vp.classList.add("show-ctrl"); savePos(); });
  v.addEventListener("progress", paintTime);
  v.addEventListener("seeked", paintTime);
  v.addEventListener("timeupdate", () => {
    const t = v.currentTime, dt = t - lastT;
    if (!v.paused && dt > 0 && dt < 1.5) { watched += dt; addSec(dt / (v.playbackRate || 1)); }
    lastT = t;
    paintTime();
    if (Date.now() - savedAt > 5000) { savedAt = Date.now(); savePos(); }
    /* Se completa sola al ver de verdad el 85 % (adelantar no cuenta) */
    if (!completed && v.duration && watched >= v.duration * 0.85) { completed = true; complete(); }
  });
  v.addEventListener("ended", () => {
    setPlayIcon();
    if (!completed && watched >= (v.duration || 0) * 0.5) { completed = true; complete(); }
    if (e && !isPreview) S.setPos(u.id, c.id, l.id, 0);
    const ok = $(".vp-end-ok", endBox);
    if (ok) ok.innerHTML = completed ? `${icon("checkc")} Lección completada` : `${icon("info")} Llegaste al final del video`;
    endBox.hidden = false;
    const cd = $("[data-cd]", endBox);
    if (cd && next) {
      let n = 6;
      cdT = setInterval(() => { n--; cd.textContent = n; if (n <= 0) { clearInterval(cdT); location.hash = `#/aprender/${c.slug}/${next.id}`; } }, 1000);
    }
  });
  $('[data-k="stay"]', vp)?.addEventListener("click", () => { clearInterval(cdT); endBox.hidden = true; });

  big.addEventListener("click", toggle);
  v.addEventListener("click", toggle);
  v.addEventListener("dblclick", () => fullscreen());
  vp.addEventListener("pointermove", showCtrl);
  seek.addEventListener("input", () => { if (v.duration) { v.currentTime = (seek.value / 1000) * v.duration; lastT = v.currentTime; paintTime(); } });
  vol.addEventListener("input", () => { v.volume = +vol.value; v.muted = v.volume === 0; muteIcon(); });
  const muteIcon = () => { $('[data-k="mute"]', vp).innerHTML = icon(v.muted || v.volume === 0 ? "mute" : "volume"); };
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (vp.requestFullscreen) vp.requestFullscreen().catch(() => v.webkitEnterFullscreen?.());
    else v.webkitEnterFullscreen?.();
  };
  const onFs = () => { $('[data-k="full"]', vp).innerHTML = icon(document.fullscreenElement ? "unfull" : "full"); };
  document.addEventListener("fullscreenchange", onFs);

  vp.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-k]");
    if (!b) return;
    const k = b.dataset.k;
    if (k === "play") toggle();
    if (k === "back") v.currentTime = Math.max(0, v.currentTime - 10);
    if (k === "fwd") v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
    if (k === "mute") { v.muted = !v.muted; if (!v.muted && v.volume === 0) v.volume = 1; vol.value = v.muted ? 0 : v.volume; muteIcon(); }
    if (k === "speed") { speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; v.playbackRate = speed; localStorage.setItem("amp_speed", speed); speedB.textContent = String(speed).replace(".", ",") + "×"; }
    if (k === "full") fullscreen();
  });

  const onKey = (ev) => {
    if (ev.target.closest("input, textarea, select, [contenteditable]")) return;
    const inPlayer = vp.contains(document.activeElement) || document.activeElement === document.body;
    if (!inPlayer) return;
    const k = ev.key.toLowerCase();
    if (k === " " || k === "k") { ev.preventDefault(); toggle(); }
    else if (k === "arrowleft" || k === "j") { v.currentTime = Math.max(0, v.currentTime - (k === "j" ? 10 : 5)); showCtrl(); }
    else if (k === "arrowright" || k === "l") { v.currentTime = Math.min(v.duration || 0, v.currentTime + (k === "l" ? 10 : 5)); showCtrl(); }
    else if (k === "f") fullscreen();
    else if (k === "m") $('[data-k="mute"]', vp).click();
  };
  document.addEventListener("keydown", onKey);
  vp.classList.add("show-ctrl");
  setPlayIcon();

  return () => {
    savePos();
    clearInterval(cdT);
    clearTimeout(hideT);
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("fullscreenchange", onFs);
    v.pause();
    v.removeAttribute("src");
    v.load();
  };
}

