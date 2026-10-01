/* Componentes de interfaz compartidos */
import { icon, LOGO } from "./icons.js";
import { esc, initials, hashStr, rng, fmtDur, relTime, $, $$, debounce } from "./util.js";
import * as S from "./store.js";
import { me, isAdmin, logout } from "./auth.js";
import { go } from "./router.js";

/* ------------------------------------------------------------------ shell */
let shellLayout = null;
const root = () => document.getElementById("app");

const NAV = [
  { id: "inicio", href: "#/inicio", icon: "home", label: "Inicio" },
  { id: "catalogo", href: "#/catalogo", icon: "grid", label: "Catálogo" },
  { id: "mis-cursos", href: "#/mis-cursos", icon: "book", label: "Mis cursos" },
  { id: "rutas", href: "#/rutas", icon: "route", label: "Rutas" },
  { id: "agenda", href: "#/agenda", icon: "live", label: "En vivo" },
  { id: "certificados", href: "#/certificados", icon: "award", label: "Certificados" },
];
const ADMIN_NAV = [
  { id: "admin", href: "#/admin", icon: "chart", label: "Resumen" },
  { id: "admin-cursos", href: "#/admin/cursos", icon: "layers", label: "Cursos" },
  { id: "admin-alumnos", href: "#/admin/alumnos", icon: "users", label: "Alumnos" },
  { id: "admin-agenda", href: "#/admin/agenda", icon: "calendar", label: "Clases en vivo" },
  { id: "admin-reportes", href: "#/admin/reportes", icon: "trend", label: "Reportes" },
  { id: "admin-ajustes", href: "#/admin/ajustes", icon: "settings", label: "Ajustes" },
];
const TABS = [
  { id: "inicio", href: "#/inicio", icon: "home", label: "Inicio" },
  { id: "catalogo", href: "#/catalogo", icon: "grid", label: "Catálogo" },
  { id: "mis-cursos", href: "#/mis-cursos", icon: "book", label: "Mis cursos" },
  { id: "agenda", href: "#/agenda", icon: "live", label: "En vivo" },
  { id: "perfil", href: "#/perfil", icon: "user", label: "Perfil" },
];

export function avatar(u, size = "") {
  if (!u) return "";
  if (u.photo) return `<img class="av ${size}" src="${esc(u.photo)}" alt="">`;
  const tone = hashStr(u.name || "") % 3;
  return `<span class="av ${size} t${tone}" aria-hidden="true">${esc(initials(u.name))}</span>`;
}

const brandHTML = `<a class="brand" href="#/inicio" aria-label="Campus Amplifia, inicio">${LOGO}<span class="brand-name">Amplifia</span><span class="brand-tag">Campus</span></a>`;

function sidebar() {
  const link = (n) => `<a class="side-link" data-nav="${n.id}" href="${n.href}">${icon(n.icon)}<span>${n.label}</span></a>`;
  return `<aside class="side" aria-label="Navegación principal">
    ${brandHTML}
    <nav class="side-nav">
      <span class="side-label">Aprender</span>
      ${NAV.map(link).join("")}
      ${isAdmin() ? `<span class="side-label">Administración</span>${ADMIN_NAV.map(link).join("")}` : ""}
    </nav>
    <div class="side-foot">
      ${S.setting("youtubeChannel") ? `<a class="side-out" href="${esc(S.setting("youtubeChannel"))}" target="_blank" rel="noopener">${icon("video")}<span>Canal de YouTube</span>${icon("ext", "sm")}</a>` : ""}
      <a class="side-out" href="https://www.grupoamplifia.com" target="_blank" rel="noopener">${icon("globe")}<span>grupoamplifia.com</span>${icon("ext", "sm")}</a>
      ${S.MODE === "demo" ? `<span class="demo-pill" title="Los datos se guardan en este navegador. No usar con alumnos reales.">${icon("info", "sm")} Modo demostración</span>` : ""}
    </div>
  </aside>`;
}

