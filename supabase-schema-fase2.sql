-- ============================================================================
-- Panel Bielecka — FASE 2 (v2): auditoría por marca y por persona
-- Ejecutar en Supabase SQL Editor DESPUÉS de supabase-schema.sql.
-- Si ya habías corrido la v1 de este archivo (con stories_log/whatsapp_queue),
-- este script la reemplaza: borra lo de Stories y renombra la cola a mail.
-- ============================================================================

-- Por si ya existía la versión anterior con el módulo de Stories:
drop table if exists stories_log;
drop table if exists whatsapp_queue;

-- ============================================================================
-- 1) PROFILES — se extiende con fecha de inicio y contrato individual
--    (no se crea una tabla "team_members" nueva: profiles YA es la tabla de
--    equipo, ligada al login real. Duplicarla rompería el login y los RLS.)
-- ============================================================================
alter table profiles add column if not exists "fechaInicio" text;
-- contratoTipo: 'formato' (cuotas por tipo de pieza, ej. Joaquín: 9 Reels)
--            o 'total'   (cuota total de piezas sin importar el tipo, ej. Francini: 50 piezas)
alter table profiles add column if not exists "contratoTipo" text;
-- contratoDetalle jsonb: {"Reels": 9} o {"total": 50}
alter table profiles add column if not exists "contratoDetalle" jsonb default '{}'::jsonb;

-- Vista de compatibilidad "team_members": mismos campos que pediste
-- (id, name, role, email, start_date, created_at), pero leyendo en vivo de
-- "profiles" — una sola fuente de verdad, cero riesgo de desincronizar el login.
-- Hereda automáticamente las políticas de seguridad de "profiles" (las vistas
-- corren con los permisos de quien las creó, así que quedan protegidas igual).
create or replace view team_members as
  select
    id,
    name,
    rol as role,
    email,
    "fechaInicio" as start_date,
    created_at
  from profiles;

-- ============================================================================
-- 2) CLIENTS.ASIGNACIONES — ES el mapeo de "CONFIG_MARCAS" (roles + metas
--    contractuales por formato, por marca). No se crea "brand_configs" aparte
--    para no tener dos fuentes de verdad. Estructura de cada elemento del
--    array jsonb (ejemplo real, así quedaría cargado Unakita):
--
--    client.asignaciones = [
--      {"id":"una-1","tipo":"CM","cantidad":"","responsable":"Carol"},
--      {"id":"una-2","tipo":"Reels","cantidad":"3","responsable":"Joaquín Gil"},
--      {"id":"una-3","tipo":"Carruseles","cantidad":"2","responsable":"Francini"}
--    ]
--
-- "tipo" es el formato (matcheado por normalizarFormato() en el Edge Function),
-- "cantidad" es la meta mensual para ESA marca y ESA persona, "responsable" es
-- el nombre a normalizar/matchear contra profiles.name.
-- ============================================================================


-- ============================================================================
-- 3) CONTENT_CARDS — espejo de tarjetas de Trello relevantes, ahora también
--    con quién la hizo (para los balances individuales) y filtro de fecha.
-- ============================================================================
create table if not exists content_cards (
  id text primary key,
  "clientId" text,
  titulo text,
  tipo text,                        -- 'Estrategia' | 'Reel' | 'Story' | 'Carrusel' | 'Single Post' | 'Pieza Gráfica' | 'Otro'
  columna text,                     -- 'Revisión Interna' | 'Revisión Cliente' | 'Otra'
  "fechaEntradaColumna" timestamptz,
  "fechaCreacionTrello" timestamptz, -- fecha real de la tarjeta en Trello, para el filtro de incorporación
  "cmAsignadaId" text,               -- profile.id de la CM (revisiones de estrategia/contenido)
  "asignadoId" text,                 -- profile.id de quien hizo la pieza (editor/diseñador), resuelto por nombre contra "asignaciones"
  "trelloUrl" text,
  "boardName" text,
  actualizado timestamptz default now()
);
alter table content_cards enable row level security;
create policy "content_cards_select" on content_cards for select
  using (is_socia() or "asignadoId" = current_profile_id());
create policy "content_cards_write_socia" on content_cards for all
  using (is_socia()) with check (is_socia());
-- El service role (Edge Functions) ignora RLS.

-- ============================================================================
-- 4) IN_APP_NOTIFICATIONS — pop-ups/banners en Inicio + registro de qué mail
--    ya se mandó (evita duplicados)
-- ============================================================================
create table if not exists in_app_notifications (
  id text primary key,
  "destinatarioId" text,     -- profile.id
  "destinatarioEmail" text,
  mensaje text,
  motivo text,                -- 'revision_interna_24h' | 'revision_cliente_24h' | 'estrategia_mes' | 'onboarding'
  "clientId" text,
  "cardId" text,
  leida boolean default false,
  "emailEnviado" boolean default false,
  creado timestamptz default now()
);
alter table in_app_notifications enable row level security;
create policy "in_app_notifications_select" on in_app_notifications for select
  using ("destinatarioId" = current_profile_id() or is_socia());
create policy "in_app_notifications_update" on in_app_notifications for update
  using ("destinatarioId" = current_profile_id() or is_socia())
  with check ("destinatarioId" = current_profile_id() or is_socia());
-- Solo el service role inserta (desde los Edge Functions).

-- ============================================================================
-- 5) FEEDBACK_FREELANCER — fichas de feedback (ya existía, se mantiene)
-- ============================================================================
create table if not exists feedback_freelancer (
  id text primary key,
  "freelancerId" text,
  autor text,
  texto text,
  fecha timestamptz default now()
);
alter table feedback_freelancer enable row level security;
create policy "feedback_freelancer_all_socia" on feedback_freelancer for all
  using (is_socia()) with check (is_socia());

-- ============================================================================
-- 6) pg_cron — dispara check-overdue cada hora (reemplazá URL y service key)
-- ============================================================================
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'bielecka-check-overdue-hourly',
--   '0 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://TU-PROYECTO.supabase.co/functions/v1/check-overdue',
--     headers := jsonb_build_object('Authorization', 'Bearer TU_SERVICE_ROLE_KEY', 'Content-Type', 'application/json')
--   );
--   $$
-- );
