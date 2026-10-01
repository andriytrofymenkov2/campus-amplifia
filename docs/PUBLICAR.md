# Publicar el campus en campus.grupoamplifia.com

> Antes de publicar con alumnos reales, conectá Supabase (`docs/SUPABASE.md`).
> En modo demostración los datos quedan en cada navegador y no sirven para uso real.

## 1. Subir el campus a GitHub Pages

1. Crear un repositorio nuevo en la cuenta `andriytrofymenkov2`, por ejemplo `campus-amplifia`. No es el de la web ni el de Líderes Aumentados.
2. Subir el contenido de esta carpeta, **sin** `tests/capturas` ni `dev/`. El archivo `CNAME` tiene que decir `campus.grupoamplifia.com`.
3. En el repo: **Settings → Pages → Deploy from a branch → main / (root)**.

## 2. Crear el subdominio en DonWeb (gratis)

En el panel de DonWeb → dominio `grupoamplifia.com` → **Zona DNS** → **Agregar registro**:

| Tipo | Nombre | Valor |
|---|---|---|
| CNAME | `campus` | `andriytrofymenkov2.github.io` |

En 10–60 minutos `campus.grupoamplifia.com` muestra el campus. Después, en GitHub **Settings → Pages**, marcar **Enforce HTTPS**.

## 3. El acceso desde grupoamplifia.com

En la web principal (`Web Consultora/index.html`), el bloque **«Plataforma de capacitación · En construcción»** pasa a decir **«Ingresar al campus»** y enlaza a `https://campus.grupoamplifia.com`. También se puede sumar un botón **Campus** en el menú. Se hace el mismo día que el campus esté publicado.

## 4. Revisión final antes de anunciarlo

- [ ] `js/config.js` en `mode: "supabase"` con la URL y la anon key.
- [ ] En Supabase: *Site URL* y *Redirect URLs* con `https://campus.grupoamplifia.com`.
- [ ] Usuario administrador creado (`make_admin`).
- [ ] Cursos revisados: los textos y preguntas de ejemplo son borradores.
- [ ] Videos reales cargados (Vimeo, YouTube no listado o Bunny Stream).
- [ ] `python tests/test_campus.py` sin fallas.
- [ ] MFA activado en las cuentas de Supabase y GitHub.
