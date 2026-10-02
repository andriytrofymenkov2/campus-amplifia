/* Ingreso, registro con código y recuperación de contraseña */
import { icon, LOGO } from "../core/icons.js";
import { esc, $ } from "../core/util.js";
import * as S from "../core/store.js";
import { login, start, logout, passwordIssues, passwordScore } from "../core/auth.js";
import { go } from "../core/router.js";
import { toast, field, resetShell } from "../core/ui.js";
import { DEMO_ACCOUNTS } from "../data/seed.js";

function frame(formHTML) {
  return `<div class="auth">
    <section class="auth-art" aria-hidden="false">
      <video class="auth-video" autoplay muted loop playsinline preload="auto" poster="media/light.jpg" src="${matchMedia("(max-width: 860px)").matches ? "media/light.mp4" : "media/light_full.mp4"}"></video>
      <div class="auth-shade"></div>
      <div class="auth-art-in">
        <a class="brand" href="https://www.grupoamplifia.com" aria-label="Volver a grupoamplifia.com">${LOGO}<span class="brand-name">Amplifia</span><span class="brand-tag">Campus</span></a>
        <div class="auth-hero">
          <span class="kicker">Campus de capacitación</span>
          <h1 class="display">Capacitación que se convierte en <em>resultados</em>.</h1>
          <p>Cursos de procesos, liderazgo, equipos e inteligencia artificial con la metodología de Amplifia. A tu ritmo y desde cualquier dispositivo.</p>
        </div>
        <ul class="auth-facts">
          <li><b>${icon("layers")}</b><span>procesos, personas e IA</span></li>
          <li><b>${icon("live")}</b><span>clases en vivo</span></li>
          <li><b>${icon("shield")}</b><span>certificados verificables</span></li>
        </ul>
      </div>
    </section>
    <section class="auth-panel">
      <div class="auth-panel-in">${formHTML}</div>
      <footer class="auth-foot">
        <a href="https://www.grupoamplifia.com">${icon("back", "sm")} grupoamplifia.com</a>
        <a href="https://wa.me/5491133278023?text=${encodeURIComponent("Hola, necesito ayuda para ingresar al campus de Amplifia.")}" target="_blank" rel="noopener">${icon("chat", "sm")} ¿Necesitás ayuda?</a>
      </footer>
    </section>
  </div>`;
}

const passInput = (name, ac, ph = "") => `<span class="pass"><input class="input" type="password" name="${name}" autocomplete="${ac}" required placeholder="${ph}"><button type="button" class="pass-eye" aria-label="Mostrar contraseña">${icon("eye")}</button></span>`;

function wirePass(root) {
  root.querySelectorAll(".pass-eye").forEach((b) => b.addEventListener("click", () => {
    const i = b.previousElementSibling;
    const show = i.type === "password";
    i.type = show ? "text" : "password";
    b.innerHTML = icon(show ? "eyeoff" : "eye");
    b.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
  }));
}

function showError(form, msg) {
  const box = form.querySelector(".form-err");
  box.innerHTML = msg ? `${icon("alert", "sm")}<span>${esc(msg)}</span>` : "";
  box.hidden = !msg;
}

function busy(btn, on, label) {
  btn.disabled = on;
  btn.classList.toggle("is-busy", on);
  if (label) btn.querySelector("span").textContent = label;
}