function topbar(layout) {
  const u = me();
  const unread = S.notifsOf(u.id).filter((n) => !n.read).length;
  return `<header class="top ${layout === "focus" ? "is-focus" : ""}">
    <div class="top-brand">${brandHTML}</div>
    <button class="search-trigger" type="button" data-act="search" aria-label="Buscar">${icon("search")}<span>Buscar cursos y lecciones</span><kbd>Ctrl K</kbd></button>
    <div class="top-actions">
      <button class="icon-btn search-mobile" type="button" data-act="search" aria-label="Buscar">${icon("search")}</button>
      <button class="icon-btn bell" type="button" data-act="notifs" aria-label="Notificaciones${unread ? `, ${unread} sin leer` : ""}" aria-haspopup="true">${icon("bell")}${unread ? `<b class="dot">${unread}</b>` : ""}</button>
      <button class="user-btn" type="button" data-act="usermenu" aria-haspopup="true" aria-label="Menú de usuario">${avatar(u)}<span class="user-name">${esc(u.name.split(" ")[0])}</span>${icon("down", "sm")}</button>
    </div>
  </header>`;
}

function tabbar() {
  return `<nav class="tabbar" aria-label="Navegación">${TABS.map((t) => `<a data-nav="${t.id}" href="${t.href}">${icon(t.icon)}<span>${t.label}</span></a>`).join("")}</nav>`;
}

export function shell(layout, nav) {
  const app = root();
  const key = layout + (me()?.id || "") + (isAdmin() ? "a" : "");
  if (shellLayout !== key) {
    shellLayout = key;
    if (layout === "bare") app.innerHTML = `<main id="view" class="view bare"></main>`;
    else if (layout === "focus") app.innerHTML = `<div class="shell is-focus"><main id="view" class="view focus"></main></div>`;
    else app.innerHTML = `<div class="shell">${sidebar()}${topbar(layout)}<main id="view" class="view"></main>${tabbar()}</div>`;
    app.dataset.layout = layout;
  }
  $$("[data-nav]", app).forEach((a) => {
    const on = a.dataset.nav === nav;
    a.classList.toggle("is-on", on);
    on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
  });
  return document.getElementById("view");
}

export function resetShell() { shellLayout = null; }

export function refreshTop() {
  const t = document.querySelector(".top");
  if (!t || !me()) return;
  const layout = root().dataset.layout;
  t.outerHTML = topbar(layout);
}

/* Acciones globales del encabezado */
document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act;
  if (act === "search") { ev.preventDefault(); openSearch(); }
  if (act === "notifs") { ev.preventDefault(); toggleNotifs(b); }
  if (act === "usermenu") { ev.preventDefault(); toggleUserMenu(b); }
});
document.addEventListener("keydown", (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k" && me()) { ev.preventDefault(); openSearch(); }
});

/* ------------------------------------------------------------------ popovers */
let pop = null;
function closePop() { if (pop) { pop.remove(); pop = null; document.removeEventListener("pointerdown", outside, true); } }
function outside(ev) { if (pop && !pop.contains(ev.target) && !ev.target.closest("[data-act]")) closePop(); }
function openPop(anchor, html, cls) {
  const same = pop && pop.dataset.for === cls;
  closePop();
  if (same) return null;
  pop = document.createElement("div");
  pop.className = "pop " + cls;
  pop.dataset.for = cls;
  pop.innerHTML = html;
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth;
  pop.style.top = r.bottom + 10 + "px";
  pop.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.right - w)) + "px";
  setTimeout(() => document.addEventListener("pointerdown", outside, true));
  pop.addEventListener("click", (e) => { if (e.target.closest("a")) closePop(); });
  return pop;
}
addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(); });
addEventListener("hashchange", closePop);
addEventListener("resize", closePop);

