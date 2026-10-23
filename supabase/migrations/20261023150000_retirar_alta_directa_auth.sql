-- =====================================================================
-- Retira el alta/cambio de contraseña escribiendo directamente en auth.users
-- y auth.identities. Sustituido por la API de administración de Supabase
-- (invitación por email). Aplicar SOLO tras comprobar que la invitación funciona.
-- No borra usuarios, perfiles ni roles.
-- =====================================================================
drop function if exists admin_crear_usuario(text, text, text, text, boolean);
drop function if exists admin_cambiar_password(uuid, text);
