-- ============================================================================
-- Panel Bielecka — schema completo con seguridad real por rol (Row Level Security)
-- Ejecutar UNA SOLA VEZ en Supabase: Project > SQL Editor > New query > pegar y correr.
-- ============================================================================
-- Diseño: todas las columnas de texto usan el mismo nombre (camelCase, entre
-- comillas) que ya usa la app en JavaScript, así no hace falta traducir campos
-- en ningún lado. Los "id" son texto (no uuid) porque la app los genera del
-- lado del cliente.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1) PROFILES — el equipo (reemplaza al viejo sistema de PIN)
-- ============================================================================
create table if not exists profiles (
  id text primary key,
  email text unique not null,
  name text,
  rol text,
  tipo text default 'Freelance', -- 'Socia' | 'Freelance'
  perfil text,                    -- 'CM' | 'Diseñador/Editor' | ''
  telefono text,
  ciudad text,
  pack text,
  "clientesAsignados" jsonb default '[]'::jsonb,
  notas text,
  created_at timestamptz default now()
);

-- Funciones auxiliares (SECURITY DEFINER = pueden leer profiles sin
-- disparar recursión de RLS sobre la propia tabla profiles)
create or replace function is_socia() returns boolean
language sql security definer set search_path = public stable as $$
  select exists(
    select 1 from profiles where email = auth.email() and tipo = 'Socia'
  );
$$;

create or replace function current_profile_id() returns text
language sql security definer set search_path = public stable as $$
  select id from profiles where email = auth.email() limit 1;
$$;

alter table profiles enable row level security;

create policy "profiles_select" on profiles for select
  using (is_socia() or email = auth.email());
create policy "profiles_insert" on profiles for insert
  with check (is_socia());
create policy "profiles_update" on profiles for update
  using (is_socia()) with check (is_socia());
create policy "profiles_delete" on profiles for delete
  using (is_socia());

-- Vista pública: nombre, rol y marcas asignadas — la ve TODO el equipo
-- (freelancers incluidos), sin mail/teléfono/pack/notas internas.
create or replace view profiles_public as
  select id, name, rol, tipo, perfil, "clientesAsignados" from profiles;
grant select on profiles_public to authenticated;

-- ============================================================================
-- 2) CLIENTS — marcas, con toda su información sensible (fee, notas, etc.)
-- ============================================================================
create table if not exists clients (
  id text primary key,
  name text,
  status text default 'Activo',
  servicios jsonb default '[]'::jsonb,
  pack text,
  fee text,
  "fechaInicio" text,
  contacto text,
  "trelloBoardLink" text,
  "driveFolderLink" text,
  "formsLink" text,
  "pinterestLink" text,
  notas text,
  asignaciones jsonb default '[]'::jsonb
);

-- Por si ya habías corrido una versión anterior de este script sin esta columna:
alter table clients add column if not exists asignaciones jsonb default '[]'::jsonb;

alter table clients enable row level security;

create policy "clients_all_socia" on clients for all
  using (is_socia()) with check (is_socia());

-- Vista pública: solo id + nombre + estado — la usan los freelancers.
create or replace view clients_public as
  select id, name, status from clients;
grant select on clients_public to authenticated;

-- ============================================================================
-- 3) PROCESOS — historial/pendientes por marca (tabla real para poder
--    filtrar fila por fila según quién pregunta)
-- ============================================================================
create table if not exists procesos (
  id text primary key,
  "clientId" text,
  texto text,
  responsable text,
  "fechaLimite" text,
  link text,
  "estadoProduccion" text,
  estado text default 'Pendiente',
  autor text,
  fecha text
);

alter table procesos enable row level security;

create policy "procesos_select" on procesos for select
  using (is_socia() or responsable = current_profile_id());
create policy "procesos_insert" on procesos for insert
  with check (is_socia());
create policy "procesos_update" on procesos for update
  using (is_socia() or responsable = current_profile_id())
  with check (is_socia() or responsable = current_profile_id());
