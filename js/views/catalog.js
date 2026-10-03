/* Catálogo, rutas de aprendizaje y "Mis cursos" */
import { icon } from "../core/icons.js";
import { esc, fmtDur, debounce, $, $$ } from "../core/util.js";
import * as S from "../core/store.js";
import { me } from "../core/auth.js";
import { courseCard, empty, bar, cover, animateIn } from "../core/ui.js";

const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* ------------------------------------------------------------------ catálogo */
export function catalogView(_, query) {
  const all = S.visibleCourses();
  const state = { q: query.q || "", cat: query.cat || "", level: query.nivel || "", sort: query.orden || "dest" };
  const count = (cat) => all.filter((c) => !cat || c.cat === cat).length;

  return {
    title: "Catálogo", nav: "catalogo",
    html: `
    <section class="page-head">
      <div>
        <span class="kicker">Catálogo · ${all.length} cursos</span>
        <h1 class="display">Capacitaciones para <em>amplificar</em> tu trabajo.</h1>
        <p class="lead">Procesos, mejora continua, liderazgo, equipos, inteligencia artificial y datos. Todos los cursos incluyen materiales descargables, examen final y certificado verificable.</p>
      </div>
    </section>

    <div class="toolbar">
      <label class="search-box">${icon("search")}<input type="search" placeholder="Buscar por tema, curso o instructor" value="${esc(state.q)}" aria-label="Buscar en el catálogo"></label>
      <div class="selects">
        <label class="select">${icon("bolt", "sm")}<select name="level" aria-label="Nivel"><option value="">Todos los niveles</option>${["Inicial", "Intermedio", "Avanzado"].map((l) => `<option ${state.level === l ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label class="select">${icon("filter", "sm")}<select name="sort" aria-label="Ordenar"><option value="dest">Destacados</option><option value="new">Más recientes</option><option value="short">Más cortos</option><option value="rating">Mejor valorados</option><option value="az">A–Z</option></select></label>
      </div>
    </div>
    <div class="chips" role="tablist" aria-label="Frentes">
      <button class="chip-btn" role="tab" data-cat="">Todos <small>${count("")}</small></button>
      ${S.db.categories.map((c) => `<button class="chip-btn" role="tab" data-cat="${c.id}">${esc(c.name)} <small>${count(c.id)}</small></button>`).join("")}
    </div>

    <section class="paths-strip" data-strip>
      <div class="sec-head"><h2>Rutas de aprendizaje</h2><a class="link" href="#/rutas">Ver rutas ${icon("right", "sm")}</a></div>
      <div class="paths-row">${S.db.paths.map(pathTeaser).join("")}</div>
    </section>

    <div class="results-head"><h2 class="sr-only">Resultados</h2><p class="muted small" data-count></p></div>
    <div class="cards cards-3" data-grid></div>`,
    mount(host) {
      const grid = $("[data-grid]", host), cnt = $("[data-count]", host), strip = $("[data-strip]", host);
      const input = $(".search-box input", host);
      $("select[name=sort]", host).value = state.sort;
      const draw = () => {
        const qv = norm(state.q.trim());
        let list = all.filter((c) => (!state.cat || c.cat === state.cat) && (!state.level || c.level === state.level));
        if (qv) list = list.filter((c) => norm([c.title, c.subtitle, c.desc, S.category(c.cat).name, ...c.instructors.map((i) => S.instructor(i)?.name), ...c.modules.flatMap((m) => m.lessons.map((l) => l.t))].join(" ")).includes(qv));
        const sorters = {
          dest: (a, b) => (b.featured - a.featured) || (a.soon - b.soon) || a.order - b.order,
          new: (a, b) => b.updated - a.updated,
          short: (a, b) => S.courseMinutes(a) - S.courseMinutes(b),
          rating: (a, b) => S.rating(b.id).avg - S.rating(a.id).avg,
          az: (a, b) => a.title.localeCompare(b.title, "es"),
        };
        list.sort(sorters[state.sort] || sorters.dest);
        grid.innerHTML = list.length ? list.map((c) => courseCard(c)).join("") : empty("search", "No encontramos cursos", "Probá con otras palabras o quitá algún filtro.", `<button class="btn ghost" data-clear>Limpiar filtros</button>`);
        cnt.textContent = `${list.length} ${list.length === 1 ? "curso" : "cursos"}${state.cat ? " en " + S.category(state.cat).name : ""}${state.q ? ` para «${state.q}»` : ""}`;
        strip.hidden = !!(state.q || state.cat || state.level);
        $$(".chip-btn", host).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.cat === state.cat)));
        const qs = new URLSearchParams();
        if (state.q) qs.set("q", state.q); if (state.cat) qs.set("cat", state.cat); if (state.level) qs.set("nivel", state.level); if (state.sort !== "dest") qs.set("orden", state.sort);
        history.replaceState(null, "", "#/catalogo" + (qs.toString() ? "?" + qs : ""));
        animateIn(grid);
      };
      input.addEventListener("input", debounce(() => { state.q = input.value; draw(); }, 140));
      $$(".chip-btn", host).forEach((b) => b.addEventListener("click", () => { state.cat = b.dataset.cat; draw(); }));
      $("select[name=level]", host).addEventListener("change", (e) => { state.level = e.target.value; draw(); });
      $("select[name=sort]", host).addEventListener("change", (e) => { state.sort = e.target.value; draw(); });
      animateIn(strip);
      grid.addEventListener("click", (e) => { if (e.target.closest("[data-clear]")) { Object.assign(state, { q: "", cat: "", level: "" }); input.value = ""; $("select[name=level]", host).value = ""; draw(); } });
      draw();
    },
  };
}

function pathTeaser(p) {
  const cs = p.courses.map(S.course).filter(Boolean);
  const u = me();
  const done = cs.filter((c) => S.progress(S.enrollment(u.id, c.id), c).status === "done").length;
  const min = cs.reduce((s, c) => s + S.courseMinutes(c), 0);
  return `<a class="path-card" href="#/rutas?r=${p.id}">
    <div class="path-covers">${cs.slice(0, 4).map((c) => cover(c)).join("")}</div>
    <div class="path-body"><span class="kicker">Ruta · ${cs.length} cursos · ${fmtDur(min)}</span><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p>
    <div class="path-prog">${bar(Math.round((done / cs.length) * 100))}<small>${done} de ${cs.length} completados</small></div></div>
  </a>`;
}

/* ------------------------------------------------------------------ rutas */
export function pathsView(_, query) {
  const u = me();
  return {
    title: "Rutas de aprendizaje", nav: "rutas",
    html: `
    <section class="page-head">
      <div><span class="kicker">Rutas de aprendizaje</span>
      <h1 class="display">Un camino <em>a la medida</em> de tu rol.</h1>
      <p class="lead">Secuencias de cursos pensadas para desarrollar un perfil completo. Avanzá en orden o elegí por dónde empezar.</p></div>
    </section>
    <div class="paths">
      ${S.db.paths.map((p) => {
        const cs = p.courses.map(S.course).filter(Boolean);
        const ps = cs.map((c) => ({ c, p: S.progress(S.enrollment(u.id, c.id), c) }));
        const done = ps.filter((x) => x.p.status === "done").length;
        const pct = Math.round(ps.reduce((s, x) => s + x.p.pct, 0) / ps.length);
        const nextIdx = ps.findIndex((x) => x.p.status !== "done");
        return `<section class="panel path" id="${p.id}">
          <div class="path-head">
            <div><span class="kicker">${cs.length} cursos · ${fmtDur(cs.reduce((s, c) => s + S.courseMinutes(c), 0))}</span><h2>${esc(p.title)}</h2><p class="muted">${esc(p.desc)}</p></div>
            <div class="path-pct"><b>${pct}%</b><small>${done} de ${cs.length} completados</small>${bar(pct)}</div>
          </div>
          <ol class="steps">
            ${ps.map((x, i) => `<li class="step ${x.p.status === "done" ? "is-done" : i === nextIdx ? "is-next" : ""}">
              <span class="step-n">${x.p.status === "done" ? icon("check") : i + 1}</span>
              <a class="step-card" href="#/curso/${x.c.slug}">
                ${cover(x.c, "sm")}
                <span class="step-body"><span class="kicker">${esc(S.category(x.c.cat).name)}${x.c.soon ? " · Próximamente" : ""}</span><b>${esc(x.c.title)}</b><small>${fmtDur(S.courseMinutes(x.c))} · ${esc(x.c.level)}</small>${x.p.status !== "none" ? bar(x.p.pct) : ""}</span>
                <span class="step-cta">${x.p.status === "done" ? icon("award") : x.p.status === "none" ? (x.c.soon ? icon("clock") : "Empezar") : `${x.p.pct}%`}</span>
              </a>
            </li>`).join("")}
          </ol>
        </section>`;
      }).join("")}
    </div>`,
    mount(host) {
      animateIn(host);
      const id = query.r;
      if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    },
  };
}

/* ------------------------------------------------------------------ mis cursos */
export function mineView(_, query) {
  const u = me();
  const rows = S.enrollmentsOf(u.id).map((e) => ({ e, c: S.course(e.cid) })).filter((x) => x.c).map((x) => ({ ...x, p: S.progress(x.e, x.c) }));
  const tabs = {
    curso: rows.filter((x) => x.p.status !== "done"),
    completados: rows.filter((x) => x.p.status === "done"),
    guardados: (u.saved || []).map(S.course).filter(Boolean),
  };
  const tab = tabs[query.tab] ? query.tab : "curso";
  const row = ({ e, c, p }) => {
    const nl = S.nextLesson(e, c);
    /* Si todavía no empezó, primero ve la página del curso (descripción y programa); desde ahí entra con «Empezar» */
    const href = p.status === "exam" ? `#/examen/${c.slug}` : p.status === "done" || p.done === 0 ? `#/curso/${c.slug}` : `#/aprender/${c.slug}/${nl.id}`;
    return `<article class="mrow">
      <a class="mrow-media" href="#/curso/${c.slug}">${cover(c)}</a>
      <div class="mrow-body">
        <span class="kicker">${esc(S.category(c.cat).name)}</span>
        <h3><a href="#/curso/${c.slug}">${esc(c.title)}</a></h3>
        <div class="mrow-prog">${bar(p.pct)}<span><b>${p.pct}%</b></span></div>
        <small class="muted">${p.status === "done" ? `${icon("award", "sm")} Certificado ${esc(e.cert || "")}` : p.status === "exam" ? `${icon("quiz", "sm")} Lecciones completas · falta el examen final` : `${p.done} de ${p.total} lecciones · sigue: ${esc(nl.t)}`}</small>
      </div>
      <div class="mrow-cta">${p.status === "done" ? `<a class="btn ghost sm" href="#/certificado/${e.cert}">${icon("award", "sm")} Certificado</a>` : `<a class="btn sm" href="${href}">${p.status === "exam" ? "Rendir examen" : p.done ? "Continuar" : "Empezar"} ${icon("arrow", "sm")}</a>`}</div>
    </article>`;
  };
  return {
    title: "Mis cursos", nav: "mis-cursos",
    html: `
    <section class="page-head"><div><span class="kicker">Mis cursos</span><h1 class="display">Tu <em>aprendizaje</em>.</h1></div></section>
    <div class="tabs" role="tablist">
      <a role="tab" href="#/mis-cursos" aria-selected="${tab === "curso"}">En curso <small>${tabs.curso.length}</small></a>
      <a role="tab" href="#/mis-cursos?tab=completados" aria-selected="${tab === "completados"}">Completados <small>${tabs.completados.length}</small></a>
      <a role="tab" href="#/mis-cursos?tab=guardados" aria-selected="${tab === "guardados"}">Guardados <small>${tabs.guardados.length}</small></a>
    </div>
    ${tab === "guardados"
      ? (tabs.guardados.length ? `<div class="cards cards-3">${tabs.guardados.map((c) => courseCard(c)).join("")}</div>` : empty("bookmark", "No guardaste cursos", "Tocá el marcador en un curso para tenerlo a mano.", `<a class="btn" href="#/catalogo">Explorar catálogo</a>`))
      : tabs[tab].length ? `<div class="mlist">${tabs[tab].map(row).join("")}</div>`
      : empty(tab === "curso" ? "book" : "award", tab === "curso" ? "No tenés cursos en curso" : "Todavía no completaste cursos", tab === "curso" ? "Elegí un curso del catálogo para empezar." : "Cuando apruebes un curso, aparece acá con su certificado.", `<a class="btn" href="#/catalogo">Ir al catálogo</a>`)}`,
    mount: (host) => animateIn(host),
  };
}
