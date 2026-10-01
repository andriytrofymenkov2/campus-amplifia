/* Enrutador por hash (#/ruta) — compatible con GitHub Pages */
import { me, isAdmin } from "./auth.js";

const routes = [];
let cleanup = null;
let renderShell = null;
let lastPath = "";

export function route(pattern, handler, opts = {}) {
  const keys = [];
  const rx = new RegExp("^" + pattern.replace(/\/:(\w+)/g, (_, k) => (keys.push(k), "/([^/]+)")) + "/?$");
  routes.push({ rx, keys, handler, opts });
}

export function setShell(fn) { renderShell = fn; }

export const current = () => parse(location.hash);

function parse(hash) {
  const raw = (hash || "").replace(/^#/, "") || "/";
  const [path, qs] = raw.split("?");
  return { path, query: Object.fromEntries(new URLSearchParams(qs || "")) };
}

export function go(path, { replace = false } = {}) {
  const h = "#" + path;
  if (replace) history.replaceState(null, "", h); else if (location.hash !== h) { location.hash = h; return; }
  render();
}

export function refresh() { render(true); }

export async function render(isRefresh = false) {
  const { path, query } = parse(location.hash);
  let match = null, params = {};
  for (const r of routes) {
    const m = path.match(r.rx);
    if (m) { match = r; r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]))); break; }
  }
  if (!match) return go(me() ? "/inicio" : "/ingresar", { replace: true });
  if (!match.opts.public && !me()) return go("/ingresar?next=" + encodeURIComponent(path), { replace: true });
  if (match.opts.guestOnly && me()) return go("/inicio", { replace: true });
  if (match.opts.admin && !isAdmin()) return go("/inicio", { replace: true });

  const view = await match.handler(params, query);
  if (!view) return;
  if (typeof cleanup === "function") { try { cleanup(); } catch (e) { console.warn(e); } }
  cleanup = null;

  const host = renderShell(view.layout || "app", view.nav || match.opts.nav || "");
  document.title = (view.title ? view.title + " · " : "") + "Campus Amplifia";
  host.innerHTML = view.html;
  if (!isRefresh || path !== lastPath) {
    host.classList.remove("view-in");
    void host.offsetWidth;
    host.classList.add("view-in");
    window.scrollTo(0, 0);
  }
  lastPath = path;
  if (view.mount) cleanup = view.mount(host, params, query) || null;
  const h1 = host.querySelector("h1");
  if (h1 && !isRefresh) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
}

export function start() {
  addEventListener("hashchange", () => render());
  render();
}
