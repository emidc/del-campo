-- T-0053 — Interlocutores del siniestro (C6, pieza que pide el recorrido R6).
--
-- Un siniestro habla con varias personas a la vez: el cliente, la compañía, el perito, el
-- taller, el liquidador, un abogado. Cada interlocutor tiene un rol, un nombre y un dato
-- de contacto libres, un responsable interno, la fecha del último contacto y lo que está
-- pendiente con él. Sin pendiente, no hace falta intervenir.
--
-- El interlocutor no es una Party: es un dato de trabajo de la gestión, como un requisito.
-- Las altas, los contactos y los cambios quedan en la historia (evento INTERLOCUTOR).
--
-- Acceso, igual que los requisitos (0015): se ve y se escribe si se ve la gestión. El
-- responsable interno tiene que ver al cliente.

create table service_case_contact (
  id uuid primary key default gen_random_uuid(),
  service_case_id uuid not null references service_case (id),
  role text not null
    check (role in ('CLIENTE', 'COMPANIA', 'PERITO', 'TALLER', 'LIQUIDADOR', 'ABOGADO', 'TERCERO', 'OTRO')),
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  contact text check (length(contact) <= 200),
  assigned_user_id uuid references app_user (id),
  last_contact_on date,
  pending text check (length(pending) <= 300),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default now()
);

create index service_case_contact_case_idx on service_case_contact (service_case_id, created_at);

-- Sólo un siniestro tiene interlocutores.
create function siniestro_interlocutor_de_siniestro() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from service_case c where c.id = new.service_case_id and c.kind = 'SINIESTRO'
  ) then
    raise exception 'sólo un siniestro tiene interlocutores';
  end if;
  return new;
end;
$$;

create trigger siniestro_interlocutor_de_siniestro
  before insert on service_case_contact
  for each row execute function siniestro_interlocutor_de_siniestro();

alter table service_case_event drop constraint service_case_event_kind_check;
alter table service_case_event add constraint service_case_event_kind_check
  check (kind in ('ALTA', 'NOTA', 'ESTADO', 'CIERRE', 'ASIGNACION', 'ETAPA', 'REQUISITO', 'PROPUESTA', 'INTERLOCUTOR'));

alter table service_case_contact enable row level security;
grant select, insert on service_case_contact to broker_app;
grant update (contact, assigned_user_id, last_contact_on, pending, updated_at) on service_case_contact to broker_app;

create policy service_case_contact_leer on service_case_contact for select to broker_app
  using (exists (select 1 from service_case c where c.id = service_case_id));
create policy service_case_contact_crear on service_case_contact for insert to broker_app
  with check (
    exists (select 1 from service_case c where c.id = service_case_id)
    and (assigned_user_id is null or assigned_user_id in (
      select i.id from service_case c, authz.integrantes_que_ven(c.party_id) i where c.id = service_case_id))
  );
create policy service_case_contact_actualizar on service_case_contact for update to broker_app
  using (exists (select 1 from service_case c where c.id = service_case_id))
  with check (
    assigned_user_id is null or assigned_user_id in (
      select i.id from service_case c, authz.integrantes_que_ven(c.party_id) i where c.id = service_case_id)
  );