function toggleNotifs(anchor) {
  const u = me();
  const ns = S.notifsOf(u.id).slice(0, 8);
  const p = openPop(anchor, `<div class="pop-head"><b>Notificaciones</b>${ns.some((n) => !n.read) ? `<button class="link-btn" data-read>Marcar todo como leído</button>` : ""}</div>
    <div class="pop-list">${ns.length ? ns.map((n) => `<a class="notif ${n.read ? "" : "is-new"}" href="${esc(n.link || "#/inicio")}"><span class="notif-ic">${icon(n.icon || "bell")}</span><span><b>${esc(n.title)}</b><small>${esc(n.text)}</small><i>${relTime(n.at)}</i></span></a>`).join("") : `<p class="pop-empty">No tenés notificaciones.</p>`}</div>`, "pop-notifs");
  if (!p) return;
  p.querySelector("[data-read]")?.addEventListener("click", () => { S.markNotifsRead(u.id); closePop(); refreshTop(); });
}

function toggleUserMenu(anchor) {
  const u = me();
  const p = openPop(anchor, `<div class="pop-user">${avatar(u, "lg")}<div><b>${esc(u.name)}</b><small>${esc(u.email)}</small>${u.company ? `<small>${esc(u.company)}</small>` : ""}</div></div>
    <div class="pop-menu">
      <a href="#/perfil">${icon("user")} Mi perfil</a>
      <a href="#/certificados">${icon("award")} Mis certificados</a>
      ${isAdmin() ? `<a href="#/admin">${icon("chart")} Administración</a>` : ""}
      <a href="https://www.grupoamplifia.com" target="_blank" rel="noopener">${icon("globe")} Ir a grupoamplifia.com</a>
      <button type="button" data-logout>${icon("logout")} Cerrar sesión</button>
    </div>`, "pop-usermenu");
  if (!p) return;
  p.querySelector("[data-logout]").addEventListener("click", async () => { closePop(); await logout(); resetShell(); go("/ingresar"); toast("Cerraste sesión. ¡Hasta pronto!"); });
}

/* ------------------------------------------------------------------ búsqueda (Ctrl K) */
function openSearch() {
  closePop();
  const items = [];
  S.visibleCourses().forEach((c) => {
    items.push({ kind: "Curso", title: c.title, sub: S.category(c.cat).name, href: `#/curso/${c.slug}`, ic: "book" });
    c.modules.forEach((m) => m.lessons.forEach((l) => items.push({ kind: "Lección", title: l.t, sub: c.title, href: `#/aprender/${c.slug}/${l.id}`, ic: l.type === "video" ? "video" : l.type === "quiz" ? "quiz" : "read" })));
  });
  [["Inicio", "#/inicio", "home"], ["Catálogo", "#/catalogo", "grid"], ["Mis cursos", "#/mis-cursos", "book"], ["Rutas de aprendizaje", "#/rutas", "route"], ["Clases en vivo", "#/agenda", "live"], ["Certificados", "#/certificados", "award"], ["Mi perfil", "#/perfil", "user"]].forEach(([t, h, i]) => items.push({ kind: "Página", title: t, sub: "", href: h, ic: i }));
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const m = modal({
    cls: "search-modal",
    body: `<div class="sp"><div class="sp-in">${icon("search")}<input type="search" placeholder="Buscá un curso, una lección o una sección…" aria-label="Buscar" autocomplete="off"><kbd>Esc</kbd></div><div class="sp-list" role="listbox"></div></div>`,
  });
  const input = m.el.querySelector("input"), list = m.el.querySelector(".sp-list");
  let sel = 0, shown = [];
  const draw = () => {
    const qv = norm(input.value.trim());
    shown = (qv ? items.filter((it) => norm(it.title + " " + it.sub).includes(qv)) : items.filter((it) => it.kind !== "Lección")).slice(0, 9);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.innerHTML = shown.length ? shown.map((it, i) => `<a class="sp-item ${i === sel ? "is-sel" : ""}" role="option" href="${it.href}">${icon(it.ic)}<span><b>${esc(it.title)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span><em>${it.kind}</em></a>`).join("") : `<p class="pop-empty">Sin resultados para «${esc(input.value)}».</p>`;
  };
  input.addEventListener("input", () => { sel = 0; draw(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { sel = Math.min(shown.length - 1, sel + 1); draw(); e.preventDefault(); }
    if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
    if (e.key === "Enter" && shown[sel]) { location.hash = shown[sel].href; m.close(); }
  });
  list.addEventListener("click", (e) => { if (e.target.closest("a")) m.close(); });
  draw();
  setTimeout(() => input.focus(), 30);
}

/* ------------------------------------------------------------------ modal / toast */
export function modal({ title = "", body = "", actions = "", cls = "", onClose } = {}) {
  const el = document.createElement("div");
  el.className = "modal " + cls;
  el.innerHTML = `<div class="modal-back" data-close></div><div class="modal-card" role="dialog" aria-modal="true" ${title ? `aria-label="${esc(title)}"` : ""}>
    ${title ? `<div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" type="button" data-close aria-label="Cerrar">${icon("x")}</button></div>` : ""}
    <div class="modal-body">${body}</div>${actions ? `<div class="modal-foot">${actions}</div>` : ""}</div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add("has-modal");
  const prev = document.activeElement;
  requestAnimationFrame(() => el.classList.add("is-open"));
  const close = () => {
    el.classList.remove("is-open");
    document.removeEventListener("keydown", key);
    setTimeout(() => { el.remove(); if (!document.querySelector(".modal")) document.documentElement.classList.remove("has-modal"); }, 200);
    prev?.focus?.();
    onClose?.();
  };
  const key = (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      const f = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', el).filter((x) => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { f[f.length - 1].focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { f[0].focus(); e.preventDefault(); }
    }
  };
  document.addEventListener("keydown", key);
  el.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  setTimeout(() => { const f = el.querySelector("[autofocus], input, textarea, select, .modal-foot .btn"); f?.focus(); }, 40);
  return { el, close };
}

export function confirmDialog(text, { title = "¿Confirmás?", ok = "Confirmar", danger = false } = {}) {
  return new Promise((res) => {
    let done = false;
    const m = modal({ title, body: `<p class="muted">${esc(text)}</p>`, actions: `<button class="btn ghost" data-no>Cancelar</button><button class="btn ${danger ? "danger" : ""}" data-yes>${esc(ok)}</button>`, onClose: () => { if (!done) res(false); } });
    m.el.querySelector("[data-yes]").addEventListener("click", () => { done = true; res(true); m.close(); });
    m.el.querySelector("[data-no]").addEventListener("click", () => { done = true; res(false); m.close(); });
  });
}

let toastT;
export function toast(text, kind = "ok") {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.innerHTML = `${icon(kind === "err" ? "alert" : kind === "info" ? "info" : "checkc")}<span>${esc(text)}</span>`;
  t.dataset.kind = kind;
  t.classList.remove("is-on"); void t.offsetWidth; t.classList.add("is-on");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("is-on"), 3600);
}