create policy "procesos_delete" on procesos for delete
  using (is_socia());

-- ============================================================================
-- 4) NOTAS — 'equipo' visible a todos, 'directivas' solo Socias
-- ============================================================================
create table if not exists notas (
  id text primary key,
  autor text,
  contenido text,
  categoria text default 'equipo',
  resuelto boolean default false,
  fecha text
);

alter table notas enable row level security;

create policy "notas_select" on notas for select
  using (categoria = 'equipo' or is_socia());
create policy "notas_insert" on notas for insert
  with check (categoria = 'equipo' or is_socia());
create policy "notas_update" on notas for update
  using (categoria = 'equipo' or is_socia())
  with check (categoria = 'equipo' or is_socia());
create policy "notas_delete" on notas for delete
  using (categoria = 'equipo' or is_socia());

-- ============================================================================
-- 5) ACTIVIDAD — misma lógica que notas, con 'visibilidad'
-- ============================================================================
create table if not exists actividad (
  id text primary key,
  autor text,
  tipo text,
  "clientId" text,
  texto text,
  "meetLink" text,
  visibilidad text default 'equipo',
  fecha text
);

alter table actividad enable row level security;

create policy "actividad_select" on actividad for select
  using (visibilidad = 'equipo' or is_socia());
create policy "actividad_insert" on actividad for insert
  with check (visibilidad = 'equipo' or is_socia());
create policy "actividad_delete" on actividad for delete
  using (visibilidad = 'equipo' or is_socia());

-- ============================================================================
-- 6) MÉTRICAS, MENSAJES, BRIEFS — exclusivos del equipo directivo
-- ============================================================================
create table if not exists metrics (
  id text primary key,
  "clientId" text,
  periodo text,
  alcance text,
  visualizaciones text,
  interacciones text,
  crecimiento text,
  notas text
);
alter table metrics enable row level security;
create policy "metrics_all_socia" on metrics for all
  using (is_socia()) with check (is_socia());

create table if not exists mensajes (
  id text primary key,
  titulo text,
  texto text
);
alter table mensajes enable row level security;
create policy "mensajes_all_socia" on mensajes for all
  using (is_socia()) with check (is_socia());

create table if not exists briefs (
  id text primary key,
  titulo text,
  link text
);
alter table briefs enable row level security;
create policy "briefs_all_socia" on briefs for all
  using (is_socia()) with check (is_socia());

-- ============================================================================
-- 7) Equipo directivo real
-- ============================================================================
insert into profiles (id, email, name, rol, tipo, telefono)
values
  ('carol-bielecki', 'hola.bielecka@gmail.com', 'Carol Bielecki', 'Estrategia Digital / Founder y CEO', 'Socia', '+54 9 11 4091-0258'),
  ('merlina-apesteguia', 'mermediaart@gmail.com', 'Merlina Apesteguía', 'Directora creativa y multimedial / Founding creative partner', 'Socia', '+54 9 11 2373-3399'),
  ('glenda-bielecki', 'social.bielecka@gmail.com', 'Glenda Bielecki', 'Gestión comercial ejecutiva / Co-Founder y Business manager', 'Socia', '+54 9 11 6466-5669')
on conflict (email) do nothing;