/* ------------------------------------------------------------------ ingreso */
export function loginView(_, query) {
  return {
    title: "Ingresar", layout: "bare",
    html: frame(`<form class="auth-form" novalidate>
      <h2>Ingresá al campus</h2>
      <p class="muted">Usá el usuario o email y la contraseña que te dio tu empresa o Amplifia.</p>
      ${field("Usuario o email", `<input class="input" name="ident" autocomplete="username" required placeholder="tu.usuario" autocapitalize="none" spellcheck="false">`)}
      ${field("Contraseña", passInput("pass", "current-password", "••••••••"))}
      <div class="auth-row">
        <label class="check"><input type="checkbox" name="remember"><span></span>Mantener la sesión iniciada</label>
        <a class="link" href="#/recuperar">¿Olvidaste tu contraseña?</a>
      </div>
      <div class="form-err" role="alert" hidden></div>
      <button class="btn block lg" type="submit"><span>Ingresar</span>${icon("arrow")}</button>
      <p class="auth-alt">¿Tu empresa te dio un código de acceso? <a class="link" href="#/registro">Activá tu cuenta</a></p>
      ${S.MODE === "demo" ? `<div class="demo-box">
        <div><b>${icon("sparkle", "sm")} Probá la demo</b><small>Datos de ejemplo guardados en este navegador.</small></div>
        <div class="demo-btns"><button type="button" class="btn ghost sm" data-demo="alumno">${icon("user", "sm")} Alumno</button><button type="button" class="btn ghost sm" data-demo="admin">${icon("settings", "sm")} Administrador</button></div>
      </div>` : ""}
    </form>`),
    mount(host) {
      const form = $(".auth-form", host);
      wirePass(form);
      setTimeout(() => form.ident.focus(), 60);
      const done = (u) => {
        resetShell();
        toast(`¡Hola, ${u.name.split(" ")[0]}!`);
        go(query.next && query.next.startsWith("/") ? query.next : "/inicio", { replace: true });
      };
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        showError(form, "");
        const id = form.ident.value.trim(), pass = form.pass.value;
        if (!id || !pass) return showError(form, "Completá usuario y contraseña.");
        const btn = form.querySelector("button[type=submit]");
        busy(btn, true, "Ingresando…");
        try { done(await login(id, pass, form.remember.checked)); }
        catch (err) { showError(form, err.message); busy(btn, false, "Ingresar"); form.pass.select(); }
      });
      host.querySelectorAll("[data-demo]").forEach((b) => b.addEventListener("click", async () => {
        const a = DEMO_ACCOUNTS[b.dataset.demo];
        form.ident.value = a.user; form.pass.value = a.pass;
        try { done(await login(a.user, a.pass, false)); } catch (err) { showError(form, err.message); }
      }));
    },
  };
}

/* ------------------------------------------------------------------ registro con código */
export function registerView(_, query) {
  return {
    title: "Activar cuenta", layout: "bare",
    html: frame(`<form class="auth-form" novalidate>
      <a class="back-link" href="#/ingresar">${icon("back", "sm")} Volver al ingreso</a>
      <h2>Activá tu cuenta</h2>
      <p class="muted">Si tu empresa contrató capacitaciones con Amplifia, ingresá el código que te compartieron y se te asignarán los cursos automáticamente.</p>
      ${field("Código de acceso", `<input class="input mono" name="code" required placeholder="EMPRESA-2026" value="${esc(query.codigo || "")}" autocapitalize="characters" spellcheck="false">`)}
      <div class="grid2">
        ${field("Nombre y apellido", `<input class="input" name="fullname" autocomplete="name" required>`)}
        ${field("Usuario", `<input class="input" name="user" autocomplete="username" required autocapitalize="none" spellcheck="false" placeholder="nombre.apellido">`)}
      </div>
      ${field("Email", `<input class="input" type="email" name="email" autocomplete="email" required>`)}
      ${field("Contraseña", passInput("pass", "new-password") + `<span class="meter" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`, "Mínimo 8 caracteres, con mayúsculas, minúsculas y números.")}
      ${field("Repetí la contraseña", passInput("pass2", "new-password"))}
      <label class="check"><input type="checkbox" name="terms" required><span></span>Acepto los términos de uso y la política de privacidad del campus.</label>
      <div class="form-err" role="alert" hidden></div>
      <button class="btn block lg" type="submit"><span>Crear mi cuenta</span>${icon("arrow")}</button>
      ${S.MODE === "demo" ? `<p class="auth-alt small">Códigos de prueba: <code>AUSTRAL-2026</code> · <code>ALAMOS-LIDERES</code></p>` : ""}
    </form>`),
    mount(host) {
      const form = $(".auth-form", host);
      wirePass(form);
      const meter = form.querySelector(".meter");
      form.pass.addEventListener("input", () => { meter.dataset.s = form.pass.value ? passwordScore(form.pass.value) : ""; });
      form.fullname.addEventListener("blur", () => {
        if (!form.user.value && form.fullname.value) form.user.value = form.fullname.value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");
      });
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        showError(form, "");
        const v = Object.fromEntries(new FormData(form));
        v.name = v.fullname || "";
        if (!v.code.trim()) return showError(form, "Ingresá el código de acceso de tu empresa.");
        if (!v.name.trim() || !v.user.trim() || !v.email.trim()) return showError(form, "Completá todos los campos.");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) return showError(form, "El email no parece válido.");
        if (!/^[a-z0-9._-]{3,}$/i.test(v.user)) return showError(form, "El usuario debe tener al menos 3 caracteres (letras, números, punto o guion).");
        const issues = passwordIssues(v.pass);
        if (issues.length) return showError(form, "La contraseña necesita " + issues.join(", ") + ".");
        if (v.pass !== v.pass2) return showError(form, "Las contraseñas no coinciden.");
        if (!form.terms.checked) return showError(form, "Tenés que aceptar los términos para continuar.");
        const btn = form.querySelector("button[type=submit]");
        busy(btn, true, "Creando cuenta…");
        try {
          const r = await S.api.register(v);
          if (r.needsConfirm) {
            form.innerHTML = `<div class="form-ok">${icon("mail")}<span><b>¡Listo! Revisá tu email.</b><br>Te enviamos un enlace a <b>${esc(v.email)}</b> para confirmar tu cuenta. Después ingresá con tu usuario y contraseña.</span></div><a class="btn block lg" href="#/ingresar">Ir al ingreso</a>`;
            return;
          }
          start(r.user, false);
          resetShell();
          toast("¡Cuenta creada! Bienvenido al campus.");
          go("/inicio", { replace: true });
        } catch (err) { showError(form, err.message); busy(btn, false, "Crear mi cuenta"); }
      });
    },
  };
}