/* ------------------------------------------------------------------ piezas visuales */
export function bar(pct, cls = "") {
  return `<span class="bar ${cls}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="--p:${pct}%"></i></span>`;
}

export function ring(pct, { size = 120, sw = 8, label = "", sub = "" } = {}) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return `<div class="ring" style="--s:${size}px"><svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" class="ring-bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c}" style="--off:${c * (1 - Math.min(100, pct) / 100)}"/></svg><div class="ring-c"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</div></div>`;
}

export function stars(avg, n) {
  const full = Math.round(avg);
  return `<span class="stars" aria-label="${avg.toFixed(1)} de 5">${[1, 2, 3, 4, 5].map((i) => icon(i <= full ? "starf" : "star")).join("")}${n != null ? `<b>${avg.toFixed(1).replace(".", ",")}</b><small>(${n})</small>` : ""}</span>`;
}

export function empty(ic, title, text, cta = "") {
  return `<div class="empty">${icon(ic)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${cta}</div>`;
}

const typeIcon = { video: "video", lectura: "read", quiz: "quiz" };
export const lessonIcon = (l) => typeIcon[l.type] || "file";
export const typeLabel = { video: "Video", lectura: "Lectura", quiz: "Control" };

/* Portada: foto con tratamiento de marca o arte generativo por frente */
export function cover(c, cls = "") {
  if (c.cover) return `<div class="cover ${cls}"><img src="${esc(c.cover)}" alt="" loading="lazy" decoding="async"></div>`;
  return `<div class="cover is-art ${cls}">${art(c.key || c.id, c.cat)}</div>`;
}