-- ============================================================================
-- 8) Marcas, con su equipo asignado por tipo de pieza
-- ============================================================================
insert into clients (id, name, status, pack, fee, asignaciones)
values
  ('bulonera-meet', 'Bulonera Meet', 'Activo', 'inicial', '300000', '[
    {"id":"bul-1","tipo":"CM","cantidad":"","responsable":"Anahid"},
    {"id":"bul-2","tipo":"Reels","cantidad":"3","responsable":"Carol"},
    {"id":"bul-3","tipo":"Carruseles","cantidad":"2","responsable":"Carol"},
    {"id":"bul-4","tipo":"Single Post","cantidad":"2","responsable":"Carol"},
    {"id":"bul-5","tipo":"Storys","cantidad":"6","responsable":"Carol"}
  ]'::jsonb),
  ('unakita', 'Unakita', 'Activo', '', '', '[
    {"id":"una-1","tipo":"CM","cantidad":"","responsable":"Carol"},
    {"id":"una-2","tipo":"Reels","cantidad":"3","responsable":"Joaquín Gil"},
    {"id":"una-3","tipo":"Carruseles","cantidad":"2","responsable":"Francini"},
    {"id":"una-4","tipo":"Single Post","cantidad":"2","responsable":"Francini"},
    {"id":"una-5","tipo":"Storys","cantidad":"6","responsable":"Francini"}
  ]'::jsonb),
  ('vow-streaming', 'Vow Streaming', 'Activo', '', '', '[
    {"id":"vow-1","tipo":"CM","cantidad":"","responsable":"Anahid"},
    {"id":"vow-2","tipo":"Reels","cantidad":"3","responsable":"Joaquín Gil"},
    {"id":"vow-3","tipo":"Carruseles","cantidad":"2","responsable":"Carol"},
    {"id":"vow-4","tipo":"Single Post","cantidad":"2","responsable":"Carol"},
    {"id":"vow-5","tipo":"Storys","cantidad":"6","responsable":"Carol"}
  ]'::jsonb),
  ('florencia-martelli', 'Florencia Martelli', 'Activo', '', '', '[
    {"id":"flo-1","tipo":"CM","cantidad":"","responsable":"Carol"},
    {"id":"flo-2","tipo":"Reels","cantidad":"3","responsable":"Joaquín Gil"},
    {"id":"flo-3","tipo":"Carruseles","cantidad":"2","responsable":"Francini"},
    {"id":"flo-4","tipo":"Single Post","cantidad":"2","responsable":"Francini"},
    {"id":"flo-5","tipo":"Storys","cantidad":"6","responsable":"Francini"}
  ]'::jsonb),
  ('descaradas', 'Descaradas', 'Activo', '', '', '[
    {"id":"des-1","tipo":"Diseños de post","cantidad":"8","responsable":"Merlina"},
    {"id":"des-2","tipo":"Storys","cantidad":"6","responsable":"Merlina"},
    {"id":"des-3","tipo":"Reels","cantidad":"8","responsable":"Merlina"},
    {"id":"des-4","tipo":"CM y estrategia","cantidad":"","responsable":"Carol"},
    {"id":"des-5","tipo":"Gestión","cantidad":"","responsable":"Glenda"}
  ]'::jsonb),
  ('bielecka-agencia', 'Bielecka', 'Activo', '', '', '[
    {"id":"bie-1","tipo":"CM","cantidad":"","responsable":"Anahid"},
    {"id":"bie-2","tipo":"Diseño","cantidad":"","responsable":"Francini"},
    {"id":"bie-3","tipo":"Reels","cantidad":"","responsable":"Merlina"},
    {"id":"bie-4","tipo":"Estrategia","cantidad":"","responsable":"Carol"},
    {"id":"bie-5","tipo":"Gestión","cantidad":"","responsable":"Glenda"}
  ]'::jsonb),
  ('expertos-prepagas', 'Expertos en prepagas | Rodrigo', 'Activo', '', '', '[]'::jsonb),
  ('dental-pro', 'Dental Pro', 'Activo', 'personalizado', '220000', '[]'::jsonb)
on conflict (id) do nothing;

-- Nota: Anahid, Joaquín Gil y Francini están cargados acá solo como texto
-- (para que se vea a quién le corresponde cada pieza), no como logins todavía.
-- Cuando tengas su email, agregalos como integrantes reales desde
-- Equipo → Agregar integrante para que puedan entrar al panel.

-- ============================================================================
-- 9) RESERVAS — turnos pedidos desde la página pública de reserva (sin login)
-- ============================================================================
create table if not exists reservas (
  id text primary key,
  nombre text,
  marca text,
  email text,
  fecha text,
  hora text,
  estado text default 'Pendiente',
  creado text
);
alter table reservas enable row level security;

