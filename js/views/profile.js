/* Perfil: datos, meta semanal, contraseña, logros, privacidad */
import { icon } from "../core/icons.js";
import { esc, fmtDate, fmtHours, download, $ } from "../core/util.js";
import * as S from "../core/store.js";
import { me, passwordIssues, passwordScore, logout } from "../core/auth.js";
import { refresh, go } from "../core/router.js";
import { avatar, toast, field, confirmDialog, resetShell, refreshTop } from "../core/ui.js";

export function profileView() {
  const u = me();
  const bs = S.badges(u.id);
  const certs = S.certsOf(u.id).length;
  const es = S.enrollmentsOf(u.id);
  const lessons = es.reduce((s, e) => s + Object.keys(e.done).length, 0);

  return {
    title: "Mi perfil", nav: "perfil",
    html: `
    <section class="profile-head">
      ${avatar(u, "xl")}
      <div><span class="kicker">${u.role === "admin" ? "Administrador" : "Alumno"}${u.company ? ` · ${esc(u.company)}` : ""}</span><h1 class="display md">${esc(u.name)}</h1><p class="muted">${esc(u.email)} · en el campus desde ${fmtDate(u.joined)}</p></div>
    </section>
    <div class="kpis">
      <div class="kpi"><b>${es.length}</b><small>cursos</small></div>
      <div class="kpi"><b>${lessons}</b><small>lecciones completadas</small></div>
      <div class="kpi"><b>${fmtHours(S.minutesTotal(u.id))}</b><small>horas de aprendizaje</small></div>
      <div class="kpi"><b>${certs}</b><small>certificados</small></div>
    </div>

    <div class="profile-grid">
      <section class="panel">
        <h2>Datos personales</h2>
        <form class="form" data-f="me">
          ${field("Nombre y apellido", `<input class="input" name="fullname" value="${esc(u.name)}" required autocomplete="name">`)}
          ${field("Email", `<input class="input" type="email" name="email" value="${esc(u.email)}" required autocomplete="email" ${S.MODE === "supabase" ? "readonly" : ""}>`, S.MODE === "supabase" ? "Para cambiar el email escribinos: lo verificamos por seguridad." : "")}
          <div class="grid2">
            ${field("Usuario", `<input class="input" value="${esc(u.user)}" disabled>`, "Lo asigna Amplifia")}
            ${field("Área", `<input class="input" name="area" value="${esc(u.area || "")}" placeholder="Ej.: Operaciones">`)}
          </div>
          ${u.company ? field("Empresa", `<input class="input" value="${esc(u.company)}" disabled>`) : ""}
          <button class="btn" type="submit">Guardar cambios</button>
        </form>
      </section>

      <section class="panel">
        <h2>Meta semanal</h2>
        <p class="muted">¿Cuánto tiempo querés dedicarle por semana? Te ayudamos a sostener el ritmo.</p>
        <div class="goal-opts" role="radiogroup">${[60, 120, 180, 300].map((m) => `<button type="button" role="radio" aria-checked="${u.goal === m}" class="goal-opt ${u.goal === m ? "on" : ""}" data-goal="${m}"><b>${m / 60 >= 1 ? (m / 60).toString().replace(".", ",") + " h" : m + " min"}</b><small>${m === 60 ? "Casual" : m === 120 ? "Constante" : m === 180 ? "Intensivo" : "Acelerado"}</small></button>`).join("")}</div>
        <h2 class="mt">Contraseña</h2>
        <form class="form" data-f="pass">
          ${field("Contraseña actual", `<input class="input" type="password" name="cur" autocomplete="current-password" required>`)}
          ${field("Nueva contraseña", `<input class="input" type="password" name="next" autocomplete="new-password" required><span class="meter" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`, "Mínimo 8 caracteres, con mayúsculas, minúsculas y números.")}
          ${field("Repetí la nueva contraseña", `<input class="input" type="password" name="next2" autocomplete="new-password" required>`)}
          <button class="btn ghost" type="submit">${icon("key", "sm")} Cambiar contraseña</button>
        </form>
      </section>

      <section class="panel span2">
        <div class="panel-head"><div><span class="kicker">Logros</span><h2>${bs.filter((b) => b.on).length} de ${bs.length} desbloqueados</h2></div></div>
        <div class="badge-list">${bs.map((b) => `<div class="badge-item ${b.on ? "on" : ""}"><span class="badge ${b.on ? "on" : ""}">${icon(b.icon)}</span><div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>${b.on ? icon("check", "sm ok") : icon("lock", "sm")}</div>`).join("")}</div>
      </section>

      <section class="panel span2">
        <h2>Privacidad y sesión</h2>
        <div class="priv">
          <div><b>Descargar mis datos</b><small>Tu perfil, progreso, notas y certificados en un archivo.</small></div><button class="btn ghost sm" data-export>${icon("download", "sm")} Descargar</button>
          <div><b>Cerrar sesión</b><small>En este dispositivo.</small></div><button class="btn ghost sm" data-logout>${icon("logout", "sm")} Salir</button>
          ${S.MODE === "demo" ? `<div><b>Restablecer la demostración</b><small>Vuelve a cargar los datos de ejemplo y borra los cambios hechos en este navegador.</small></div><button class="btn ghost sm danger-t" data-reset>${icon("refresh", "sm")} Restablecer</button>` : ""}
        </div>
      </section>
    </div>`,
    mount(host) {
      const fMe = $('[data-f="me"]', host), fPass = $('[data-f="pass"]', host);
      fMe.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = fMe.fullname.value.trim(), email = fMe.email.value.trim().toLowerCase();
        if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("Revisá el nombre y el email", "err");
        if (S.db.users.some((x) => x.id !== u.id && x.email.toLowerCase() === email)) return toast("Ese email ya está en uso", "err");
        S.updateProfile(u.id, S.MODE === "supabase" ? { name, area: fMe.area.value.trim() } : { name, email, area: fMe.area.value.trim() });
        refreshTop();
        toast("Datos actualizados");
        refresh();
      });
      host.querySelectorAll("[data-goal]").forEach((b) => b.addEventListener("click", () => { S.updateProfile(u.id, { goal: +b.dataset.goal }); toast("Meta actualizada"); refresh(); }));
      const meter = fPass.querySelector(".meter");
      fPass.next.addEventListener("input", () => { meter.dataset.s = fPass.next.value ? passwordScore(fPass.next.value) : ""; });
      fPass.addEventListener("submit", async (e) => {
        e.preventDefault();
        const issues = passwordIssues(fPass.next.value);
        if (issues.length) return toast("La contraseña necesita " + issues.join(", "), "err");
        if (fPass.next.value !== fPass.next2.value) return toast("Las contraseñas nuevas no coinciden", "err");
        try { await S.api.changePassword(u.id, fPass.cur.value, fPass.next.value); fPass.reset(); meter.dataset.s = ""; toast("Contraseña actualizada"); }
        catch (err) { toast(err.message, "err"); }
      });
      $("[data-export]", host).addEventListener("click", () => {
        const { hash, salt, ...pub } = S.user(u.id);
        void hash; void salt;
        const data = { perfil: pub, inscripciones: S.enrollmentsOf(u.id), certificados: S.certsOf(u.id), notas: S.db.notes.filter((n) => n.uid === u.id), actividad: S.activityOf(u.id), exportado: new Date().toISOString() };
        download(`mis-datos-campus-amplifia.json`, JSON.stringify(data, null, 2), "application/json");
      });
      $("[data-logout]", host).addEventListener("click", async () => { await logout(); resetShell(); go("/ingresar"); });
      $("[data-reset]", host)?.addEventListener("click", async () => {
        if (!(await confirmDialog("Se borran todos los cambios hechos en este navegador y vuelven los datos de ejemplo.", { title: "¿Restablecer la demo?", ok: "Restablecer", danger: true }))) return;
        await S.resetDemo();
        await logout(); resetShell();
        toast("Demo restablecida");
        go("/ingresar");
      });
    },
  };
}
