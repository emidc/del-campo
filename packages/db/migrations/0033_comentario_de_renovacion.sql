-- Comentario de renovación: una línea de texto libre por póliza, que el equipo escribe en
-- la tabla de Renovaciones. Uno por póliza; borrar el texto borra la fila. Guarda quién lo
-- escribió por última vez y cuándo. Es de uso interno: el portal no lo lee.

create table policy_renewal_comment (
  policy_id uuid primary key references policy (id) on delete cascade,
  body text not null check (btrim(body) <> '' and length(body) <= 2000),
  updated_by_user_id uuid not null references app_user (id),
  updated_at timestamptz not null default clock_timestamp()
);

alter table policy_renewal_comment enable row level security;

grant select, delete on policy_renewal_comment to broker_app;
grant insert (policy_id, body, updated_by_user_id) on policy_renewal_comment to broker_app;
grant update (body, updated_by_user_id, updated_at) on policy_renewal_comment to broker_app;

create policy policy_renewal_comment_leer on policy_renewal_comment for select to broker_app
  using ((select authz.es_admin()) and authz.ve_poliza(policy_id));
create policy policy_renewal_comment_crear on policy_renewal_comment for insert to broker_app
  with check ((select authz.es_admin()) and authz.ve_poliza(policy_id) and updated_by_user_id = (select authz.usuario()));
create policy policy_renewal_comment_editar on policy_renewal_comment for update to broker_app
  using ((select authz.es_admin()) and authz.ve_poliza(policy_id))
  with check ((select authz.es_admin()) and updated_by_user_id = (select authz.usuario()));
create policy policy_renewal_comment_borrar on policy_renewal_comment for delete to broker_app
  using ((select authz.es_admin()) and authz.ve_poliza(policy_id));
