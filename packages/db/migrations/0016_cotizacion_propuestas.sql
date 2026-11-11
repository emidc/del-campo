-- T-0051 — Cotizaciones (C6-02c).
--
-- Una cotización es una gestión de tipo COTIZACION. Se pide a una o más compañías y cada
-- una responde con una propuesta: la prima, la moneda y hasta cuándo vale, o que no cotiza.
-- El cliente elige a lo sumo una propuesta. Cada pedido, respuesta y elección queda en la
-- historia (evento PROPUESTA). Quote y QuoteOption siguen sin entidad propia (DOMAIN §39 y
-- §40): son la gestión y sus propuestas.

create table service_case_quote_option (
  id uuid primary key default gen_random_uuid(),
  service_case_id uuid not null references service_case (id),
  insurer_id uuid not null references insurer (id),
  status text not null default 'PEDIDA' check (status in ('PEDIDA', 'COTIZADA', 'DECLINADA', 'ELEGIDA')),
  premium numeric(14, 2) check (premium > 0),
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  valid_until date,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint service_case_quote_option_una_por_compania unique (service_case_id, insurer_id),
  constraint service_case_quote_option_con_prima
    check (status in ('PEDIDA', 'DECLINADA') or premium is not null)
);

-- El cliente elige a lo sumo una propuesta por cotización.
create unique index service_case_quote_option_una_elegida
  on service_case_quote_option (service_case_id) where status = 'ELEGIDA';

-- Sólo una cotización tiene propuestas.
create function cotizacion_solo_propuestas() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from service_case c where c.id = new.service_case_id and c.kind = 'COTIZACION') then
    raise exception 'sólo una cotización tiene propuestas';
  end if;
  return new;
end;
$$;

create trigger cotizacion_solo_propuestas
  before insert on service_case_quote_option
  for each row execute function cotizacion_solo_propuestas();

alter table service_case_event drop constraint service_case_event_kind_check;
alter table service_case_event add constraint service_case_event_kind_check
  check (kind in ('ALTA', 'NOTA', 'ESTADO', 'CIERRE', 'ASIGNACION', 'ETAPA', 'REQUISITO', 'PROPUESTA'));

alter table service_case_quote_option enable row level security;
grant select, insert on service_case_quote_option to broker_app;
grant update (status, premium, currency, valid_until, note, updated_at) on service_case_quote_option to broker_app;

create policy service_case_quote_option_leer on service_case_quote_option for select to broker_app
  using (exists (select 1 from service_case c where c.id = service_case_id));
create policy service_case_quote_option_crear on service_case_quote_option for insert to broker_app
  with check (status = 'PEDIDA' and exists (select 1 from service_case c where c.id = service_case_id));
create policy service_case_quote_option_responder on service_case_quote_option for update to broker_app
  using (exists (select 1 from service_case c where c.id = service_case_id));
