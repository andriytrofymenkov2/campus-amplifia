# Campus Amplifia

Plataforma de capacitaciones virtuales de Grupo Amplifia, con la misma identidad visual que www.grupoamplifia.com.

## Cómo verlo en tu computadora

```
python dev/serve.py
```

Abrí <http://localhost:8750>. En la pantalla de ingreso, los botones **Alumno** y **Administrador** de «Probá la demo» entran con las cuentas de prueba. Esas cuentas están en `js/data/seed.js`.

## Qué incluye

- **Alumno:** inicio con línea de avance, meta semanal, racha y logros. Además: catálogo con filtros, rutas de aprendizaje, aula con video, lecturas, controles, materiales, notas y preguntas, examen final, certificados con QR y verificación pública, clases en vivo (YouTube Live, Meet, Zoom) y perfil.
- **Administración:** resumen con indicadores, editor de cursos (lecciones, materiales, examen), alumnos, códigos de acceso por empresa, importación, clases en vivo, reportes con exportación a Excel y ajustes.

## Modos

| Modo | Para qué | Dónde se configura |
|---|---|---|
| `demo` (actual) | Ver y probar todo con datos de ejemplo. Los datos quedan en el navegador. | `js/config.js` |
| `supabase` | Uso real: usuarios, contraseñas y progreso en la nube, con seguridad. | `js/config.js` + `docs/SUPABASE.md` |

## Pruebas automáticas

```
python tests/test_campus.py
```

Son 33 pruebas: ingreso y seguridad, registro, catálogo, videos, controles, examen, certificados, clases en vivo, administración, celular, tablet y la conexión con Supabase (simulada). Las capturas quedan en `tests/capturas/`.

## Carpetas

```
index.html            página única (todas las pantallas)
css/campus.css        estilos (negro, lima y crema; Instrument Serif + Inter)
js/config.js          modo y datos de conexión
js/core/              datos, sesión, navegación, componentes, conector Supabase
js/views/             pantallas
js/data/              contenido de ejemplo y materiales descargables
supabase/             base de datos: 01_esquema.sql y 02_contenido_inicial.sql
docs/                 SUPABASE.md · PUBLICAR.md · INVESTIGACION.md
tests/                pruebas automáticas
dev/                  servidor local y generador del contenido SQL
media/ img/ fonts/    videos de muestra, portadas, fotos e íconos
```

## Contenido de ejemplo

Los 12 cursos, sus lecciones, preguntas de examen, alumnos, empresas, opiniones y preguntas son **borradores ficticios**, hechos para mostrar la plataforma funcionando. Se reemplazan por el contenido real desde el panel de administración.
