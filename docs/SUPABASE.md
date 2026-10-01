# Conectar el campus a Supabase (usuarios y contraseñas reales)

Hoy el campus funciona en **modo demostración**: los datos son de ejemplo y quedan guardados en el navegador. Para usarlo con alumnos reales hay que conectarlo a **Supabase**, que guarda usuarios, contraseñas, progreso, exámenes y certificados en la nube, con seguridad.

Todo lo técnico ya está preparado. Son unos 15 minutos de pasos en pantallas de Supabase.

---

## 1. Crear la cuenta y el proyecto (5 min)

1. Entrá a <https://supabase.com> → **Start your project** → registrate (podés usar la cuenta de GitHub `andriytrofymenkov2` o el email de Amplifia).
2. **New project**:
   - **Name:** `campus-amplifia`
   - **Database password:** generá una fuerte y **guardala en un gestor de contraseñas**. No la compartas con nadie, ni conmigo.
   - **Region:** `South America (São Paulo)`: es la más cercana a Argentina.
   - **Plan:** *Free* para probar. Para producción conviene **Pro (USD 25/mes)**: el plan gratis **pausa el proyecto tras 7 días sin uso** y no tiene copias de seguridad diarias.
3. Esperá 1–2 minutos a que el proyecto quede listo.

## 2. Crear la base de datos (2 min)

1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abrí el archivo `supabase/01_esquema.sql` de esta carpeta, copiá **todo** y pegalo. Tocá **Run**. Tiene que decir *Success*.
3. **New query** otra vez, pegá todo `supabase/02_contenido_inicial.sql` y tocá **Run**. Eso carga los 12 cursos de ejemplo con sus exámenes.

> Los dos archivos se pueden volver a ejecutar sin romper nada.

## 3. Configurar el ingreso (3 min)

En **Authentication**:

- **URL Configuration**
  - **Site URL:** `https://campus.grupoamplifia.com`
  - **Redirect URLs:** agregá `https://campus.grupoamplifia.com` y `http://localhost:8750` (para pruebas).
- **Sign In / Providers → Email**
  - **Confirm email:** *desactivado* para empezar. Así los alumnos que cargás desde el panel entran directo. Si lo dejás activado, cada alumno tiene que confirmar desde su email antes de entrar.
  - **Minimum password length:** `8`.
  - **Password requirements:** *Lowercase, uppercase letters and digits*.
- **Rate Limits:** dejar los valores por defecto (frenan ataques de fuerza bruta).

## 4. Crear tu usuario administrador (2 min)

1. **Authentication → Users → Add user → Create new user**: tu email y una contraseña fuerte. Marcá **Auto Confirm User**.
2. **SQL Editor → New query**, pegá esto (con tu email) y **Run**:

   ```sql
   select public.make_admin('tu-email@ejemplo.com');
   ```

   Tiene que responder `Listo: ... ahora es administrador`.
3. Repetí para Christian si también va a administrar.

## 5. Conectar la página (1 min)

1. **Project Settings → API Keys** (o botón **Connect** arriba): copiá la **Project URL** y la clave pública: **publishable** (empieza con `sb_publishable_…`) o **anon public** (empieza con `eyJ…`).
   - Esa clave es pública por diseño (la protegen las reglas de la base).
   - **Nunca** copies ni compartas la **secret** (`sb_secret_…`) ni la **service_role**.
2. Abrí `js/config.js` y completá:

   ```js
   mode: "supabase",
   supabaseUrl: "https://xxxxxxxx.supabase.co",
   supabaseAnonKey: "eyJ...",
   ```

   O pasame esos dos datos y lo hago yo.

## 6. Probar

1. `python dev/serve.py` y abrí <http://localhost:8750>.
2. Ingresá con tu email (o tu usuario) y contraseña → entrás como administrador.
3. Panel → **Alumnos → Códigos de acceso → Nuevo código** (por ejemplo `EMPRESA-2026`, con sus cursos).
4. En otra ventana privada: **Activá tu cuenta** con ese código → creá un alumno de prueba → hacé una lección y el examen.
5. Volvé al panel: ese alumno aparece con su avance y su certificado.

