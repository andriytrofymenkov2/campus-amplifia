/* Certificados: listado, vista/impresión, verificación pública */
import { icon, LOGO } from "../core/icons.js";
import { esc, fmtDate, fmtDur, $ } from "../core/util.js";
import * as S from "../core/store.js";
import { me } from "../core/auth.js";
import { go } from "../core/router.js";
import { toast, empty } from "../core/ui.js";

const QR_SRC = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
const QR_SRI = "sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1";

export const verifyUrl = (code) => `${location.origin}${location.pathname}#/verificar/${code}`;

export function linkedInUrl(ct, c) {
  const d = new Date(ct.at);
  const qs = new URLSearchParams({ startTask: "CERTIFICATION_NAME", name: c.title, organizationName: "Grupo Amplifia", issueYear: d.getFullYear(), issueMonth: d.getMonth() + 1, certUrl: verifyUrl(ct.code), certId: ct.code });
  return "https://www.linkedin.com/profile/add?" + qs;
}

let qrLib = null;
function loadQR() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (qrLib) return qrLib;
  qrLib = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = QR_SRC; s.integrity = QR_SRI; s.crossOrigin = "anonymous"; s.referrerPolicy = "no-referrer";
    s.onload = () => res(window.qrcode); s.onerror = rej;
    document.head.appendChild(s);
  });
  return qrLib;
}
async function paintQR(el, text) {
  try {
    const qrcode = await loadQR();
    const qr = qrcode(0, "M"); qr.addData(text); qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
    el.innerHTML = `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" aria-label="Código QR de verificación"><path d="${d}" fill="currentColor"/></svg>`;
  } catch { el.classList.add("no-qr"); }
}

/* Lámina del certificado (escala con el contenedor: se usa en miniatura, pantalla e impresión) */
export function certificateHTML(ct, info = null) {
  const c = info ? { title: info.course } : S.course(ct.cid);
  const u = info ? { name: info.name } : S.user(ct.uid);
  const ins = info ? (info.insNames || []).map((name) => ({ name })) : (c?.instructors || []).map(S.instructor).filter(Boolean);
  const signers = [
    { name: "Andriy Trofymenko", role: "Dirección de Procesos" },
    { name: "Christian Pollavini", role: "Dirección de Personas" },
  ];
  return `<div class="cert-wrap"><div class="certificate">
    <div class="cert-in">
      <div class="cert-top">
        <div class="cert-brand">${LOGO}<span><b>Amplifia</b><small>Grupo Amplifia · Campus de capacitación</small></span></div>
        <div class="cert-no"><small>Certificado N.º</small><b>${esc(ct.code)}</b></div>
      </div>
      <div class="cert-main">
        <span class="cert-kicker">Certificado de aprobación</span>
        <p class="cert-p">Se certifica que</p>
        <h2 class="cert-name">${esc(u?.name || "—")}</h2>
        <p class="cert-p">aprobó el curso</p>
        <h3 class="cert-course">${esc(c?.title || "Curso")}</h3>
        <p class="cert-detail">${ct.score != null ? `con una calificación de <b>${ct.score}%</b> · ` : ""}carga horaria de <b>${fmtDur(ct.min || 0)}</b> · ${ins.length ? `dictado por ${esc(ins.map((i) => i.name).join(" y "))} · ` : ""}emitido el <b>${fmtDate(ct.at)}</b></p>
      </div>
      <div class="cert-foot">
        ${signers.map((s) => `<div class="cert-sign"><i>${esc(s.name)}</i><span></span><b>${esc(s.name)}</b><small>${esc(s.role)}</small></div>`).join("")}
        <div class="cert-qr"><div class="qr" data-qr="${esc(verifyUrl(ct.code))}"></div><small>Verificá su validez en<br><b>${esc(location.host || "campus.grupoamplifia.com")}</b></small></div>
      </div>
    </div>
  </div></div>`;
}

export function hydrateQR(root) { root.querySelectorAll("[data-qr]").forEach((el) => paintQR(el, el.dataset.qr)); }