export function art(seed, cat) {
  const r = rng("cover" + seed);
  const W = 400, H = 250;
  const gx = 80 + r() * 240, gy = 40 + r() * 170;
  let m = "";
  const L = "#d7f24a", P = "rgba(239,236,229,";
  if (cat === "equipos") {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const x = 120 + Math.cos((i / n) * Math.PI * 2) * 62 + r() * 10, y = 125 + Math.sin((i / n) * Math.PI * 2) * 46;
      m += `<circle cx="${x + 40}" cy="${y}" r="${30 + r() * 10}" fill="none" stroke="${i === 2 ? L : P + "0.55)"}" stroke-width="${i === 2 ? 2.2 : 1.2}"/>`;
    }
    m += `<circle cx="160" cy="125" r="9" fill="${L}"/>`;
  } else if (cat === "liderazgo") {
    let d = "M30 210", x = 30, y = 210;
    for (let i = 0; i < 8; i++) { x += 40; y -= 8 + r() * 22; d += ` L${x} ${y}`; }
    m += `<path d="${d}" fill="none" stroke="${P}0.6)" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="8" fill="${L}"/>`;
  } else if (cat === "mejora") {
    for (let i = 0; i < 4; i++) m += `<path d="M200 125 m-${40 + i * 22} 0 a${40 + i * 22} ${40 + i * 22} 0 0 1 ${40 + i * 22} -${40 + i * 22}" fill="none" stroke="${i === 3 ? L : P + (0.25 + i * 0.12) + ")"}" stroke-width="${i === 3 ? 2.4 : 1.2}" transform="rotate(${i * 90 + r() * 20} 200 125)"/>`;
  } else if (cat === "ia") {
    const pts = Array.from({ length: 14 }, () => [40 + r() * 320, 30 + r() * 190]);
    pts.forEach((p, i) => { const q2 = pts[(i * 5 + 3) % pts.length]; m += `<line x1="${p[0]}" y1="${p[1]}" x2="${q2[0]}" y2="${q2[1]}" stroke="${P}0.22)" stroke-width="1"/>`; });
    pts.forEach((p, i) => (m += `<circle cx="${p[0]}" cy="${p[1]}" r="${i === 4 ? 6 : 2.5}" fill="${i === 4 ? L : P + "0.8)"}"/>`));
  } else if (cat === "datos") {
    for (let i = 0; i < 9; i++) { const h = 30 + r() * 130; m += `<rect x="${60 + i * 32}" y="${210 - h}" width="18" height="${h}" fill="${i === 6 ? L : P + "0.18)"}"/>`; }
  } else {
    const bars = [[15, 100, 35, 100, 39, 57, 19, 57], [46, 116, 66, 116, 70, 42, 50, 42], [75, 125, 95, 125, 99, 35, 79, 35], [108, 159, 128, 159, 132, 8, 112, 8]];
    m += `<g transform="translate(130 45) scale(0.95)">${bars.map((b) => `<polygon points="${b.join(",")}" fill="${P}0.82)"/>`).join("")}<polygon points="15,102 15,72 105,48 105,78" fill="${L}"/></g>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><radialGradient id="g${hashStr(seed)}" cx="${gx / W}" cy="${gy / H}" r="0.7"><stop offset="0" stop-color="#d7f24a" stop-opacity="0.22"/><stop offset="1" stop-color="#d7f24a" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="#0b0b0a"/><rect width="${W}" height="${H}" fill="url(#g${hashStr(seed)})"/>${m}</svg>`;
}

export function courseMeta(c) {
  const n = S.lessonsOf(c).length;
  return `<span>${icon("clock", "sm")}${fmtDur(S.courseMinutes(c))}</span><span>${icon("list", "sm")}${n} lecciones</span><span>${icon("bolt", "sm")}${esc(c.level)}</span>`;
}

export function courseCard(c, { compact = false } = {}) {
  const u = me();
  const e = u && S.enrollment(u.id, c.id);
  const p = S.progress(e, c);
  const rt = S.rating(c.id);
  const ins = c.instructors.map(S.instructor).filter(Boolean);
  const badge = c.soon ? `<span class="chip chip-soon">Próximamente</span>` : p.status === "done" ? `<span class="chip chip-ok">${icon("check", "sm")}Completado</span>` : c.isNew ? `<span class="chip chip-new">Nuevo</span>` : "";
  return `<a class="ccard ${compact ? "is-compact" : ""}" href="#/curso/${esc(c.slug)}">
    <div class="ccard-media">${cover(c)}${badge}${e && p.status !== "done" ? `<span class="ccard-pct">${p.pct}%</span>` : ""}</div>
    <div class="ccard-body">
      <span class="kicker">${esc(S.category(c.cat).name)}</span>
      <h3>${esc(c.title)}</h3>
      ${compact ? "" : `<p class="ccard-sub">${esc(c.subtitle)}</p>`}
      <div class="meta">${courseMeta(c)}</div>
      ${e ? `<div class="ccard-prog">${bar(p.pct)}<small>${p.status === "done" ? "Certificado obtenido" : p.status === "exam" ? "Listo para el examen final" : `${p.done} de ${p.total} lecciones`}</small></div>`
        : `<div class="ccard-foot"><span class="ins">${ins.map((i) => `<img src="${esc(i.photo)}" alt="" loading="lazy">`).join("")}<small>${esc(ins.map((i) => i.name.split(" ")[0]).join(" y "))}</small></span>${rt.n ? stars(rt.avg, rt.n) : ""}</div>`}
    </div>
  </a>`;
}

/* Animación de entrada de barras y anillos al montar una vista */
export function animateIn(host) {
  setTimeout(() => { void host.offsetWidth; host.querySelectorAll(".bar, .ring, .seg").forEach((b) => b.classList.add("is-in")); }, 40);
}

export const field = (label, input, hint = "") => `<label class="field"><span class="field-l">${label}</span>${input}${hint ? `<small class="field-h">${hint}</small>` : ""}</label>`;

export function onStoreChange(fn) { return S.onChange(debounce(fn, 50)); }