---

## Cómo entran los alumnos

| Forma | Cómo |
|---|---|
| **Código de empresa** | Creás un código con los cursos de esa empresa y le pasás a la gente el enlace `https://campus.grupoamplifia.com/#/registro?codigo=EMPRESA-2026`. Cada uno crea su usuario y contraseña. |
| **Alta individual** | Panel → Alumnos → **Nuevo alumno**: se genera una contraseña temporal que le pasás por un canal privado. |
| **Importación** | Panel → Alumnos → **Importar**: pegás una lista desde Excel (nombre; email; empresa). |

El alumno ingresa con **usuario o email** + contraseña. Si se la olvida, usa **¿Olvidaste tu contraseña?** y recibe un email para crear una nueva.

> **Correos:** Supabase manda los emails de recuperación con un servicio gratuito limitado (unos pocos por hora). Cuando haya muchos alumnos conviene conectar un servicio de correo propio (por ejemplo **Resend**, gratis hasta 3.000 por mes) en *Authentication → Emails → SMTP Settings*, para que salgan desde `@grupoamplifia.com`.

---

## Seguridad: qué protege a la plataforma

- **Contraseñas:** las guarda Supabase Auth cifradas con *bcrypt*. Ni la base de datos del campus ni nosotros podemos verlas.
- **Cada alumno ve solo lo suyo:** todas las tablas tienen *Row Level Security*. Aunque alguien modifique la página en su navegador, el servidor no le entrega datos de otros.
- **Exámenes imposibles de trampear desde el navegador:** las respuestas correctas están en una tabla que los alumnos no pueden leer. La corrección, el tiempo límite y los intentos se controlan en el servidor.
- **Certificados auténticos:** solo los emite el servidor al aprobar. Cualquier empresa puede verificarlos en `/#/verificar/CÓDIGO` y los anulados dejan de validar.
- **Ingreso con usuario:** se verifica la contraseña en el servidor antes de revelar nada, con límite de 8 intentos cada 15 minutos por usuario. La pantalla de ingreso también bloquea tras 5 intentos.
- **Administración:** el rol se verifica en el servidor con `is_admin()`. Un alumno no puede darse permisos.
- **Archivos:** los materiales quedan en un almacenamiento **privado**. Se descargan con enlaces que vencen a los 2 minutos.
- **La página:** usa una *Content Security Policy* que bloquea scripts inyectados, y las librerías externas se cargan con verificación de integridad (SRI).
- **Recomendado además:** activar la verificación en dos pasos (MFA) en tu cuenta de Supabase y en GitHub.

## Videos

Cada lección acepta un enlace de **Vimeo**, **YouTube** (como *No listado*) o **Bunny Stream**:

- **YouTube no listado:** gratis, pero cualquiera con el enlace puede verlo.
- **Vimeo** (desde USD 12/mes): permite que el video solo se reproduzca dentro de `campus.grupoamplifia.com`.
- **Bunny Stream** (unos USD 1–5/mes): la opción más protegida y barata, con enlaces firmados.

## Clases en vivo

Panel → **Clases en vivo → Nueva clase**:

- **Transmisión en YouTube:** programá el vivo en YouTube Studio como *No listado* y pegá el enlace. Los alumnos lo ven dentro del campus, con el chat al costado, o lo abren en YouTube. Al terminar, la grabación queda en el mismo enlace.
- **Meet, Zoom o Teams:** para grupos chicos y participativos. El botón *Unirme* se habilita 15 minutos antes.

## Costos estimados

| Servicio | Para empezar | Con alumnos reales |
|---|---|---|
| Supabase | Gratis | USD 25/mes (Pro: sin pausas y con copias de seguridad diarias) |
| Hosting (GitHub Pages) | Gratis | Gratis |
| Subdominio campus.grupoamplifia.com | Gratis (DonWeb) | Gratis |
| Videos | YouTube no listado (gratis) | Bunny Stream USD 1–5/mes o Vimeo USD 12/mes |
| Correos | Incluido (limitado) | Resend gratis hasta 3.000 por mes |
