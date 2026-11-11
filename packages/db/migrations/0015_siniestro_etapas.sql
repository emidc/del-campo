-- T-0050 — Siniestros por etapas (C6-02a).
--
-- Un siniestro es una gestión de tipo SINIESTRO con una etapa: Denuncia, Documentación,
-- Inspección o peritaje, Liquidación, Pago o rechazo y Cierre. Cada etapa tiene requisitos;
-- no se avanza a la siguiente con requisitos pendientes. Se puede volver una etapa atrás.
-- Cada avance y cada requisito cumplido quedan en la historia (eventos ETAPA y REQUISITO).
-- Los requisitos de fábrica se crean con el siniestro; se pueden agregar otros.

alter table service_case add column claim_stage text
  check (claim_stage in ('DENUNCIA', 'DOCUMENTACION', 'INSPECCION', 'LIQUIDACION', 'PAGO', 'CIERRE'));

create table service_case_requirement (
  id uuid primary key default gen_random_uuid(),
  service_case_id uuid not null references service_case (id),
  stage text not null
    check (stage in ('DENUNCIA', 'DOCUMENTACION', 'INSPECCION', 'LIQUIDACION', 'PAGO', 'CIERRE')),
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  position integer not null default 100,
  done_at timestamptz,
  done_by_user_id uuid references app_user (id),
  created_at timestamptz not null default clock_timestamp(),
  constraint service_case_requirement_cumplido check ((done_at is null) = (done_by_user_id is null))
);

create index service_case_requirement_case_idx on service_case_requirement (service_case_id, stage, position);

create function siniestro_orden(etapa text) returns integer
language sql immutable
set search_path = public, pg_temp
as $$
  select array_position(
    array['DENUNCIA', 'DOCUMENTACION', 'INSPECCION', 'LIQUIDACION', 'PAGO', 'CIERRE'], etapa)
$$;

-- Un siniestro nace en Denuncia; las demás gestiones no tienen etapa.
create function siniestro_etapa_inicial() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.kind = 'SINIESTRO' then
    new.claim_stage := coalesce(new.claim_stage, 'DENUNCIA');
  elsif new.claim_stage is not null then
    raise exception 'sólo un siniestro tiene etapa';
  end if;
  return new;
end;
$$;

create trigger siniestro_etapa_inicial
  before insert on service_case
  for each row execute function siniestro_etapa_inicial();

-- Los requisitos de fábrica. Corre con los permisos de quien crea el siniestro: RLS aplica.
create function siniestro_requisitos_de_fabrica() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.kind = 'SINIESTRO' then
    insert into service_case_requirement (service_case_id, stage, name, position)
    values
      (new.id, 'DENUNCIA', 'Denuncia presentada a la compañía', 1),
      (new.id, 'DOCUMENTACION', 'Fotos o constancias del daño', 1),
      (new.id, 'DOCUMENTACION', 'Presupuesto o detalle de daños', 2),
      (new.id, 'INSPECCION', 'Inspección o peritaje realizado', 1),
      (new.id, 'LIQUIDACION', 'Propuesta de liquidación aceptada', 1),
      (new.id, 'PAGO', 'Pago o rechazo registrado', 1);
  end if;
  return null;
end;
$$;

create trigger siniestro_requisitos_de_fabrica
  after insert on service_case
  for each row execute function siniestro_requisitos_de_fabrica();

-- Avanzar es de a una etapa y con los requisitos de la actual cumplidos; volver, de a una.
create function siniestro_cambio_de_etapa() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  pendientes text;
begin
  if new.claim_stage is not distinct from old.claim_stage then
    return new;
  end if;
  if old.claim_stage is null or new.claim_stage is null then
    raise exception 'sólo un siniestro tiene etapa, y no se le quita';
  end if;
  if siniestro_orden(new.claim_stage) = siniestro_orden(old.claim_stage) + 1 then
    select string_agg(r.name, ', ' order by r.position, r.created_at) into pendientes
    from service_case_requirement r
    where r.service_case_id = new.id and r.stage = old.claim_stage and r.done_at is null;
    if pendientes is not null then
      raise exception 'no se puede avanzar: falta %', pendientes;
    end if;
  elsif siniestro_orden(new.claim_stage) <> siniestro_orden(old.claim_stage) - 1 then
    raise exception 'un siniestro avanza o vuelve de a una etapa';
  end if;
  return new;
end;
$$;

create trigger siniestro_cambio_de_etapa
  before update of claim_stage on service_case
  for each row execute function siniestro_cambio_de_etapa();

-- Los siniestros que ya existían arrancan en Denuncia, con sus requisitos.
update service_case set claim_stage = 'DENUNCIA' where kind = 'SINIESTRO';
insert into service_case_requirement (service_case_id, stage, name, position)
select c.id, r.stage, r.name, r.position
from service_case c
cross join (values
  ('DENUNCIA', 'Denuncia presentada a la compañía', 1),
  ('DOCUMENTACION', 'Fotos o constancias del daño', 1),
  ('DOCUMENTACION', 'Presupuesto o detalle de daños', 2),
  ('INSPECCION', 'Inspección o peritaje realizado', 1),
  ('LIQUIDACION', 'Propuesta de liquidación aceptada', 1),
  ('PAGO', 'Pago o rechazo registrado', 1)
) as r (stage, name, position)
where c.kind = 'SINIESTRO';

alter table service_case add constraint service_case_siniestro_con_etapa
  check ((kind = 'SINIESTRO') = (claim_stage is not null));

alter table service_case_event drop constraint service_case_event_kind_check;
alter table service_case_event add constraint service_case_event_kind_check
  check (kind in ('ALTA', 'NOTA', 'ESTADO', 'CIERRE', 'ASIGNACION', 'ETAPA', 'REQUISITO'));

alter table service_case_requirement enable row level security;
grant select, insert on service_case_requirement to broker_app;
grant update (done_at, done_by_user_id) on service_case_requirement to broker_app;
grant update (claim_stage) on service_case to broker_app;

create policy service_case_requirement_leer on service_case_requirement for select to broker_app
  using (exists (select 1 from service_case c where c.id = service_case_id));
create policy service_case_requirement_crear on service_case_requirement for insert to broker_app
  with check (done_at is null and exists (select 1 from service_case c where c.id = service_case_id));
create policy service_case_requirement_cumplir on service_case_requirement for update to broker_app
  using (exists (select 1 from service_case c where c.id = service_case_id))
  with check (done_by_user_id is null or done_by_user_id = (select authz.usuario()));
