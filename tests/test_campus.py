"""
PRUEBAS AUTOMÁTICAS DEL CAMPUS AMPLIFIA
=======================================
Recorre la plataforma como lo haría un alumno y un administrador, en computadora
y en celular, y verifica que todo funcione: ingreso, seguridad, cursos, videos,
controles, examen, certificados, clases en vivo, panel de administración y la
conexión con Supabase (simulada, sin tocar datos reales).

Uso:   python tests/test_campus.py            (todas)
       python tests/test_campus.py examen     (solo las que contienen "examen")
Requisitos: Python + Playwright (usa el Google Chrome instalado).
"""
import base64
import json
import os
import re
import subprocess
import sys
import time
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

os.environ.setdefault("PYTHONIOENCODING", "utf-8")
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent
PORT = 8761
BASE = f"http://127.0.0.1:{PORT}"
SHOTS = ROOT / "tests" / "capturas"
FILTER = sys.argv[1].lower() if len(sys.argv) > 1 else ""

# Cuentas de prueba del modo demo (definidas en js/data/seed.js)
ALUMNO = ("martina", "campus2026")
ADMIN = ("admin", "amplifia2026")

TESTS = []


def test(fn):
    TESTS.append(fn)
    return fn


class Fail(AssertionError):
    pass


def check(cond, msg):
    if not cond:
        raise Fail(msg)


# --------------------------------------------------------------------------- utilidades
# Las pruebas de la demo usan siempre el modo demostración, aunque js/config.js apunte a Supabase real
DEMO_CONFIG = """export const CONFIG = { mode: "demo", supabaseUrl: "", supabaseAnonKey: "", siteUrl: "https://campus.grupoamplifia.com",
  youtubeChannel: "", supportWhatsApp: "5491133278023", supportEmail: "grupoamplifia@gmail.com" };"""


def new_page(browser, mobile=False, config_override=None, supabase_mock=None):
    if mobile:
        ctx = browser.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
    else:
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    page = ctx.new_page()
    page.errors = []
    page.on("console", lambda m: page.errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: page.errors.append(str(e)))
    cfg = config_override or DEMO_CONFIG
    page.route("**/js/config.js", lambda r: r.fulfill(status=200, content_type="text/javascript", body=cfg))
    if supabase_mock:
        page.route(re.compile(r"https://test-campus\.supabase\.co/.*"), supabase_mock)
    return ctx, page


def goto(page, route):
    page.goto(f"{BASE}/#{route}")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(450)


def login(page, user, pwd, remember=False):
    goto(page, "/ingresar")
    page.fill("input[name=ident]", user)
    page.fill("input[name=pass]", pwd)
    if remember:
        page.check("input[name=remember]", force=True)
    page.click("form.auth-form button[type=submit]")
    page.wait_for_timeout(700)


def logout(page):
    page.evaluate("(async () => { const A = await import('/js/core/auth.js'); await A.logout(); })()")
    goto(page, "/ingresar")


def wait_js(page, expr, timeout=15):
    """Espera a que una expresión JS sea verdadera (sin eval: compatible con la política CSP del campus)."""
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate(expr):
            return True
        page.wait_for_timeout(200)
    raise Fail(f"no se cumplió a tiempo: {expr}")


def text(page, sel):
    el = page.query_selector(sel)
    return el.inner_text().strip() if el else ""


def no_errors(page, where=""):
    errs = [e for e in page.errors if "favicon" not in e]
    check(not errs, f"errores en la consola {where}: {errs[:3]}")


def store(page, expr):
    """Evalúa una expresión con acceso al store (S) del campus."""
    return page.evaluate(f"(async () => {{ const S = await import('/js/core/store.js'); return {expr}; }})()")


def shot(page, name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=False)


# =========================================================================== INGRESO Y SEGURIDAD
@test
def ingreso_pagina_carga_sin_errores(browser):
    ctx, page = new_page(browser)
    goto(page, "/ingresar")
    check("Ingresá al campus" in page.content(), "no aparece el formulario de ingreso")
    check(page.query_selector("meta[http-equiv=Content-Security-Policy]") is not None, "falta la política de seguridad (CSP)")
    no_errors(page, "en el ingreso")
    shot(page, "01-ingreso-escritorio")
    ctx.close()


@test
def ingreso_contrasena_incorrecta_mensaje_generico(browser):
    ctx, page = new_page(browser)
    login(page, "martina", "otra-cosa")
    check("Usuario o contraseña incorrectos" in text(page, ".form-err"), "no muestra el error genérico")
    login(page, "usuario-que-no-existe", "x")
    check("Usuario o contraseña incorrectos" in text(page, ".form-err"), "con un usuario inexistente el mensaje debe ser el mismo (no revelar cuentas)")
    ctx.close()


@test
def ingreso_bloqueo_tras_5_intentos(browser):
    ctx, page = new_page(browser)
    for _ in range(5):
        login(page, "martina", "mala")
    login(page, *ALUMNO)
    check("Demasiados intentos" in text(page, ".form-err"), "después de 5 intentos fallidos debería bloquear temporalmente")
    ctx.close()


