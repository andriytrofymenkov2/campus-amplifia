-- =============================================================================
--  CAMPUS AMPLIFIA · ESQUEMA DE BASE DE DATOS PARA SUPABASE
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--  Se puede volver a ejecutar sin romper nada (usa "if not exists" / "or replace").
--
--  SEGURIDAD (resumen):
--  · Contraseñas: las maneja Supabase Auth (cifradas con bcrypt). Nunca pasan por estas tablas.
--  · Row Level Security (RLS) en TODAS las tablas: cada alumno solo ve y modifica lo suyo.
--  · Los alumnos no pueden escribir su nota, sus intentos ni sus certificados: eso lo hacen
--    funciones del servidor (security definer) que validan todo.
--  · Las respuestas correctas de los exámenes están en una tabla que los alumnos no pueden leer.
--  · El rol de administrador se verifica en el servidor con is_admin().
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

-- -----------------------------------------------------------------------------
-- PERFILES (uno por usuario de Supabase Auth)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null check (username ~ '^[a-z0-9._-]{3,40}$'),
  full_name   text not null check (length(full_name) between 2 and 120),
  email       text not null,
  role        text not null default 'alumno' check (role in ('alumno', 'admin')),
  company     text not null default '',
  area        text not null default '',
  goal        int  not null default 120 check (goal between 15 and 2000),
  saved       text[] not null default '{}',
  active      boolean not null default true,
  joined_at   timestamptz not null default now(),
  last_seen   timestamptz
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

-- Nombres visibles para todos los usuarios activos (para preguntas, opiniones, etc.). Sin emails.
create or replace view public.people with (security_invoker = false) as
  select id, full_name, role from public.profiles where active;

-- -----------------------------------------------------------------------------
-- CONTENIDO
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id text primary key, name text not null, short text not null, sort int not null default 0
);

create table if not exists public.instructors (
  id text primary key, name text not null, role text not null default '', bio text not null default '',
  photo text not null default '', portrait text not null default '', sort int not null default 0
);