-- Cualquiera (sin login) puede CREAR una reserva desde la página pública.
create policy "reservas_insert_publico" on reservas for insert
  to anon
  with check (true);

-- Solo Directoras pueden ver, editar o borrar las reservas ya cargadas.
create policy "reservas_select_socia" on reservas for select
  using (is_socia());
create policy "reservas_update_socia" on reservas for update
  using (is_socia()) with check (is_socia());
create policy "reservas_delete_socia" on reservas for delete
  using (is_socia());

-- ============================================================================
-- 10) AGENDA_BLOQUES — agenda personal privada de cada Directora
-- ============================================================================
create table if not exists agenda_bloques (
  id text primary key,
  "directoraId" text,
  texto text,
  fecha text
);
alter table agenda_bloques enable row level security;

-- Cada Directora solo ve y gestiona sus propios bloques — ni siquiera otra
-- Directora puede leerlos directamente de la tabla.
create policy "agenda_bloques_own" on agenda_bloques for all
  using ("directoraId" = current_profile_id())
  with check ("directoraId" = current_profile_id());

-- Función aparte, de solo lectura: devuelve fecha + quién a CUALQUIER Directora,
-- pero nunca el campo "texto" (el motivo del bloque queda siempre privado).
-- security definer = puede leer todas las filas para armar la respuesta, pero
-- ella misma filtra con is_socia() para que solo el equipo directivo la use.
create or replace function agenda_ocupados()
returns table(id text, "directoraId" text, fecha text)
language sql security definer set search_path = public stable as $$
  select id, "directoraId", fecha from agenda_bloques where is_socia();
$$;
grant execute on function agenda_ocupados() to authenticated;


-- ============================================================================
-- 10) CONTROL DE CALIDAD — flujo de aprobación antes de "Enviado"
--     (autocontenida e idempotente: se puede correr sola en un proyecto ya creado)
--
--  Valores de procesos.estado:
--    'Pendiente'      → trabajo en curso (valor original)
--    'pending_review' → Pendiente de revisión (enviado a la Directora)
--    'adjusted'       → Ajustado (la Directora pidió cambios; se corrige y se reenvía)
--    'approved'       → Aprobado por la Directora
--    'Resuelto'       → Enviado (solo se llega desde 'approved')
--
--  Flujo permitido:
--    Pendiente | adjusted → pending_review   (checklist completo; responsable o Directora)
--    pending_review       → approved | adjusted   (SOLO Directora)
--    approved             → Resuelto         (responsable o Directora)
--    cualquiera           → Pendiente        (SOLO Directora: reabrir, limpia aprobación)
--
--  Se valida con un trigger (no solo en la interfaz) porque las freelancers
--  pueden hacer UPDATE de sus filas vía RLS: sin esto, bastaría abrir las
--  herramientas del navegador para saltarse la aprobación.
-- ============================================================================
alter table procesos add column if not exists quality_checklist jsonb;
alter table procesos add column if not exists "aprobadoPor" text;
alter table procesos add column if not exists "aprobadoFecha" text;

alter table procesos drop constraint if exists procesos_estado_check;
alter table procesos add constraint procesos_estado_check
  check (estado is null or estado in ('Pendiente', 'pending_review', 'adjusted', 'approved', 'Resuelto'));

-- Ítems obligatorios del "espíritu de Bielecka". Si cambiás la lista, cambiá
-- también CHECKLIST_BIELECKA en src/App.jsx (mismos ids).
create or replace function checklist_bielecka_completo(c jsonb)
returns boolean language sql immutable as $$
  select c is not null
     and jsonb_typeof(c) = 'object'
     and c ?& array['tono','brief','revision']
     and not exists (
       select 1 from jsonb_each(c) e
       where e.key in ('tono','brief','revision')
         and e.value is distinct from 'true'::jsonb
     );
$$;