/* ------------------------------------------------------------------ recuperar */
export function recoverView() {
  return {
    title: "Recuperar contraseña", layout: "bare",
    html: frame(`<form class="auth-form" novalidate>
      <a class="back-link" href="#/ingresar">${icon("back", "sm")} Volver al ingreso</a>
      <h2>Recuperá tu contraseña</h2>
      <p class="muted">Ingresá el email de tu cuenta y te enviamos un enlace para crear una contraseña nueva. El enlace vence en 1 hora.</p>
      ${field("Email", `<input class="input" type="email" name="email" autocomplete="email" required>`)}
      <div class="form-err" role="alert" hidden></div>
      <button class="btn block lg" type="submit"><span>Enviar enlace</span>${icon("mail")}</button>
      <div class="form-ok" hidden></div>
    </form>`),
    mount(host) {
      const form = $(".auth-form", host);
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.value)) return showError(form, "Ingresá un email válido.");
        showError(form, "");
        const btn = form.querySelector("button[type=submit]");
        busy(btn, true, "Enviando…");
        try { await S.api.recover(form.email.value.trim()); } catch (err) { busy(btn, false, "Enviar enlace"); return showError(form, err.message); }
        const ok = form.querySelector(".form-ok");
        /* Mismo mensaje exista o no la cuenta: así no se puede averiguar quién está registrado */
        ok.innerHTML = `${icon("checkc")}<span>Si <b>${esc(form.email.value)}</b> está registrado, en unos minutos vas a recibir el enlace. Revisá también la carpeta de spam.${S.MODE === "demo" ? "<br><small>En el modo demostración no se envían correos.</small>" : ""}</span>`;
        ok.hidden = false;
        form.querySelector("button[type=submit]").disabled = true;
      });
    },
  };
}

/* ------------------------------------------------------------------ nueva contraseña (llega desde el email de recuperación) */
export function newPasswordView() {
  return {
    title: "Nueva contraseña", layout: "bare",
    html: frame(`<form class="auth-form" novalidate>
      <h2>Creá tu nueva contraseña</h2>
      <p class="muted">Elegí una contraseña segura que no uses en otros sitios.</p>
      ${field("Nueva contraseña", passInput("pass", "new-password") + `<span class="meter" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`, "Mínimo 8 caracteres, con mayúsculas, minúsculas y números.")}
      ${field("Repetila", passInput("pass2", "new-password"))}
      <div class="form-err" role="alert" hidden></div>
      <button class="btn block lg" type="submit"><span>Guardar contraseña</span>${icon("key")}</button>
    </form>`),
    mount(host) {
      const form = $(".auth-form", host);
      wirePass(form);
      const meter = form.querySelector(".meter");
      form.pass.addEventListener("input", () => { meter.dataset.s = form.pass.value ? passwordScore(form.pass.value) : ""; });
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const issues = passwordIssues(form.pass.value);
        if (issues.length) return showError(form, "La contraseña necesita " + issues.join(", ") + ".");
        if (form.pass.value !== form.pass2.value) return showError(form, "Las contraseñas no coinciden.");
        const btn = form.querySelector("button[type=submit]");
        busy(btn, true, "Guardando…");
        try {
          await S.api.updatePassword(form.pass.value);
          await logout();
          resetShell();
          toast("Contraseña actualizada. Ingresá con la nueva.");
          go("/ingresar", { replace: true });
        } catch (err) { showError(form, err.message); busy(btn, false, "Guardar contraseña"); }
      });
    },
  };
}