/* ------------------------------------------------------------------ listado */
export function certsView() {
  const u = me();
  const cs = S.certsOf(u.id);
  const pending = S.enrollmentsOf(u.id).map((e) => ({ e, c: S.course(e.cid) })).filter((x) => x.c && S.progress(x.e, x.c).status === "exam");
  return {
    title: "Certificados", nav: "certificados",
    html: `
    <section class="page-head"><div><span class="kicker">Certificados</span><h1 class="display">Lo que ya <em>lograste</em>.</h1><p class="lead">Cada certificado tiene un código único y un QR para que cualquier empresa pueda verificarlo en línea.</p></div></section>
    ${pending.length ? `<div class="notice">${icon("quiz")}<div><b>Tenés ${pending.length === 1 ? "un examen pendiente" : pending.length + " exámenes pendientes"}</b><small>${pending.map((x) => esc(x.c.title)).join(" · ")}</small></div><a class="btn sm" href="#/examen/${pending[0].c.slug}">Rendir ahora</a></div>` : ""}
    ${cs.length ? `<div class="cert-grid">${cs.map((ct) => { const c = S.course(ct.cid); return `<article class="cert-card">
        <a href="#/certificado/${ct.code}" class="cert-thumb" aria-label="Ver certificado de ${esc(c?.title || "")}">${certificateHTML(ct)}</a>
        <div class="cert-card-b"><div><b>${esc(c?.title || "")}</b><small>${fmtDate(ct.at)} · ${esc(ct.code)}</small></div>
        <div class="cert-acts"><a class="icon-btn" href="#/certificado/${ct.code}" aria-label="Ver">${icon("eye")}</a><a class="icon-btn" target="_blank" rel="noopener" href="${linkedInUrl(ct, c)}" aria-label="Sumar a LinkedIn">${icon("linkedin")}</a><button class="icon-btn" data-copy="${esc(verifyUrl(ct.code))}" aria-label="Copiar enlace de verificación">${icon("link")}</button></div></div>
      </article>`; }).join("")}</div>`
      : empty("award", "Todavía no tenés certificados", "Completá un curso y aprobá el examen final para obtener tu primer certificado.", `<a class="btn" href="#/mis-cursos">Ir a mis cursos</a>`)}`,
    mount(host) {
      hydrateQR(host);
      host.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-copy]");
        if (b) { try { await navigator.clipboard.writeText(b.dataset.copy); toast("Enlace de verificación copiado"); } catch { toast("No se pudo copiar", "err"); } }
      });
    },
  };
}

/* ------------------------------------------------------------------ vista individual */
export function certView({ code }) {
  const ct = S.cert(code);
  const u = me();
  if (!ct || (ct.uid !== u.id && u.role !== "admin")) { toast("Certificado no encontrado", "err"); go("/certificados", { replace: true }); return null; }
  const c = S.course(ct.cid);
  return {
    title: "Certificado", nav: "certificados",
    html: `
    <nav class="crumbs no-print"><a href="#/certificados">Certificados</a>${icon("right", "xs")}<span>${esc(c?.title || "")}</span></nav>
    <div class="cert-page">
      <div class="cert-stage">${certificateHTML(ct)}</div>
      <aside class="cert-side no-print">
        <div class="panel">
          <span class="kicker">${icon("shield", "sm")} Certificado verificable</span>
          <h1 class="display sm">${esc(c?.title || "")}</h1>
          <p class="muted">Emitido el ${fmtDate(ct.at)}${ct.score != null ? ` · calificación ${ct.score}%` : ""}</p>
          <div class="stack">
            <button class="btn block" data-print>${icon("download", "sm")} Descargar PDF</button>
            <a class="btn ghost block" target="_blank" rel="noopener" href="${linkedInUrl(ct, c)}">${icon("linkedin", "sm")} Sumar a mi perfil de LinkedIn</a>
            <button class="btn ghost block" data-copy>${icon("link", "sm")} Copiar enlace de verificación</button>
            <a class="link small" href="#/verificar/${ct.code}" target="_blank">${icon("ext", "sm")} Ver página pública de verificación</a>
          </div>
          <p class="muted small">Para el PDF, elegí «Guardar como PDF» en la ventana de impresión, orientación horizontal.</p>
        </div>
      </aside>
    </div>`,
    mount(host) {
      hydrateQR(host);
      $("[data-print]", host).addEventListener("click", () => window.print());
      $("[data-copy]", host).addEventListener("click", async () => { try { await navigator.clipboard.writeText(verifyUrl(ct.code)); toast("Enlace copiado"); } catch { toast("No se pudo copiar", "err"); } });
    },
  };
}

