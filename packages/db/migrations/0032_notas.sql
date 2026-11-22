-- Notas de una parte (empresa o persona), en la pestaña «Notas» de su ficha.
--
-- El equipo las escribe, las edita, las archiva (quedan ocultas hasta pedir verlas), las
-- desarchiva y las borra. Las que vienen de Zoho llevan `source = 'Zoho'`, el ID de la
-- nota en Zoho (para no cargarlas dos veces), quién la escribió allá y cuándo; las del
-- equipo, `source = 'Broker OS'` y el usuario. Cada edición guarda quién y cuándo.
--
-- Se borran con la parte (`eliminar_contacto` borra la parte y las notas van con ella).
-- Es de uso interno: el portal no las lee.

create table party_note (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references party (id) on delete cascade,
  title text check (title is null or (btrim(title) <> '' and length(title) <= 200)),
  body text not null default '' check (length(body) <= 20000),
  archived_at timestamptz,
  archived_by_user_id uuid references app_user (id),
  source text not null default 'Broker OS' check (source in ('Broker OS', 'Zoho')),
  source_record_id text unique check (source_record_id is null or length(source_record_id) <= 60),
  source_author text check (length(source_author) <= 120),
  created_by_user_id uuid references app_user (id),
  created_at timestamptz not null default clock_timestamp(),
  updated_by_user_id uuid references app_user (id),
  updated_at timestamptz,
  constraint party_note_con_texto check (title is not null or btrim(body) <> ''),
  constraint party_note_autor check ((source = 'Broker OS') = (created_by_user_id is not null)),
  constraint party_note_zoho_con_id check ((source = 'Zoho') = (source_record_id is not null))
);

create index party_note_party_idx on party_note (party_id, created_at desc);

alter table party_note enable row level security;

grant select, delete on party_note to broker_app;
grant insert (party_id, title, body, created_by_user_id) on party_note to broker_app;
grant update (title, body, archived_at, archived_by_user_id, updated_by_user_id, updated_at) on party_note to broker_app;

create policy party_note_leer on party_note for select to broker_app
  using ((select authz.es_admin()) and authz.ve_cliente(party_id));
create policy party_note_crear on party_note for insert to broker_app
  with check ((select authz.es_admin()) and authz.ve_cliente(party_id) and created_by_user_id = (select authz.usuario()));
create policy party_note_editar on party_note for update to broker_app
  using ((select authz.es_admin()) and authz.ve_cliente(party_id))
  with check ((select authz.es_admin()) and updated_by_user_id = (select authz.usuario()));
create policy party_note_borrar on party_note for delete to broker_app
  using ((select authz.es_admin()) and authz.ve_cliente(party_id));
