-- 03 · Permisos de la Data API (obligatorio desde el 30/10/2026)
-- Supabase ya no da acceso automático a las tablas nuevas de "public".
-- Esto devuelve los permisos que el campus tenía antes. Las filas siguen
-- protegidas por RLS (las 51 políticas de 01_esquema.sql): el GRANT abre la
-- tabla y RLS decide qué filas ve cada usuario.
-- Se puede ejecutar más de una vez sin problema.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to anon, authenticated;
grant all on all sequences in schema public to service_role;

grant execute on all functions in schema public to anon, authenticated, service_role;

-- que las tablas que se creen más adelante también tengan permisos
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

-- refrescar la API para que vea los cambios
notify pgrst, 'reload schema';