@test
def ingreso_con_usuario_y_con_email(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    check("#/inicio" in page.url, f"no entró con el usuario (url {page.url})")
    logout(page)
    login(page, "martina@demo.grupoamplifia.com", ALUMNO[1])
    check("#/inicio" in page.url, "no entró con el email")
    no_errors(page)
    ctx.close()


@test
def rutas_protegidas_redirigen_al_ingreso(browser):
    ctx, page = new_page(browser)
    goto(page, "/curso/lean-en-la-practica")
    check("#/ingresar" in page.url and "next=" in page.url, f"sin sesión debería ir al ingreso (url {page.url})")
    page.fill("input[name=ident]", ALUMNO[0]); page.fill("input[name=pass]", ALUMNO[1])
    page.click("form.auth-form button[type=submit]"); page.wait_for_timeout(700)
    check("#/curso/lean-en-la-practica" in page.url, "después de ingresar debería volver a la página pedida")
    ctx.close()


@test
def alumno_no_puede_entrar_al_panel(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/admin/alumnos")
    check("#/inicio" in page.url, "un alumno no debe poder ver el panel de administración")
    check(page.query_selector("[data-nav=admin]") is None, "el menú de administración no debe aparecerle al alumno")
    ctx.close()


@test
def sesion_sin_recordar_y_cierre(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO, remember=False)
    in_session = page.evaluate("!!sessionStorage.getItem('amp_campus_session') && !localStorage.getItem('amp_campus_session')")
    check(in_session, "sin «mantener sesión» la sesión debe vivir solo en la pestaña")
    logout(page)
    goto(page, "/inicio")
    check("#/ingresar" in page.url, "después de cerrar sesión no debería poder entrar")
    ctx.close()


@test
def contenido_de_usuario_no_ejecuta_codigo_xss(browser):
    ctx, page = new_page(browser)
    dialogs = []
    page.on("dialog", lambda d: (dialogs.append(d.message), d.dismiss()))
    login(page, *ALUMNO)
    goto(page, "/aprender/lean-en-la-practica/lean-1-1")
    page.click("[data-tab=qa]")
    payload = '<img src=x onerror="alert(1)"> <script>alert(2)</script> pregunta'
    page.fill(".qa-form textarea", payload)
    page.click(".qa-form button[type=submit]")
    page.wait_for_timeout(500)
    check(not dialogs, "se ejecutó código inyectado")
    check(page.query_selector(".threads img[src=x]") is None, "el HTML del usuario no se escapó")
    check("<img src=x" in text(page, ".threads"), "el texto debería verse literal")
    ctx.close()


@test
def politica_csp_bloquea_scripts_inyectados(browser):
    ctx, page = new_page(browser)
    goto(page, "/ingresar")
    page.evaluate("""() => { const s = document.createElement('script'); s.textContent = 'window.__inyectado = true'; document.body.appendChild(s); }""")
    page.wait_for_timeout(200)
    check(page.evaluate("window.__inyectado") is None, "la política de seguridad debería bloquear scripts en línea")
    ctx.close()


# =========================================================================== REGISTRO CON CÓDIGO
@test
def registro_valida_codigo_y_contrasena(browser):
    ctx, page = new_page(browser)
    goto(page, "/registro")
    page.fill("input[name=code]", "CODIGO-FALSO")
    page.fill("input[name=fullname]", "Ana Prueba"); page.fill("input[name=user]", "ana.prueba")
    page.fill("input[name=email]", "ana@prueba.com"); page.fill("input[name=pass]", "debil"); page.fill("input[name=pass2]", "debil")
    page.check("input[name=terms]", force=True)
    page.click("form.auth-form button[type=submit]"); page.wait_for_timeout(300)
    check("contraseña necesita" in text(page, ".form-err"), "debería rechazar una contraseña débil")
    page.fill("input[name=pass]", "Segura2026"); page.fill("input[name=pass2]", "Segura2026")
    page.click("form.auth-form button[type=submit]"); page.wait_for_timeout(500)
    check("no es válido" in text(page, ".form-err"), "debería rechazar un código inexistente")
    ctx.close()


@test
def registro_con_codigo_asigna_cursos(browser):
    ctx, page = new_page(browser)
    goto(page, "/registro?codigo=AUSTRAL-2026")
    check(page.input_value("input[name=code]") == "AUSTRAL-2026", "el enlace con código debería completarlo solo")
    page.fill("input[name=fullname]", "Ana Prueba"); page.fill("input[name=user]", "ana.prueba")
    page.fill("input[name=email]", "ana@prueba.com"); page.fill("input[name=pass]", "Segura2026"); page.fill("input[name=pass2]", "Segura2026")
    page.check("input[name=terms]", force=True)
    page.click("form.auth-form button[type=submit]"); page.wait_for_timeout(900)
    check("#/inicio" in page.url, f"no entró después de registrarse (url {page.url})")
    goto(page, "/mis-cursos")
    body = text(page, ".mlist")
    check("Lean en la práctica" in body and "5S" in body, "el código debería asignar sus cursos")
    uses = store(page, "S.db.codes.find(c => c.code === 'AUSTRAL-2026').uses")
    check(uses == 7, f"el código debería sumar un uso (tiene {uses})")
    no_errors(page)
    ctx.close()


# =========================================================================== CATÁLOGO Y CURSO
@test
def catalogo_busqueda_y_filtros(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/catalogo")
    total = len(page.query_selector_all("[data-grid] .ccard"))
    check(total == 12, f"el catálogo debería mostrar 12 cursos (muestra {total})")
    page.fill(".search-box input", "kaizen"); page.wait_for_timeout(400)
    check(len(page.query_selector_all("[data-grid] .ccard")) == 1, "la búsqueda «kaizen» debería dar 1 curso")
    page.fill(".search-box input", ""); page.wait_for_timeout(300)
    page.click(".chip-btn[data-cat=liderazgo]"); page.wait_for_timeout(300)
    check(len(page.query_selector_all("[data-grid] .ccard")) == 2, "el frente Liderazgo debería tener 2 cursos")
    page.select_option("select[name=level]", "Avanzado"); page.wait_for_timeout(300)
    check("No encontramos cursos" in page.content(), "Liderazgo + Avanzado no tiene cursos: debería avisarlo")
    no_errors(page)
    shot(page, "02-catalogo")
    ctx.close()


@test
def inscripcion_y_leccion_completada_persiste(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/curso/indicadores-y-tableros")
    page.click("[data-enroll]"); page.wait_for_timeout(700)
    check("#/aprender/indicadores-y-tableros/" in page.url, "inscribirse debería abrir la primera lección")
    page.click("[data-done]"); page.wait_for_timeout(300)
    check("Completada" in text(page, "[data-done]"), "la lección debería quedar completada")
    pct = text(page, "[data-prog] b")
    page.reload(); page.wait_for_timeout(700)
    check(text(page, "[data-prog] b") == pct and pct != "0%", f"el avance debería persistir ({pct})")
    no_errors(page)
    ctx.close()


@test
def empezar_desde_mis_cursos_pasa_primero_por_la_pagina_del_curso(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/curso/experiencia-del-cliente")
    page.click("[data-enroll]"); page.wait_for_timeout(600)
    goto(page, "/mis-cursos")
    row = page.locator(".mrow", has_text="Experiencia del cliente")
    check("Empezar" in row.inner_text(), "el curso nuevo debería mostrar «Empezar»")
    row.locator(".mrow-cta a").click(); page.wait_for_timeout(500)
    check("#/curso/experiencia-del-cliente" in page.url, f"«Empezar» debería abrir la página del curso (url {page.url})")
    check("Lo que vas a aprender" in page.content(), "debería verse la descripción del curso")
    page.click(".course-side .buy-in > a.btn"); page.wait_for_timeout(500)
    check("#/aprender/experiencia-del-cliente/" in page.url, "el botón Empezar de la página del curso debería abrir el programa")
    # Un curso ya empezado sigue entrando directo a la lección donde quedó
    goto(page, "/mis-cursos")
    row = page.locator(".mrow", has_text="Liderazgo aumentado")
    check("Continuar" in row.inner_text(), "un curso en marcha debería decir «Continuar»")
    row.locator(".mrow-cta a").click(); page.wait_for_timeout(500)
    check("#/aprender/liderazgo-aumentado/" in page.url, "«Continuar» debería abrir la lección donde quedó")
    ctx.close()


@test
def video_se_completa_solo_al_verlo(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/aprender/lean-en-la-practica/lean-3-1")
    page.evaluate("""async () => { const v = document.querySelector('.vp video'); v.muted = true; v.playbackRate = 4; await v.play(); }""")
    wait_js(page, "document.querySelector('[data-done]').textContent.includes('Completada')", 15)
    no_errors(page)
    ctx.close()


@test
def adelantar_el_video_no_completa_la_leccion(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/aprender/lean-en-la-practica/lean-3-2")
    page.evaluate("""async () => { const v = document.querySelector('.vp video'); v.muted = true; await new Promise(r => v.readyState >= 1 ? r() : v.addEventListener('loadedmetadata', r, { once: true })); v.currentTime = v.duration - 1; await v.play(); }""")
    wait_js(page, "!document.querySelector('.vp-end').hidden", 8)
    check("Marcar como completada" in text(page, "[data-done]"), "saltar al final no debería contar como vista")
    check("Llegaste al final" in text(page, ".vp-end"), "debería avisar que llegó al final sin completar")
    ctx.close()


@test
def control_de_modulo_corrige(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/aprender/layout-de-planta-slp/layout-2-4")
    if "#/curso/" in page.url:  # no inscripta: se inscribe primero
        page.click("[data-enroll]"); page.wait_for_timeout(500)
        goto(page, "/aprender/layout-de-planta-slp/layout-2-4")
    for i in range(3):
        page.check(f"input[name=q{i}][value='1']", force=True)
    page.click(".mquiz button[type=submit]"); page.wait_for_timeout(300)
    check("0%" in text(page, "[data-qres]"), "todas mal debería dar 0%")
    page.click(".mquiz button"); page.wait_for_timeout(300)
    for i in range(3):
        page.check(f"input[name=q{i}][value='0']", force=True)
    page.click(".mquiz button[type=submit]"); page.wait_for_timeout(400)
    check("100%" in text(page, "[data-qres]"), "todas bien debería dar 100%")
    check(store(page, "!!S.enrollment('u-martina','c-layout').done['layout-2-4']"), "el control aprobado debería completar la lección")
    ctx.close()


@test
def notas_y_materiales(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/aprender/lean-en-la-practica/lean-1-3")
    page.click("[data-tab=notes]")
    page.fill(".note-form textarea", "Revisar los traslados del depósito")
    page.click(".note-form button[type=submit]"); page.wait_for_timeout(300)
    check("Revisar los traslados" in text(page, "[data-notes]"), "la nota no aparece")
    page.click("[data-tab=res]")
    with page.expect_download() as d:
        page.click("[data-res='0']")
    body = Path(d.value.path()).read_text(encoding="utf-8-sig")
    check("TIMWOODS" in body, "la planilla descargada no tiene el contenido esperado")
    ctx.close()


@test
def indice_del_aula_en_celular_y_escritorio(browser):
    ctx, page = new_page(browser, mobile=True)
    login(page, *ALUMNO)
    goto(page, "/aprender/lean-en-la-practica/lean-1-3")
    check(not page.is_visible(".pl-side .ol-l.is-cur") or page.evaluate("getComputedStyle(document.querySelector('.pl-drawer')).visibility") == "hidden", "en celular el índice debe arrancar cerrado")
    page.click("[data-side]"); page.wait_for_timeout(500)
    check(page.is_visible(".pl-side .ol-l.is-cur"), "al tocar «Contenido» debería abrirse el índice")
    page.click(".pl-side a[href$='lean-1-4']"); page.wait_for_timeout(600)
    check(page.url.endswith("lean-1-4"), "tocar una lección del índice debería abrirla")
    ctx.close()
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/aprender/lean-en-la-practica/lean-1-3")
    check(page.is_visible(".pl-side .ol-l.is-cur"), "en computadora el índice debe verse al costado")
    ctx.close()


# =========================================================================== EXAMEN Y CERTIFICADO
@test
def examen_bloqueado_hasta_completar_lecciones(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/examen/lean-en-la-practica")
    check("todavía no está habilitado" in page.content(), "el examen de un curso incompleto debe estar bloqueado")
    ctx.close()


def answer_exam(page, course_slug, correct=True):
    data = store(page, f"(() => {{ const c = S.course('{course_slug}'); return c.exam.qs.map(q => ({{q: q.q, o: q.o, a: q.a}})); }})()")
    n = len(data)
    for k in range(n):
        qt = text(page, ".ex-text")
        q = next(x for x in data if x["q"] == qt)
        want = q["o"][q["a"]] if correct else q["o"][(q["a"] + 1) % len(q["o"])]
        for b in page.query_selector_all(".ex-opts .opt"):
            if b.inner_text().strip().endswith(want):
                b.click()
                break
        page.click("[data-next]")
        page.wait_for_timeout(120)
    page.click("[data-submit]")
    page.wait_for_timeout(900)


@test
def examen_desaprobado_no_revela_respuestas_y_aprobado_emite_certificado(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/examen/kaizen-con-tu-equipo")
    page.click("[data-start]"); page.wait_for_timeout(500)
    answer_exam(page, "kaizen-con-tu-equipo", correct=False)
    check("no alcanzó" in text(page, ".ex-result h1"), "con todo mal debería desaprobar")
    check(page.query_selector(".rv-c") is None, "al desaprobar con intentos disponibles NO debe mostrar las respuestas correctas")
    check("2 intentos" in text(page, ".ex-result .lead"), "debería quedar con 2 intentos")
    page.click("[data-again]"); page.wait_for_timeout(500)
    page.click("[data-start]"); page.wait_for_timeout(500)
    answer_exam(page, "kaizen-con-tu-equipo", correct=True)
    check("Aprobaste" in text(page, ".ex-result h1"), "con todo bien debería aprobar")
    href = page.get_attribute(".ex-result a[href^='#/certificado/']", "href")
    code = href.split("/")[-1]
    check(re.match(r"^AMP-\d{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$", code), f"código de certificado con formato inesperado: {code}")
    shot(page, "05-examen-aprobado")
    goto(page, f"/certificado/{code}")
    page.wait_for_selector(".cert-qr svg", timeout=8000)
    check("Martina Sosa" in text(page, ".cert-name"), "el certificado no muestra el nombre")
    shot(page, "06-certificado")
    # La versión para imprimir/PDF oculta todo menos el certificado
    page.emulate_media(media="print")
    vis = page.evaluate("[getComputedStyle(document.querySelector('.side')).display, getComputedStyle(document.querySelector('.certificate')).visibility]")
    check(vis == ["none", "visible"], f"la vista de impresión no aísla el certificado: {vis}")
    page.emulate_media(media="screen")
    # Verificación pública (sin sesión)
    logout(page)
    goto(page, f"/verificar/{code}")
    check("Certificado válido" in page.content() and "Martina Sosa" in page.content(), "la verificación pública no reconoce el certificado")
    goto(page, "/verificar/AMP-2026-XXXX-XXXX")
    check("No existe un certificado" in page.content(), "un código falso debería dar «no existe»")
    no_errors(page)
    ctx.close()


@test
def examen_se_retoma_al_recargar(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/examen/kaizen-con-tu-equipo")
    page.click("[data-start]"); page.wait_for_timeout(500)
    page.click(".ex-opts .opt >> nth=0"); page.click("[data-next]"); page.wait_for_timeout(150)
    first_q = text(page, ".ex-text")
    page.reload(); page.wait_for_timeout(900)
    check(page.query_selector(".ex-q") is not None, "al recargar debería retomar el examen en curso")
    check(text(page, ".ex-text") == first_q, "debería volver a la misma pregunta")
    check(len(page.query_selector_all(".ex-dots .is-ans")) == 1, "debería conservar la respuesta dada")
    ctx.close()


# =========================================================================== EN VIVO
@test
def clase_en_vivo_anotarse_preguntar_votar_y_calendario(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    goto(page, "/vivo/live-2")
    check(page.query_selector(".room-wait .countdown") is not None, "antes de empezar debería mostrar la cuenta regresiva")
    page.click("[data-go]"); page.wait_for_timeout(300)
    check("Anotado" in text(page, "[data-go]"), "no quedó anotada")
    page.fill("[data-q] textarea", "¿Cómo priorizo los desperdicios?")
    page.click("[data-q] button[type=submit]"); page.wait_for_timeout(300)
    check("priorizo" in text(page, "[data-qs]") and text(page, "[data-qs] .vote b") == "1", "la pregunta debería aparecer con su voto")
    page.click("[data-vote]"); page.wait_for_timeout(300)
    check(text(page, "[data-qs] .vote b") == "0", "volver a tocar debería quitar el voto")
    with page.expect_download() as d:
        page.click("[data-ics]")
    ics = Path(d.value.path()).read_text(encoding="utf-8")
    check("BEGIN:VEVENT" in ics and "#/vivo/live-2" in ics, "el archivo de calendario no es válido")
    shot(page, "07-sala-en-vivo")
    no_errors(page)
    ctx.close()


@test
def transmision_youtube_se_muestra_embebida(browser):
    ctx, page = new_page(browser)
    page.route(re.compile(r"https://www\.youtube(-nocookie)?\.com/.*"), lambda r: r.fulfill(status=200, content_type="text/html", body="<html><body>YouTube simulado</body></html>"))
    login(page, *ADMIN)
    store(page, "(() => { const s = S.db.live.find(x => x.id === 'live-2'); S.admin.saveLive({ ...s, at: Date.now() - 5 * 60000, link: 'https://www.youtube.com/live/AbCdEfGhIjK' }); return true; })()")
    goto(page, "/vivo/live-2")
    src = page.get_attribute(".room-video iframe", "src") or ""
    check("youtube-nocookie.com/embed/AbCdEfGhIjK" in src, f"la transmisión debería verse dentro del campus (src {src})")
    chat = page.get_attribute(".room-chat iframe", "src") or ""
    check("live_chat?v=AbCdEfGhIjK" in chat, "debería mostrar el chat en vivo")
    check(page.query_selector("a[href='https://www.youtube.com/watch?v=AbCdEfGhIjK']") is not None, "falta el botón «Abrir en YouTube»")
    ctx.close()


# =========================================================================== ADMINISTRACIÓN
@test
def admin_crea_curso_y_el_alumno_lo_ve(browser):
    ctx, page = new_page(browser)
    login(page, *ADMIN)
    goto(page, "/admin/cursos/nuevo")
    page.fill("[data-k=title]", "Curso de prueba automatizada")
    page.click("[data-etab=examen]"); page.wait_for_timeout(200)
    page.click("[data-qadd]"); page.wait_for_timeout(200)
    page.fill(".qed textarea", "¿Dos más dos?")
    page.fill("[data-qf=o0]", "Cuatro"); page.fill("[data-qf=o1]", "Cinco")
    page.click("[data-etab=publicacion]"); page.wait_for_timeout(200)
    page.check("input[name=status][value=pub]", force=True)
    page.click(".head-acts [data-save]"); page.wait_for_timeout(600)
    check("#/admin/cursos/c-" in page.url, f"al guardar debería quedar en la edición del curso (url {page.url})")
    exam = store(page, "S.db.courses.find(c => c.title === 'Curso de prueba automatizada').exam")
    check(exam and exam["qs"][0]["o"] == ["Cuatro", "Cinco"], f"el examen no se guardó bien: {exam}")
    logout(page)
    login(page, *ALUMNO)
    goto(page, "/catalogo")
    page.fill(".search-box input", "prueba automatizada"); page.wait_for_timeout(400)
    check(len(page.query_selector_all("[data-grid] .ccard")) == 1, "el curso publicado debería aparecer en el catálogo")
    no_errors(page)
    ctx.close()


@test
def admin_crea_alumno_y_puede_ingresar(browser):
    ctx, page = new_page(browser)
    login(page, *ADMIN)
    goto(page, "/admin/alumnos")
    page.click("[data-new]"); page.wait_for_timeout(300)
    page.fill("[data-uf] input[name=fullname]", "Pedro Prueba")
    page.fill("[data-uf] input[name=email]", "pedro@prueba.com")
    page.fill("[data-uf] input[name=user]", "pedro.prueba")
    page.check(f"[data-uf] input[value='c-ia']", force=True)
    page.click(".modal [data-ok]"); page.wait_for_timeout(600)
    temp = text(page, ".modal tbody tr td:nth-child(3) code")
    check(len(temp) >= 8, "debería mostrar la contraseña temporal")
    page.keyboard.press("Escape"); page.wait_for_timeout(300)
    logout(page)
    login(page, "pedro.prueba", temp)
    check("#/inicio" in page.url, "el alumno creado no pudo ingresar")
    goto(page, "/mis-cursos")
    check("Inteligencia artificial" in text(page, ".mlist"), "el curso asignado no aparece")
    ctx.close()


@test
def admin_anula_certificado_y_deja_de_verificarse(browser):
    ctx, page = new_page(browser)
    login(page, *ADMIN)
    code = store(page, "S.db.certs.find(c => c.uid === 'u-martina').code")
    goto(page, "/admin/alumnos/u-martina")
    page.click(f"[data-revoke='{code}']"); page.wait_for_timeout(300)
    page.click(".modal [data-yes]"); page.wait_for_timeout(500)
    logout(page)
    goto(page, f"/verificar/{code}")
    check("No existe un certificado" in page.content(), "un certificado anulado no debe verificarse")
    ctx.close()


@test
def admin_exporta_reporte_csv(browser):
    ctx, page = new_page(browser)
    login(page, *ADMIN)
    goto(page, "/admin/reportes")
    with page.expect_download() as d:
        page.click("[data-csv=detail]")
    body = Path(d.value.path()).read_text(encoding="utf-8-sig")
    check(body.startswith("Alumno;Email;Empresa") and body.count("\n") > 10, "el CSV de progreso no tiene el formato esperado")
    shot(page, "08-reportes")
    no_errors(page)
    ctx.close()


@test
def admin_ajustes_canal_de_youtube(browser):
    ctx, page = new_page(browser)
    login(page, *ADMIN)
    goto(page, "/admin/ajustes")
    page.fill("input[name=youtubeChannel]", "https://www.youtube.com/@grupoamplifia")
    page.click("[data-f] button[type=submit]"); page.wait_for_timeout(500)
    check(page.query_selector(".side a[href='https://www.youtube.com/@grupoamplifia']") is not None, "el canal de YouTube debería aparecer en el menú")
    page.fill("input[name=youtubeChannel]", "https://otro-sitio.com/canal")
    page.click("[data-f] button[type=submit]"); page.wait_for_timeout(300)
    check("youtube.com" in text(page, ".toast"), "debería rechazar un enlace que no es de YouTube")
    ctx.close()


# =========================================================================== CELULAR Y RECORRIDO GENERAL
ROUTES_ALUMNO = ["/inicio", "/catalogo", "/rutas", "/mis-cursos", "/mis-cursos?tab=completados", "/curso/lean-en-la-practica", "/curso/six-sigma-yellow-belt",
                 "/aprender/lean-en-la-practica/lean-1-3", "/aprender/lean-en-la-practica/lean-1-4", "/aprender/lean-en-la-practica/lean-2-3",
                 "/examen/kaizen-con-tu-equipo", "/agenda", "/vivo/live-2", "/vivo/live-1", "/certificados", "/perfil"]
ROUTES_ADMIN = ["/admin", "/admin/cursos", "/admin/cursos/c-lean", "/admin/alumnos", "/admin/alumnos/u-martina", "/admin/agenda", "/admin/reportes", "/admin/ajustes"]


# Elementos visibles que se salen del ancho de la pantalla (excepto carruseles con scroll propio y paneles ocultos)
CUT_JS = """(W) => { const out = [];
  document.querySelectorAll('.view *').forEach(el => {
    if (el.closest('.chips, .tabs, .table-wrap, .pl-side, .pop, .toast, .modal, .hm, .countdown')) return;
    const r = el.getBoundingClientRect();
    if (r.width && r.height && (r.right > W + 1 || r.left < -1) && getComputedStyle(el).visibility !== 'hidden') out.push((el.className && el.className.baseVal === undefined ? el.className : el.tagName) + '@' + Math.round(r.right));
  });
  return out; }"""


@test
def celular_sin_desbordes_horizontales(browser):
    ctx, page = new_page(browser, mobile=True)
    login(page, *ALUMNO)
    bad = []
    W = page.viewport_size["width"]

    def inspect(r):
        # En modo celular el navegador agranda la ventana si algo no entra: se compara contra 375 px fijos
        w = page.evaluate("[document.documentElement.scrollWidth, innerWidth, scrollX]")
        if w[0] > W + 1 or w[1] != W or w[2] != 0:
            bad.append((r, w))
        cut = page.evaluate(CUT_JS, W)
        if cut:
            bad.append((r, "cortado: " + ", ".join(cut[:3])))

    for r in ROUTES_ALUMNO:
        goto(page, r)
        inspect(r)
    shot(page, "09-perfil-celular")
    goto(page, "/inicio"); shot(page, "03-inicio-celular")
    goto(page, "/aprender/liderazgo-aumentado/liderazgo-2-3"); shot(page, "04-aula-celular")
    logout(page)
    login(page, *ADMIN)
    for r in ROUTES_ADMIN:
        goto(page, r)
        inspect(r)
    check(not bad, f"páginas con desborde horizontal en celular: {bad}")
    no_errors(page, "en celular")
    ctx.close()


@test
def tablet_y_celular_horizontal_sin_desbordes(browser):
    bad = []
    for vw, vh in [(768, 1024), (812, 375), (1024, 768)]:
        ctx = browser.new_context(viewport={"width": vw, "height": vh}, is_mobile=vw < 1000, has_touch=True)
        page = ctx.new_page()
        page.errors = []
        page.route("**/js/config.js", lambda r: r.fulfill(status=200, content_type="text/javascript", body=DEMO_CONFIG))
        login(page, *ALUMNO)
        for r in ["/inicio", "/catalogo", "/curso/lean-en-la-practica", "/aprender/lean-en-la-practica/lean-1-3", "/examen/kaizen-con-tu-equipo", "/agenda", "/vivo/live-2", "/certificados"]:
            goto(page, r)
            w = page.evaluate("[document.documentElement.scrollWidth, innerWidth, scrollX]")
            if w[0] > vw + 1 or w[1] != vw or w[2] != 0:
                bad.append((f"{vw}x{vh}", r, w))
            cut = page.evaluate(CUT_JS, vw)
            if cut:
                bad.append((f"{vw}x{vh}", r, "cortado: " + ", ".join(cut[:3])))
        ctx.close()
    check(not bad, f"desbordes en tablet / horizontal: {bad}")


@test
def recorrido_completo_sin_errores(browser):
    ctx, page = new_page(browser)
    login(page, *ALUMNO)
    for r in ROUTES_ALUMNO:
        goto(page, r)
        check(page.query_selector("h1") is not None, f"{r} no tiene título")
    shot(page, "10-perfil-escritorio")
    goto(page, "/inicio"); page.wait_for_timeout(600); shot(page, "03-inicio-escritorio")
    logout(page)
    login(page, *ADMIN)
    for r in ROUTES_ADMIN:
        goto(page, r)
        check(page.query_selector("h1") is not None, f"{r} no tiene título")
    goto(page, "/admin"); page.wait_for_timeout(600); shot(page, "11-panel-admin")
    no_errors(page, "en el recorrido")
    ctx.close()


# =========================================================================== SUPABASE (SIMULADO)
SUPA_CONFIG = """export const CONFIG = { mode: "supabase", supabaseUrl: "https://test-campus.supabase.co", supabaseAnonKey: "anon-de-prueba",
  siteUrl: "http://127.0.0.1:%d", youtubeChannel: "", supportWhatsApp: "5491133278023", supportEmail: "grupoamplifia@gmail.com" };""" % PORT

UID = "11111111-2222-3333-4444-555555555555"


def b64(d):
    return base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")


def fake_session():
    now = int(time.time())
    jwt = b64({"alg": "HS256", "typ": "JWT"}) + "." + b64({"sub": UID, "exp": now + 3600, "role": "authenticated", "email": "ana@test.com", "aud": "authenticated"}) + ".firma"
    user = {"id": UID, "aud": "authenticated", "role": "authenticated", "email": "ana@test.com", "app_metadata": {}, "user_metadata": {}, "created_at": "2026-01-01T00:00:00Z"}
    return {"access_token": jwt, "token_type": "bearer", "expires_in": 3600, "expires_at": now + 3600, "refresh_token": "refresh-de-prueba", "user": user}


class SupaMock:
    """Simula la API de Supabase (Auth + PostgREST + RPC) y registra lo que el campus le envía."""

    def __init__(self):
        self.calls = []
        self.profile = {"id": UID, "username": "ana", "full_name": "Ana Supabase", "email": "ana@test.com", "role": "alumno", "company": "Empresa Test", "area": "",
                        "goal": 120, "saved": [], "active": True, "joined_at": "2026-09-01T00:00:00Z", "last_seen": None}
        self.course = {"id": "c-test", "slug": "curso-test", "title": "Curso Test Supabase", "published": True, "soon": False, "featured": True, "is_new": False, "sort": 0,
                       "updated_at": "2026-09-20T00:00:00Z", "exam_config": {"pass": 70, "minutes": 10, "attempts": 3, "count": 2},
                       "data": {"subtitle": "Prueba", "cat": "procesos", "level": "Inicial", "instructors": ["andriy"], "cover": None, "desc": "Curso de prueba", "outcomes": ["Aprender"],
                                "forWho": "Todos", "req": "Nada", "modules": [{"id": "test-m1", "t": "Módulo", "lessons": [
                                    {"id": "test-1-1", "t": "Lección uno", "type": "lectura", "min": 5, "body": ["Hola"], "res": []},
                                    {"id": "test-1-2", "t": "Lección dos", "type": "lectura", "min": 5, "body": ["Chau"], "res": []}]}]}}

    def __call__(self, route):
        req = route.request
        url = req.url
        method = req.method
        body = req.post_data or ""
        self.calls.append((method, url, body))
        path = url.split(".supabase.co", 1)[1]
        js = lambda data, status=200: route.fulfill(status=status, content_type="application/json", body=json.dumps(data), headers={"access-control-allow-origin": "*"})
        if method == "OPTIONS":
            return route.fulfill(status=200, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"})
        if path.startswith("/auth/v1/token"):
            pw = json.loads(body or "{}").get("password")
            return js(fake_session()) if pw == "Clave2026" else js({"error": "invalid_grant", "error_description": "Invalid login credentials", "msg": "Invalid login credentials", "code": 400}, 400)
        if path.startswith("/auth/v1/logout"):
            return route.fulfill(status=204, headers={"access-control-allow-origin": "*"})
        if path.startswith("/auth/v1/user"):
            return js(fake_session()["user"])
        if path.startswith("/rest/v1/rpc/login_email"):
            return js("ana@test.com" if json.loads(body).get("p_pass") == "Clave2026" else None)
        if path.startswith("/rest/v1/rpc/verify_certificate"):
            code = json.loads(body).get("p_code", "")
            return js({"valid": True, "code": code, "name": "Ana Supabase", "course": "Curso Test Supabase", "instructors": ["andriy"], "issued_at": "2026-09-30T12:00:00Z", "score": 90, "minutes": 60} if code == "AMP-2026-TEST-OK22" else {"valid": False})
        if path.startswith("/rest/v1/rpc/"):
            return js(None)
        accept = req.headers.get("accept", "")
        single = "vnd.pgrst.object" in accept
        if path.startswith("/rest/v1/profiles") and method == "GET":
            return js(self.profile if single else [self.profile])
        if path.startswith("/rest/v1/people"):
            return js([{"id": UID, "full_name": "Ana Supabase", "role": "alumno"}])
        if path.startswith("/rest/v1/courses") and method == "GET":
            return js([self.course])
        if path.startswith("/rest/v1/instructors"):
            return js([{"id": "andriy", "name": "Andriy Trofymenko", "role": "Ingeniero industrial", "bio": "", "photo": "img/people/andriy.jpg", "portrait": "img/people/andriy_p.jpg", "sort": 0}])
        if path.startswith("/rest/v1/enrollments") and method == "POST":
            row = json.loads(body)
            row = row[0] if isinstance(row, list) else row
            row.update({"enrolled_at": "2026-10-01T10:00:00Z", "done": {}, "pos": {}, "quiz": {}, "completed_at": None, "cert_code": None})
            return js(row if single else [row], 201)
        if method == "GET":
            return js(None if single else [])
        return route.fulfill(status=204, headers={"access-control-allow-origin": "*"})


@test
def supabase_ingreso_con_usuario_carga_datos_y_guarda_avance(browser):
    mock = SupaMock()
    ctx, page = new_page(browser, config_override=SUPA_CONFIG, supabase_mock=mock)
    goto(page, "/ingresar")
    check(page.query_selector(".demo-box") is None, "en modo Supabase no deben aparecer los accesos de demostración")
    login(page, "ana", "mala")
    check("Usuario o contraseña incorrectos" in text(page, ".form-err"), "con contraseña incorrecta debería rechazar")
    login(page, "ana", "Clave2026")
    page.wait_for_timeout(800)
    check("#/inicio" in page.url, f"no entró en modo Supabase (url {page.url}; errores {page.errors[:2]})")
    check("Ana" in text(page, "h1"), "el inicio debería saludar con el nombre del perfil de Supabase")
    check(any("/rpc/login_email" in c[1] for c in mock.calls), "el ingreso con usuario debería pasar por login_email")
    goto(page, "/curso/curso-test")
    page.click("[data-enroll]"); page.wait_for_timeout(900)
    posts = [c for c in mock.calls if c[0] == "POST" and "/rest/v1/enrollments" in c[1]]
    check(posts and json.loads(posts[-1][2]).get("course_id") == "c-test", "la inscripción debería enviarse a Supabase")
    page.click("[data-done]"); page.wait_for_timeout(2200)
    patches = [c for c in mock.calls if c[0] == "PATCH" and "/rest/v1/enrollments" in c[1]]
    check(patches and "test-1-1" in patches[-1][2], f"el avance debería guardarse en Supabase (PATCH enviados: {len(patches)})")
    check(not any("anon-de-prueba" in c[1] for c in mock.calls), "la clave no debe viajar en la URL")
    no_errors(page, "en modo Supabase")
    ctx.close()


@test
def supabase_verificacion_publica_de_certificado(browser):
    mock = SupaMock()
    ctx, page = new_page(browser, config_override=SUPA_CONFIG, supabase_mock=mock)
    goto(page, "/verificar/AMP-2026-TEST-OK22")
    page.wait_for_timeout(600)
    check("Certificado válido" in page.content() and "Ana Supabase" in page.content(), "la verificación pública debería consultar a Supabase")
    goto(page, "/verificar/AMP-2026-NOPE-0000")
    page.wait_for_timeout(500)
    check("No existe un certificado" in page.content(), "un código inexistente debería dar «no existe»")
    no_errors(page)
    ctx.close()


# =========================================================================== EJECUCIÓN
def main():
    server = subprocess.Popen([sys.executable, str(ROOT / "dev" / "serve.py"), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    passed, failed = [], []
    t0 = time.time()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=True, args=["--autoplay-policy=no-user-gesture-required"])
            for fn in TESTS:
                if FILTER and FILTER not in fn.__name__:
                    continue
                name = fn.__name__.replace("_", " ")
                t = time.time()
                try:
                    fn(browser)
                    passed.append(name)
                    print(f"  OK    {name}  ({time.time() - t:.1f} s)")
                except Exception as e:
                    failed.append((name, e))
                    print(f"  FALLA {name}\n        {e}")
                    if not isinstance(e, Fail):
                        traceback.print_exc()
            browser.close()
    finally:
        server.terminate()
    print(f"\n{len(passed)} pruebas OK · {len(failed)} con fallas · {time.time() - t0:.0f} s")
    if SHOTS.exists():
        print(f"Capturas en {SHOTS}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
