"""Genera supabase/02_contenido_inicial.sql a partir del contenido de ejemplo del campus
(frentes, instructores, cursos con sus lecciones, exámenes y rutas).
Uso: python dev/exportar_contenido.py
"""
import json
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = 8762
OUT = ROOT / "supabase" / "02_contenido_inicial.sql"


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def jb(obj):
    txt = json.dumps(obj, ensure_ascii=False)
    tag = "$j$"
    assert tag not in txt
    return f"{tag}{txt}{tag}::jsonb"


def arr(xs):
    return "array[" + ",".join(q(x) for x in xs) + "]::text[]" if xs else "'{}'::text[]"


def main():
    srv = subprocess.Popen([sys.executable, str(ROOT / "dev" / "serve.py"), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(channel="chrome", headless=True)
            page = b.new_page()
            page.goto(f"http://127.0.0.1:{PORT}/#/ingresar")
            page.wait_for_timeout(1500)
            data = page.evaluate("""(async () => {
              const S = await import('/js/core/store.js');
              const d = S.db;
              return { categories: d.categories, instructors: d.instructors, courses: d.courses, paths: d.paths };
            })()""")
            b.close()
    finally:
        srv.terminate()

    L = [
        "-- =============================================================================",
        "--  CAMPUS AMPLIFIA · CONTENIDO INICIAL (cursos de ejemplo)",
        "--  Ejecutar DESPUÉS de 01_esquema.sql. Se puede volver a ejecutar: actualiza sin duplicar.",
        "--  Los textos, lecciones y preguntas son BORRADORES para revisar desde el panel.",
        "--  Generado con dev/exportar_contenido.py",
        "-- =============================================================================",
        "",
        "-- Frentes de trabajo",
    ]
    for i, c in enumerate(data["categories"]):
        L.append(f"insert into public.categories (id, name, short, sort) values ({q(c['id'])}, {q(c['name'])}, {q(c['short'])}, {i}) "
                 "on conflict (id) do update set name = excluded.name, short = excluded.short, sort = excluded.sort;")
    L += ["", "-- Instructores"]
    for i, x in enumerate(data["instructors"]):
        L.append(f"insert into public.instructors (id, name, role, bio, photo, portrait, sort) values ({q(x['id'])}, {q(x['name'])}, {q(x['role'])}, {q(x['bio'])}, {q(x['photo'])}, {q(x['portrait'])}, {i}) "
                 "on conflict (id) do update set name = excluded.name, role = excluded.role, bio = excluded.bio, photo = excluded.photo, portrait = excluded.portrait, sort = excluded.sort;")
    L += ["", "-- Cursos (el examen final va aparte, en exam_questions, que los alumnos no pueden leer)"]
    for c in data["courses"]:
        keys = ["subtitle", "cat", "level", "instructors", "cover", "desc", "outcomes", "forWho", "req", "modules"]
        payload = {k: c.get(k) for k in keys}
        exam = c.get("exam")
        cfg = {"pass": exam["pass"], "minutes": exam["minutes"], "attempts": exam["attempts"]} if exam else None
        L.append(f"insert into public.courses (id, slug, title, data, published, soon, featured, is_new, sort) values ({q(c['id'])}, {q(c['slug'])}, {q(c['title'])}, {jb(payload)}, "
                 f"{str(bool(c.get('published'))).lower()}, {str(bool(c.get('soon'))).lower()}, {str(bool(c.get('featured'))).lower()}, {str(bool(c.get('isNew'))).lower()}, {c.get('order', 0)}) "
                 "on conflict (id) do update set slug = excluded.slug, title = excluded.title, data = excluded.data, published = excluded.published, soon = excluded.soon, featured = excluded.featured, is_new = excluded.is_new, sort = excluded.sort, updated_at = now();")
        if exam:
            qs = [{"q": x["q"], "o": x["o"], "a": x["a"], "e": x.get("e", "")} for x in exam["qs"]]
            L.append(f"select public_set_exam_seed({q(c['id'])}, {jb(cfg)}, {jb(qs)});")
        else:
            L.append(f"update public.courses set exam_config = null where id = {q(c['id'])};")
    L += ["", "-- Rutas de aprendizaje"]
    for i, pth in enumerate(data["paths"]):
        L.append(f"insert into public.paths (id, title, descr, course_ids, sort) values ({q(pth['id'])}, {q(pth['title'])}, {q(pth['desc'])}, {arr(pth['courses'])}, {i}) "
                 "on conflict (id) do update set title = excluded.title, descr = excluded.descr, course_ids = excluded.course_ids, sort = excluded.sort;")

    helper = [
        "",
        "-- Función auxiliar (solo para esta carga; se borra al final)",
        "create or replace function public_set_exam_seed(p_course text, p_config jsonb, p_questions jsonb) returns void language plpgsql as $f$",
        "begin",
        "  delete from public.exam_questions where course_id = p_course;",
        "  insert into public.exam_questions (course_id, idx, q, options, answer, explanation)",
        "    select p_course, (x.ord - 1)::int, x.v->>'q', x.v->'o', (x.v->>'a')::int, coalesce(x.v->>'e', '')",
        "      from jsonb_array_elements(p_questions) with ordinality x(v, ord);",
        "  update public.courses set exam_config = p_config || jsonb_build_object('count', jsonb_array_length(p_questions)) where id = p_course;",
        "end $f$;",
        "",
    ]
    idx = L.index("-- Frentes de trabajo")
    L[idx:idx] = helper
    L += ["", "drop function if exists public_set_exam_seed(text, jsonb, jsonb);", "",
          "-- Verificación: tiene que dar 23 tablas, 12 cursos, 66 preguntas, 2 carpetas y más de 50 reglas",
          "select (select count(*) from pg_tables where schemaname = 'public') as tablas,",
          "       (select count(*) from public.courses) as cursos,",
          "       (select count(*) from public.exam_questions) as preguntas,",
          "       (select count(*) from storage.buckets where id in ('portadas', 'materiales')) as carpetas,",
          "       (select count(*) from pg_policies where schemaname = 'public') as reglas;"]
    OUT.write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"Escrito {OUT} ({len(data['courses'])} cursos)")


if __name__ == "__main__":
    main()