/* ------------------------------------------------------------------ verificación pública */
const INS_NAMES = { andriy: "Andriy Trofymenko", christian: "Christian Pollavini" };
export async function verifyView({ code }) {
  let r = { valid: false };
  if (code) { try { r = await S.api.verify(code); } catch { r = { valid: false, error: true }; } }
  const ct = r.valid ? { code: r.code, at: typeof r.issued_at === "number" ? r.issued_at : Date.parse(r.issued_at), score: r.score, min: r.minutes } : null;
  const info = r.valid ? { name: r.name, course: r.course, insNames: (r.instructors || []).map((i) => S.instructor(i)?.name || INS_NAMES[i] || "").filter(Boolean) } : null;
  const c = ct && { title: r.course };
  const u = ct && { name: r.name };
  return {
    title: "Verificar certificado", layout: "bare",
    html: `<div class="verify">
      <header class="verify-top"><a class="brand" href="https://www.grupoamplifia.com">${LOGO}<span class="brand-name">Amplifia</span><span class="brand-tag">Campus</span></a><a class="link small" href="#/ingresar">Ingresar al campus</a></header>
      <main class="verify-main">
        <form class="verify-form" novalidate><label class="field"><span class="field-l">Código del certificado</span><span class="row"><input class="input mono" name="code" value="${esc(code || "")}" placeholder="AMP-2026-XXXX-XXXX" autocapitalize="characters"><button class="btn" type="submit">Verificar</button></span></label></form>
        ${code ? (ct ? `<section class="verify-res is-ok">
            <div class="verify-badge">${icon("shield")}</div>
            <div><span class="kicker">Certificado válido</span><h1 class="display sm">${esc(u?.name || "")}</h1><p>aprobó <b>${esc(c?.title || "")}</b> el ${fmtDate(ct.at)}${ct.score != null ? ` con ${ct.score}%` : ""}. Carga horaria: ${fmtDur(ct.min || 0)}.</p><small class="muted">Emitido por Grupo Amplifia · Código ${esc(ct.code)}</small></div>
          </section><div class="verify-cert">${certificateHTML(ct, info)}</div>`
          : `<section class="verify-res is-bad"><div class="verify-badge">${icon("x")}</div><div><span class="kicker">${r.error ? "Sin conexión" : "No encontrado"}</span><h1 class="display sm">${r.error ? "No pudimos consultar el certificado" : "No existe un certificado válido con ese código"}</h1><p>${r.error ? "Revisá tu conexión e intentá de nuevo." : "Revisá que el código esté bien escrito. Si creés que es un error, escribinos a " + esc(S.setting("supportEmail")) + "."}</p></div></section>`)
        : `<section class="verify-res"><div class="verify-badge">${icon("search")}</div><div><h1 class="display sm">Verificá un certificado</h1><p>Ingresá el código que figura en el certificado o escaneá su código QR.</p></div></section>`}
      </main>
      ${S.MODE === "demo" ? `<p class="verify-note">${icon("info", "sm")} Modo demostración: la verificación solo encuentra certificados emitidos en este navegador. En la versión publicada consulta la base de datos de Amplifia.</p>` : ""}
    </div>`,
    mount(host) {
      hydrateQR(host);
      $(".verify-form", host).addEventListener("submit", (e) => { e.preventDefault(); const v = e.target.code.value.trim().toUpperCase(); if (v) go("/verificar/" + encodeURIComponent(v)); });
    },
  };
}