create or replace function procesos_flujo_aprobacion()
returns trigger language plpgsql as $$
declare
  socia boolean;
begin
  -- Service role / SQL editor (sin sesión de usuario): confiable, sin validación.
  if auth.uid() is null then
    return new;
  end if;
  socia := is_socia();

  if tg_op = 'INSERT' then
    new.estado := coalesce(new.estado, 'Pendiente');
    if new.estado <> 'Pendiente' then
      raise exception 'Una tarea nueva debe empezar en Pendiente';
    end if;
    return new;
  end if;

  -- Los datos de aprobación solo los escribe el flujo de la Directora.
  if not socia then
    new."aprobadoPor" := old."aprobadoPor";
    new."aprobadoFecha" := old."aprobadoFecha";
  end if;

  if new.estado is not distinct from old.estado then
    if not socia
       and old.estado in ('pending_review', 'approved', 'Resuelto')
       and new.quality_checklist is distinct from old.quality_checklist then
      raise exception 'El checklist no se puede modificar una vez enviado a revisión';
    end if;
    return new;
  end if;

  if old.estado in ('Pendiente', 'adjusted') and new.estado = 'pending_review' then
    if not checklist_bielecka_completo(new.quality_checklist) then
      raise exception 'Completá todo el checklist de calidad antes de enviar a revisión';
    end if;
    new."aprobadoPor" := null;
    new."aprobadoFecha" := null;

  elsif old.estado = 'pending_review' and new.estado in ('approved', 'adjusted') then
    if not socia then
      raise exception 'Solo la Directora puede aprobar o pedir ajustes';
    end if;
    if new.estado = 'approved' then
      new."aprobadoPor" := current_profile_id();
      new."aprobadoFecha" := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    else
      new."aprobadoPor" := null;
      new."aprobadoFecha" := null;
    end if;

  elsif old.estado = 'approved' and new.estado = 'Resuelto' then
    if old."aprobadoPor" is null then
      raise exception 'No se puede marcar como Enviado sin aprobación de la Directora';
    end if;

  elsif new.estado = 'Pendiente' then
    if not socia then
      raise exception 'Solo la Directora puede reabrir una tarea';
    end if;
    new.quality_checklist := null;
    new."aprobadoPor" := null;
    new."aprobadoFecha" := null;

  else
    raise exception 'Transición de estado no permitida: % → %', old.estado, new.estado;
  end if;

  return new;
end;
$$;

drop trigger if exists procesos_flujo_aprobacion_trg on procesos;
create trigger procesos_flujo_aprobacion_trg
  before insert or update on procesos
  for each row execute function procesos_flujo_aprobacion();

