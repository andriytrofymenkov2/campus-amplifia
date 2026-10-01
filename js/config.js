/* =========================================================================
   CONFIGURACIÓN DEL CAMPUS
   - mode "demo": funciona sin servidor, con datos de ejemplo en el navegador.
   - mode "supabase": usuarios, contraseñas y progreso reales (ver docs/SUPABASE.md).
   La "anon key" de Supabase es pública por diseño: la seguridad la dan las
   políticas RLS de la base. NUNCA poner acá la "service_role key".
   ========================================================================= */
export const CONFIG = {
  mode: "supabase",
  supabaseUrl: "https://cugslwscvistvhlueiua.supabase.co",
  supabaseAnonKey: "sb_publishable_b1zelKsE2P9C2QIe4xWmew_1zofKTkz",

  /* Dirección pública del campus (para enlaces de certificados y correos) */
  siteUrl: "https://campus.grupoamplifia.com",

  /* Canal de YouTube de Amplifia (transmisiones y grabaciones). Vacío = no se muestra */
  youtubeChannel: "",

  supportWhatsApp: "5491133278023",
  supportEmail: "grupoamplifia@gmail.com",
};