-- data = { subtitle, cat, level, instructors[], cover, desc, outcomes[], forWho, req, modules[] }
-- exam_config = { pass, minutes, attempts, count }  (null = sin examen final)
create table if not exists public.courses (
  id text primary key,
  slug text unique not null check (slug ~ '^[a-z0-9-]{3,80}$'),
  title text not null,
  data jsonb not null default '{}',
  exam_config jsonb,
  published boolean not null default false,
  soon boolean not null default false,
  featured boolean not null default false,
  is_new boolean not null default false,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

-- Preguntas del examen final, CON la respuesta correcta: solo administradores
create table if not exists public.exam_questions (
  id bigint generated always as identity primary key,
  course_id text not null references public.courses(id) on delete cascade,
  idx int not null,
  q text not null,
  options jsonb not null,
  answer int not null,
  explanation text not null default ''
);
create index if not exists exam_questions_course on public.exam_questions(course_id, idx);

create table if not exists public.paths (
  id text primary key, title text not null, descr text not null default '', course_ids text[] not null default '{}', sort int not null default 0
);

create table if not exists public.settings ( key text primary key, value text not null default '' );

-- -----------------------------------------------------------------------------
-- APRENDIZAJE
-- -----------------------------------------------------------------------------
create table if not exists public.enrollments (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  done jsonb not null default '{}',     -- { idLeccion: epoch ms }
  pos jsonb not null default '{}',      -- { idLeccion: segundos }
  quiz jsonb not null default '{}',     -- { idLeccion: puntaje del control }
  last text,
  completed_at timestamptz,
  cert_code text,
  unique (user_id, course_id)
);
create index if not exists enrollments_course on public.enrollments(course_id);

create table if not exists public.exam_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  score int not null, passed boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists exam_attempts_user on public.exam_attempts(user_id, course_id);

create table if not exists private.exam_sessions (
  user_id uuid not null, course_id text not null, started_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists public.certificates (
  code text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  issued_at timestamptz not null default now(),
  score int, minutes int not null default 0,
  revoked boolean not null default false
);

create table if not exists public.activity (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null, minutes numeric(8,2) not null default 0,
  primary key (user_id, day)
);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  type text not null check (type in ('enroll', 'lesson', 'exam', 'cert')),
  course_id text, lesson_id text, meta jsonb not null default '{}',
  at timestamptz not null default now()
);
create index if not exists events_user on public.events(user_id, at desc);

create table if not exists public.notes (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  course_id text not null, lesson_id text not null, t int, text text not null check (length(text) <= 2000),
  at timestamptz not null default now()
);

create table if not exists public.threads (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references public.courses(id) on delete cascade, lesson_id text,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  text text not null check (length(text) between 3 and 1500),
  at timestamptz not null default now()
);

create table if not exists public.thread_replies (
  id text primary key default gen_random_uuid()::text,
  thread_id text not null references public.threads(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  instructor_id text references public.instructors(id),
  text text not null check (length(text) between 1 and 1500),
  at timestamptz not null default now()
);

create table if not exists public.reviews (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references public.courses(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  text text not null default '' check (length(text) <= 600),
  at timestamptz not null default now(),
  unique (course_id, user_id)
);

create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, text text not null default '', link text not null default '', icon text not null default 'bell',
  read boolean not null default false,
  at timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications(user_id, at desc);

create table if not exists public.course_watch (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  primary key (user_id, course_id)
);

-- -----------------------------------------------------------------------------
-- CLASES EN VIVO (YouTube Live, Meet, Zoom, Teams)
-- -----------------------------------------------------------------------------
create table if not exists public.live_sessions (
  id text primary key default gen_random_uuid()::text,
  title text not null, descr text not null default '',
  at timestamptz not null, minutes int not null default 60,
  by_ids text[] not null default '{}',
  course_id text references public.courses(id) on delete set null,
  kind text not null default 'youtube' check (kind in ('youtube', 'meet', 'zoom', 'teams', 'otro')),
  link text not null default '' check (link = '' or link ~ '^https://'),
  rec boolean not null default false,
  rec_url text not null default '' check (rec_url = '' or rec_url ~ '^https://')
);

create table if not exists public.live_rsvp (
  session_id text not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  primary key (session_id, user_id)
);

create table if not exists public.live_questions (
  id text primary key default gen_random_uuid()::text,
  session_id text not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  text text not null check (length(text) between 5 and 300),
  at timestamptz not null default now()
);

create table if not exists public.live_votes (
  question_id text not null references public.live_questions(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  primary key (question_id, user_id)
);

-- -----------------------------------------------------------------------------
-- CÓDIGOS DE ACCESO (registro de alumnos de una empresa)
-- -----------------------------------------------------------------------------
create table if not exists public.access_codes (
  code text primary key check (code ~ '^[A-Z0-9-]{4,40}$'),
  company text not null default '',
  course_ids text[] not null default '{}',
  uses int not null default 0,
  max_uses int not null default 1 check (max_uses > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists private.login_attempts ( ident text not null, at timestamptz not null default now() );
create index if not exists login_attempts_ident on private.login_attempts(ident, at);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array['profiles','categories','instructors','courses','exam_questions','paths','settings','enrollments',
    'exam_attempts','certificates','activity','events','notes','threads','thread_replies','reviews','notifications',
    'course_watch','live_sessions','live_rsvp','live_questions','live_votes','access_codes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

revoke all on schema private from anon, authenticated;
revoke all on public.people from anon;
grant select on public.people to authenticated;

-- Helper para recrear políticas sin errores
create or replace function private.reset_policies(tbl text) returns void language plpgsql as $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = tbl loop
    execute format('drop policy %I on public.%I', p.policyname, tbl);
  end loop;
end $$;

-- PROFILES: cada uno ve el suyo; admin ve todos. Los alumnos solo pueden editar algunas columnas.
select private.reset_policies('profiles');
create policy "ver propio o admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "editar propio" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name, area, goal, saved, last_seen) on public.profiles to authenticated;

-- CONTENIDO: lectura para usuarios activos; escritura solo admin
select private.reset_policies('categories');
create policy "leer" on public.categories for select using (public.is_active());
create policy "admin" on public.categories for all using (public.is_admin()) with check (public.is_admin());

select private.reset_policies('instructors');
create policy "leer" on public.instructors for select using (public.is_active());
create policy "admin" on public.instructors for all using (public.is_admin()) with check (public.is_admin());

select private.reset_policies('courses');
create policy "leer publicados" on public.courses for select using ((published and public.is_active()) or public.is_admin());
create policy "admin" on public.courses for all using (public.is_admin()) with check (public.is_admin());

select private.reset_policies('exam_questions');
create policy "solo admin" on public.exam_questions for all using (public.is_admin()) with check (public.is_admin());

select private.reset_policies('paths');
create policy "leer" on public.paths for select using (public.is_active());
create policy "admin" on public.paths for all using (public.is_admin()) with check (public.is_admin());

select private.reset_policies('settings');
create policy "leer" on public.settings for select using (public.is_active());
create policy "admin" on public.settings for all using (public.is_admin()) with check (public.is_admin());

-- ENROLLMENTS: el alumno se inscribe y guarda su avance; NO puede tocar cert_code ni completed_at
select private.reset_policies('enrollments');
create policy "ver propio o admin" on public.enrollments for select using (user_id = auth.uid() or public.is_admin());
create policy "inscribirse" on public.enrollments for insert with check (
  (user_id = auth.uid() and public.is_active() and exists (select 1 from public.courses c where c.id = course_id and c.published and not c.soon))
  or public.is_admin());
create policy "guardar avance" on public.enrollments for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "admin borra" on public.enrollments for delete using (public.is_admin());
revoke update on public.enrollments from authenticated;
grant update (done, pos, quiz, last) on public.enrollments to authenticated;

select private.reset_policies('exam_attempts');
create policy "ver propio o admin" on public.exam_attempts for select using (user_id = auth.uid() or public.is_admin());
create policy "admin borra" on public.exam_attempts for delete using (public.is_admin());
revoke insert, update on public.exam_attempts from authenticated;

select private.reset_policies('certificates');
create policy "ver propio o admin" on public.certificates for select using (user_id = auth.uid() or public.is_admin());
create policy "admin anula" on public.certificates for update using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.certificates from authenticated;

select private.reset_policies('activity');
create policy "ver propio o admin" on public.activity for select using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.activity from authenticated;

select private.reset_policies('events');
create policy "ver propio" on public.events for select using (user_id = auth.uid() or public.is_admin());
create policy "registrar propio" on public.events for insert with check (user_id = auth.uid() and type in ('enroll', 'lesson'));

select private.reset_policies('notes');
create policy "propias" on public.notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

select private.reset_policies('threads');
create policy "leer" on public.threads for select using (public.is_active());
create policy "preguntar" on public.threads for insert with check (user_id = auth.uid() and public.is_active());
create policy "admin borra" on public.threads for delete using (public.is_admin() or user_id = auth.uid());

select private.reset_policies('thread_replies');
create policy "leer" on public.thread_replies for select using (public.is_active());
create policy "responder" on public.thread_replies for insert with check (
  user_id = auth.uid() and public.is_active() and (instructor_id is null or public.is_admin()));
create policy "admin borra" on public.thread_replies for delete using (public.is_admin() or user_id = auth.uid());

select private.reset_policies('reviews');
create policy "leer" on public.reviews for select using (public.is_active());
create policy "opinar" on public.reviews for insert with check (user_id = auth.uid() and exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_id = reviews.course_id));
create policy "editar propia" on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin borra" on public.reviews for delete using (public.is_admin());

select private.reset_policies('notifications');
create policy "propias" on public.notifications for select using (user_id = auth.uid());
create policy "marcar leidas" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "crear" on public.notifications for insert with check (public.is_admin() or user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

select private.reset_policies('course_watch');
create policy "propios" on public.course_watch for all using (user_id = auth.uid()) with check (user_id = auth.uid());

select private.reset_policies('live_sessions');
create policy "leer" on public.live_sessions for select using (public.is_active());
create policy "admin" on public.live_sessions for all using (public.is_admin()) with check (public.is_admin());

select private.reset_policies('live_rsvp');
create policy "leer" on public.live_rsvp for select using (public.is_active());
create policy "anotarse" on public.live_rsvp for insert with check (user_id = auth.uid() and public.is_active());
create policy "desanotarse" on public.live_rsvp for delete using (user_id = auth.uid());

select private.reset_policies('live_questions');
create policy "leer" on public.live_questions for select using (public.is_active());
create policy "preguntar" on public.live_questions for insert with check (user_id = auth.uid() and public.is_active());
create policy "borrar" on public.live_questions for delete using (user_id = auth.uid() or public.is_admin());

select private.reset_policies('live_votes');
create policy "leer" on public.live_votes for select using (public.is_active());
create policy "votar" on public.live_votes for insert with check (user_id = auth.uid() and public.is_active());
create policy "quitar voto" on public.live_votes for delete using (user_id = auth.uid());

select private.reset_policies('access_codes');
create policy "solo admin" on public.access_codes for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- ALTA DE USUARIOS: al registrarse se crea el perfil y se canjea el código
-- =============================================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  uname text := lower(coalesce(nullif(meta->>'username', ''), split_part(new.email, '@', 1)));
  c public.access_codes%rowtype;
  has_code boolean := coalesce(meta->>'code', '') <> '';
begin
  uname := regexp_replace(uname, '[^a-z0-9._-]', '', 'g');
  if length(uname) < 3 then uname := uname || substr(md5(new.id::text), 1, 4); end if;
  while exists (select 1 from public.profiles where username = uname) loop
    uname := uname || floor(random() * 10)::text;
  end loop;

  if has_code then
    select * into c from public.access_codes where code = upper(meta->>'code') and active for update;
    if not found or c.uses >= c.max_uses then
      raise exception 'Código de acceso inválido o agotado';
    end if;
    update public.access_codes set uses = uses + 1 where code = c.code;
  end if;

  insert into public.profiles (id, username, full_name, email, company, active)
  values (new.id, uname, coalesce(nullif(meta->>'full_name', ''), uname), new.email,
          coalesce(c.company, ''),
          has_code);  -- sin código la cuenta queda pendiente hasta que un admin la active

  if has_code then
    insert into public.enrollments (user_id, course_id)
      select new.id, x from unnest(c.course_ids) x
      where exists (select 1 from public.courses where id = x)
      on conflict do nothing;
    insert into public.notifications (user_id, title, text, link, icon)
      values (new.id, '¡Bienvenido al campus!', 'Tu empresa te asignó ' || coalesce(array_length(c.course_ids, 1), 0) || ' cursos.', '#/mis-cursos', 'sparkle');
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Mantiene el email del perfil sincronizado si el usuario lo cambia
create or replace function public.handle_user_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;
drop trigger if exists on_auth_user_email on auth.users;
create trigger on_auth_user_email after update of email on auth.users for each row execute function public.handle_user_email();

-- =============================================================================
-- FUNCIONES PÚBLICAS (antes de iniciar sesión)
-- =============================================================================

-- Ingreso con NOMBRE DE USUARIO: devuelve el email SOLO si la contraseña es correcta
-- (así nadie puede averiguar emails a partir de usuarios). Limita a 8 intentos cada 15 minutos.
create or replace function public.login_email(p_ident text, p_pass text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_email text; v_hash text; v_n int; v_id text := lower(trim(p_ident));
begin
  if random() < 0.02 then delete from private.login_attempts where at < now() - interval '1 day'; end if;
  select count(*) into v_n from private.login_attempts where ident = v_id and at > now() - interval '15 minutes';
  if v_n >= 8 then raise exception 'Demasiados intentos. Esperá 15 minutos.'; end if;
  select u.email, u.encrypted_password into v_email, v_hash
    from auth.users u join public.profiles p on p.id = u.id
    where p.username = v_id and p.active;
  if v_hash is null or extensions.crypt(p_pass, v_hash) <> v_hash then
    insert into private.login_attempts (ident) values (v_id);
    return null;
  end if;
  delete from private.login_attempts where ident = v_id;
  return v_email;
end $$;

create or replace function public.check_access_code(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('ok', uses < max_uses, 'company', company, 'courses', coalesce(array_length(course_ids, 1), 0))
       from public.access_codes where code = upper(trim(p_code)) and active),
    jsonb_build_object('ok', false));
$$;

create or replace function public.username_available(p_user text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where username = lower(trim(p_user)));
$$;

-- Verificación pública de certificados (para empresas): sin datos sensibles
create or replace function public.verify_certificate(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('valid', true, 'code', c.code, 'name', p.full_name, 'course', co.title, 'course_id', co.id,
            'instructors', co.data->'instructors', 'issued_at', c.issued_at, 'score', c.score, 'minutes', c.minutes)
       from public.certificates c join public.profiles p on p.id = c.user_id join public.courses co on co.id = c.course_id
      where c.code = upper(trim(p_code)) and not c.revoked),
    jsonb_build_object('valid', false));
$$;

-- =============================================================================
-- FUNCIONES DEL ALUMNO
-- =============================================================================
create or replace function private.lesson_ids(p_course text) returns text[]
language sql stable as $$
  select coalesce(array_agg(l->>'id'), '{}')
    from public.courses c, jsonb_array_elements(c.data->'modules') m, jsonb_array_elements(m->'lessons') l
   where c.id = p_course;
$$;

create or replace function private.lessons_done(p_user uuid, p_course text) returns boolean
language sql stable as $$
  select coalesce((select bool_and(e.done ? x) from public.enrollments e, unnest(private.lesson_ids(p_course)) x
                    where e.user_id = p_user and e.course_id = p_course), false);
$$;

create or replace function private.new_cert_code() returns text
language plpgsql as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea := extensions.gen_random_bytes(8); s text := ''; i int;
begin
  for i in 0..7 loop s := s || substr(a, 1 + (get_byte(b, i) % 32), 1); end loop;
  return 'AMP-' || to_char(now(), 'YYYY') || '-' || substr(s, 1, 4) || '-' || substr(s, 5, 4);
end $$;

create or replace function private.course_minutes(p_course text) returns int
language sql stable as $$
  select coalesce(sum((l->>'min')::int), 0)::int + coalesce((select (exam_config->>'minutes')::int from public.courses where id = p_course), 0)
    from public.courses c, jsonb_array_elements(c.data->'modules') m, jsonb_array_elements(m->'lessons') l
   where c.id = p_course;
$$;

create or replace function private.issue_cert(p_user uuid, p_course text, p_score int) returns public.certificates
language plpgsql security definer set search_path = public as $$
declare ct public.certificates; v_title text;
begin
  select * into ct from public.certificates where user_id = p_user and course_id = p_course and not revoked;
  if found then return ct; end if;
  insert into public.certificates (code, user_id, course_id, score, minutes)
    values (private.new_cert_code(), p_user, p_course, p_score, private.course_minutes(p_course)) returning * into ct;
  update public.enrollments set cert_code = ct.code, completed_at = ct.issued_at where user_id = p_user and course_id = p_course;
  select title into v_title from public.courses where id = p_course;
  insert into public.events (user_id, type, course_id, meta) values (p_user, 'cert', p_course, jsonb_build_object('code', ct.code));
  insert into public.notifications (user_id, title, text, link, icon) values (p_user, 'Obtuviste tu certificado', v_title, '#/certificado/' || ct.code, 'award');
  return ct;
end $$;

-- Empieza (o retoma) el examen final. Devuelve las preguntas SIN la respuesta correcta.
create or replace function public.start_exam(p_course text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cfg jsonb; v_used int; v_started timestamptz;
begin
  if not public.is_active() then raise exception 'Cuenta inactiva'; end if;
  select exam_config into cfg from public.courses where id = p_course and published;
  if cfg is null then raise exception 'Este curso no tiene examen'; end if;
  if not exists (select 1 from public.enrollments where user_id = auth.uid() and course_id = p_course) then raise exception 'No estás inscripto'; end if;
  if not private.lessons_done(auth.uid(), p_course) then raise exception 'Completá todas las lecciones antes del examen'; end if;
  if exists (select 1 from public.certificates where user_id = auth.uid() and course_id = p_course and not revoked) then raise exception 'Ya aprobaste este curso'; end if;
  select count(*) into v_used from public.exam_attempts where user_id = auth.uid() and course_id = p_course;
  if v_used >= (cfg->>'attempts')::int then raise exception 'No te quedan intentos'; end if;

  select started_at into v_started from private.exam_sessions where user_id = auth.uid() and course_id = p_course;
  if v_started is null or v_started + make_interval(mins => (cfg->>'minutes')::int + 2) < now() then
    insert into private.exam_sessions (user_id, course_id, started_at) values (auth.uid(), p_course, now())
      on conflict (user_id, course_id) do update set started_at = now() returning started_at into v_started;
  end if;

  return jsonb_build_object(
    'pass', (cfg->>'pass')::int, 'minutes', (cfg->>'minutes')::int, 'attempts', (cfg->>'attempts')::int,
    'started_at', v_started,
    'qs', (select coalesce(jsonb_agg(jsonb_build_object('i', idx, 'q', q,
             'o', (select jsonb_agg(jsonb_build_object('j', o.ord - 1, 't', o.val) order by random()) from jsonb_array_elements_text(options) with ordinality o(val, ord))
           ) order by random()), '[]'::jsonb)
           from public.exam_questions where course_id = p_course));
end $$;

-- Corrige en el servidor, registra el intento y emite el certificado si aprueba.
-- p_answers = { "índicePregunta": índiceOpción }
create or replace function public.grade_exam(p_course text, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cfg jsonb; v_started timestamptz; v_total int; v_ok int; v_score int; v_passed boolean; v_left int; v_reveal boolean; ct public.certificates; v_review jsonb;
begin
  select exam_config into cfg from public.courses where id = p_course;
  select started_at into v_started from private.exam_sessions where user_id = auth.uid() and course_id = p_course;
  if v_started is null then raise exception 'El examen no fue iniciado'; end if;
  delete from private.exam_sessions where user_id = auth.uid() and course_id = p_course;
  if exists (select 1 from public.certificates where user_id = auth.uid() and course_id = p_course and not revoked) then raise exception 'Ya aprobaste este curso'; end if;
  if (select count(*) from public.exam_attempts where user_id = auth.uid() and course_id = p_course) >= (cfg->>'attempts')::int then raise exception 'No te quedan intentos'; end if;
  -- Fuera de tiempo (con 2 minutos de tolerancia): las respuestas no cuentan
  if v_started + make_interval(mins => (cfg->>'minutes')::int + 2) < now() then p_answers := '{}'::jsonb; end if;

  select count(*), count(*) filter (where (p_answers->>(idx::text))::int = answer) into v_total, v_ok
    from public.exam_questions where course_id = p_course;
  v_score := case when v_total = 0 then 0 else round(v_ok * 100.0 / v_total) end;
  v_passed := v_score >= (cfg->>'pass')::int;
  insert into public.exam_attempts (user_id, course_id, score, passed) values (auth.uid(), p_course, v_score, v_passed);
  insert into public.events (user_id, type, course_id, meta) values (auth.uid(), 'exam', p_course, jsonb_build_object('score', v_score));
  v_left := (cfg->>'attempts')::int - (select count(*) from public.exam_attempts where user_id = auth.uid() and course_id = p_course);
  v_reveal := v_passed or v_left <= 0;

  select jsonb_agg(jsonb_build_object('q', q, 'o', options, 'chosen', (p_answers->>(idx::text))::int,
           'ok', (p_answers->>(idx::text))::int = answer,
           'correct', case when v_reveal then answer end, 'e', case when v_reveal then explanation end) order by idx)
    into v_review from public.exam_questions where course_id = p_course;

  if v_passed then ct := private.issue_cert(auth.uid(), p_course, v_score); end if;
  return jsonb_build_object('score', v_score, 'passed', v_passed, 'left', v_left, 'pass', (cfg->>'pass')::int,
    'review', coalesce(v_review, '[]'::jsonb), 'certificate', case when v_passed then to_jsonb(ct) end);
end $$;

-- Cursos SIN examen: certificado al completar todas las lecciones
create or replace function public.complete_course(p_course text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ct public.certificates;
begin
  if (select exam_config from public.courses where id = p_course) is not null then raise exception 'Este curso requiere examen'; end if;
  if not private.lessons_done(auth.uid(), p_course) then raise exception 'Faltan lecciones'; end if;
  ct := private.issue_cert(auth.uid(), p_course, null);
  return to_jsonb(ct);
end $$;

-- Minutos de estudio (máximo 30 por llamada, para que no se puedan inflar)
create or replace function public.log_minutes(p_min numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active() or p_min is null or p_min <= 0 then return; end if;
  insert into public.activity (user_id, day, minutes) values (auth.uid(), (now() at time zone 'America/Argentina/Buenos_Aires')::date, least(p_min, 30))
    on conflict (user_id, day) do update set minutes = least(public.activity.minutes + least(excluded.minutes, 30), 1440);
end $$;

-- =============================================================================
-- FUNCIONES DE ADMINISTRACIÓN
-- =============================================================================
create or replace function public.admin_update_profile(p_user uuid, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  if p_user = auth.uid() and (p_data ? 'role' and p_data->>'role' <> 'admin' or p_data ? 'active' and not (p_data->>'active')::boolean) then
    raise exception 'No podés quitarte tu propio acceso de administrador';
  end if;
  update public.profiles set
    full_name = coalesce(p_data->>'full_name', full_name),
    company   = coalesce(p_data->>'company', company),
    area      = coalesce(p_data->>'area', area),
    role      = coalesce(p_data->>'role', role),
    active    = coalesce((p_data->>'active')::boolean, active)
  where id = p_user;
end $$;

-- Reemplaza el examen de un curso (configuración + preguntas) de forma atómica
create or replace function public.admin_set_exam(p_course text, p_config jsonb, p_questions jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  delete from public.exam_questions where course_id = p_course;
  if p_config is null then
    update public.courses set exam_config = null where id = p_course;
    return;
  end if;
  insert into public.exam_questions (course_id, idx, q, options, answer, explanation)
    select p_course, (x.ord - 1)::int, x.v->>'q', x.v->'o', (x.v->>'a')::int, coalesce(x.v->>'e', '')
      from jsonb_array_elements(p_questions) with ordinality x(v, ord);
  update public.courses set exam_config = p_config || jsonb_build_object('count', jsonb_array_length(p_questions)) where id = p_course;
end $$;

create or replace function public.admin_reset_attempts(p_user uuid, p_course text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  delete from public.exam_attempts where user_id = p_user and course_id = p_course;
  delete from private.exam_sessions where user_id = p_user and course_id = p_course;
end $$;

create or replace function public.admin_revoke_cert(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  update public.certificates set revoked = true where code = p_code;
  update public.enrollments set cert_code = null, completed_at = null where cert_code = p_code;
end $$;

-- Convierte una cuenta existente en administrador (usar UNA vez desde el SQL Editor)
create or replace function public.make_admin(p_email text) returns text
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set role = 'admin', active = true where lower(email) = lower(trim(p_email));
  if not found then return 'No existe un usuario con ese email: crealo primero en Authentication → Users'; end if;
  return 'Listo: ' || p_email || ' ahora es administrador';
end $$;

-- Permisos de ejecución
revoke execute on all functions in schema public from anon, public;
revoke execute on all functions in schema private from anon, authenticated, public;
grant execute on function public.login_email(text, text), public.check_access_code(text), public.username_available(text), public.verify_certificate(text) to anon, authenticated;
grant execute on function public.is_admin(), public.is_active(), public.start_exam(text), public.grade_exam(text, jsonb), public.complete_course(text),
  public.log_minutes(numeric), public.admin_update_profile(uuid, jsonb), public.admin_set_exam(text, jsonb, jsonb),
  public.admin_reset_attempts(uuid, text), public.admin_revoke_cert(text) to authenticated;
revoke execute on function public.make_admin(text) from authenticated;

-- =============================================================================
-- ALMACENAMIENTO: portadas (públicas) y materiales (privados, solo alumnos activos)
-- =============================================================================
insert into storage.buckets (id, name, public) values ('portadas', 'portadas', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('materiales', 'materiales', false) on conflict (id) do nothing;

drop policy if exists "portadas: admin sube" on storage.objects;
create policy "portadas: admin sube" on storage.objects for insert to authenticated with check (bucket_id = 'portadas' and public.is_admin());
drop policy if exists "portadas: admin borra" on storage.objects;
create policy "portadas: admin borra" on storage.objects for delete to authenticated using (bucket_id = 'portadas' and public.is_admin());
drop policy if exists "materiales: alumnos leen" on storage.objects;
create policy "materiales: alumnos leen" on storage.objects for select to authenticated using (bucket_id = 'materiales' and public.is_active());
drop policy if exists "materiales: admin sube" on storage.objects;
create policy "materiales: admin sube" on storage.objects for insert to authenticated with check (bucket_id = 'materiales' and public.is_admin());
drop policy if exists "materiales: admin borra" on storage.objects;
create policy "materiales: admin borra" on storage.objects for delete to authenticated using (bucket_id = 'materiales' and public.is_admin());

-- Fin del esquema.