-- ============================================================================
-- 11) AUDITORÍAS DE CUENTA — revisión periódica por cliente (solo directoras)
--     (autocontenida e idempotente)
-- ============================================================================
create table if not exists account_audits (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references clients(id) on delete cascade,
  audit_date date not null default current_date,
  completed_tasks integer not null default 0 check (completed_tasks >= 0),
  pending_tasks integer not null default 0 check (pending_tasks >= 0),
  deviations_notes text,
  profitability_score numeric(2,1) check (profitability_score between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists account_audits_client_date_idx
  on account_audits (client_id, audit_date desc);

alter table account_audits enable row level security;

drop policy if exists "account_audits_all_socia" on account_audits;
create policy "account_audits_all_socia" on account_audits for all
  using (is_socia()) with check (is_socia());

-- ============================================================================
-- 12) LÍDER DE CUENTA + EJECUTOR — permisos y asignaciones
--     (autocontenida e idempotente; es aditiva, así que se puede correr ANTES
--     de publicar el front nuevo sin romper el actual)
--
--  clients.account_lead_id → líder/a de la cuenta (la ve junto con sus tareas de coordinación)
--  procesos.executor_id    → quien ejecuta la tarea. Reemplaza a "responsable":
--                            se copia el valor existente y un trigger mantiene
--                            ambas columnas iguales mientras convivan.
--
--  Visibilidad de las freelancers (se aplica en la base, no solo en la interfaz):
--    · tareas  → solo donde executor_id = ellas
--    · cuentas → solo donde son ejecutoras de al menos una tarea o líder de cuenta
--    · profiles_public → solo muestra las marcas que ellas mismas pueden ver
--  Las directoras (is_socia) ven todo.
-- ============================================================================
alter table clients add column if not exists account_lead_id text references profiles(id) on delete set null;
alter table procesos add column if not exists executor_id text references profiles(id) on delete set null;

update procesos p set executor_id = p.responsable
 where p.executor_id is null and p.responsable is not null
   and exists (select 1 from profiles pr where pr.id = p.responsable);

create index if not exists procesos_executor_idx on procesos (executor_id);
create index if not exists clients_account_lead_idx on clients (account_lead_id);

create or replace function procesos_sync_executor()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.executor_id is null then new.executor_id := new.responsable;
    else new.responsable := new.executor_id; end if;
  else
    if new.executor_id is distinct from old.executor_id then new.responsable := new.executor_id;
    elsif new.responsable is distinct from old.responsable then new.executor_id := new.responsable;
    end if;
  end if;
  return new;
end;
$$;

-- El prefijo "a_" hace que corra antes que procesos_flujo_aprobacion_trg (orden alfabético).
drop trigger if exists procesos_a_sync_executor_trg on procesos;
create trigger procesos_a_sync_executor_trg
  before insert or update on procesos
  for each row execute function procesos_sync_executor();

drop policy if exists "procesos_select" on procesos;
create policy "procesos_select" on procesos for select
  using (is_socia() or executor_id = current_profile_id());
drop policy if exists "procesos_update" on procesos;
create policy "procesos_update" on procesos for update
  using (is_socia() or executor_id = current_profile_id())
  with check (is_socia() or executor_id = current_profile_id());

create or replace view clients_public as
  select c.id, c.name, c.status, c.account_lead_id
  from clients c
  where is_socia()
     or c.account_lead_id = current_profile_id()
     or exists (select 1 from procesos p
                where p."clientId" = c.id and p.executor_id = current_profile_id());
grant select on clients_public to authenticated;

create or replace view profiles_public as
  select id, name, rol, tipo, perfil,
         case when is_socia() then "clientesAsignados"
              else coalesce((select jsonb_agg(x) from jsonb_array_elements("clientesAsignados") x
                             where (x #>> '{}') in (select id from clients_public)), '[]'::jsonb)
         end as "clientesAsignados"
  from profiles;
grant select on profiles_public to authenticated;

-- ============================================================================
-- 13) HILO DE COMENTARIOS POR TAREA — task_comments
--     (autocontenida e idempotente)
--  Lo ven y escriben las directoras y quien ejecuta la tarea (la visibilidad de
--  procesos ya está filtrada por RLS, así que el comentario hereda ese filtro).
--  Los comentarios no se editan; se borran solo su autora o una directora.
-- ============================================================================
create table if not exists task_comments (
  id text primary key,
  task_id text not null references procesos(id) on delete cascade,
  author_id text references profiles(id) on delete set null,
  author_name text,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_idx on task_comments (task_id, created_at);

alter table task_comments enable row level security;

drop policy if exists "task_comments_select" on task_comments;
create policy "task_comments_select" on task_comments for select
  using (is_socia() or exists (
    select 1 from procesos p where p.id = task_comments.task_id and p.executor_id = current_profile_id()
  ));

drop policy if exists "task_comments_insert" on task_comments;
create policy "task_comments_insert" on task_comments for insert
  with check (
    author_id = current_profile_id()
    and (is_socia() or exists (
      select 1 from procesos p where p.id = task_comments.task_id and p.executor_id = current_profile_id()
    ))
  );

drop policy if exists "task_comments_delete" on task_comments;
create policy "task_comments_delete" on task_comments for delete
  using (is_socia() or author_id = current_profile_id());
