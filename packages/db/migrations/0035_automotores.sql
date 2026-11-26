-- Automotores: de un cliente y de sus pólizas.
--
-- Un automotor es de un solo cliente y puede estar en varias pólizas. La patente se guarda
-- normalizada (mayúsculas, sin espacios, guiones ni puntos) y es única en todo Broker OS.
-- Los que carga el equipo llevan `source = 'Broker OS'` y quién los cargó; los de la
-- importación de Zoho, `source = 'Zoho'`. Cada edición guarda quién y cuándo.
--
-- Se borran con el cliente (`eliminar_contacto`); el vínculo con la póliza, con la póliza
-- (`eliminar_poliza`) o con el automotor. Es de uso interno: el portal no los lee.

create table vehicle (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references party (id) on delete cascade,
  plate text not null unique check (plate ~ '^[A-Z0-9]{2,12}$'),
  brand text check (brand is null or (btrim(brand) <> '' and length(brand) <= 80)),
  model text check (model is null or (btrim(model) <> '' and length(model) <= 120)),
  year integer check (year is null or year between 1900 and 2100),
  source text not null default 'Broker OS' check (source in ('Broker OS', 'Zoho')),
  created_by_user_id uuid references app_user (id),
  created_at timestamptz not null default clock_timestamp(),
  updated_by_user_id uuid references app_user (id),
  updated_at timestamptz,
  constraint vehicle_autor check ((source = 'Broker OS') = (created_by_user_id is not null))
);

create index vehicle_party_idx on vehicle (party_id);

create table policy_vehicle (
  policy_id uuid not null references policy (id) on delete cascade,
  vehicle_id uuid not null references vehicle (id) on delete cascade,
  created_by_user_id uuid references app_user (id),
  created_at timestamptz not null default clock_timestamp(),
  primary key (policy_id, vehicle_id)
);

create index policy_vehicle_vehicle_idx on policy_vehicle (vehicle_id);

alter table vehicle enable row level security;
alter table policy_vehicle enable row level security;

grant select, delete on vehicle to broker_app;
grant insert (party_id, plate, brand, model, year, created_by_user_id) on vehicle to broker_app;
grant update (plate, brand, model, year, updated_by_user_id, updated_at) on vehicle to broker_app;
grant select, delete on policy_vehicle to broker_app;
grant insert (policy_id, vehicle_id, created_by_user_id) on policy_vehicle to broker_app;

create policy vehicle_leer on vehicle for select to broker_app
  using ((select authz.es_admin()) and authz.ve_cliente(party_id));
create policy vehicle_crear on vehicle for insert to broker_app
  with check ((select authz.es_admin()) and authz.ve_cliente(party_id) and created_by_user_id = (select authz.usuario()));
create policy vehicle_editar on vehicle for update to broker_app
  using ((select authz.es_admin()) and authz.ve_cliente(party_id))
  with check ((select authz.es_admin()) and updated_by_user_id = (select authz.usuario()));
create policy vehicle_borrar on vehicle for delete to broker_app
  using ((select authz.es_admin()) and authz.ve_cliente(party_id));

create policy policy_vehicle_leer on policy_vehicle for select to broker_app
  using ((select authz.es_admin()));
create policy policy_vehicle_crear on policy_vehicle for insert to broker_app
  with check ((select authz.es_admin()) and created_by_user_id = (select authz.usuario()));
create policy policy_vehicle_borrar on policy_vehicle for delete to broker_app
  using ((select authz.es_admin()));
