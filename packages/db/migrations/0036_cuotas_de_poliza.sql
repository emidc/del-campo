-- Cuotas de las pólizas que se pagan en efectivo: una fila por cuota, con su fecha de pago,
-- su importe y si ya se pagó.
--
-- Mientras nadie toca las cuotas de una póliza no hay filas: Broker OS las calcula de la
-- vigencia y del premio. Se guardan todas juntas la primera vez que alguien edita el plan o
-- marca una cuota como pagada. Cada cambio guarda quién y cuándo; el pago, quién lo marcó.
-- Se borran con la póliza. Es de uso interno: el portal no las lee.

create table policy_installment (
  policy_id uuid not null references policy (id) on delete cascade,
  number integer not null check (number between 1 and 60),
  due_date date not null,
  amount numeric(18, 2) check (amount is null or amount >= 0),
  paid_at timestamptz,
  paid_by_user_id uuid references app_user (id),
  updated_by_user_id uuid not null references app_user (id),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (policy_id, number),
  constraint policy_installment_pago check ((paid_at is null) = (paid_by_user_id is null))
);

alter table policy_installment enable row level security;

grant select, delete on policy_installment to broker_app;
grant insert (policy_id, number, due_date, amount, paid_at, paid_by_user_id, updated_by_user_id) on policy_installment to broker_app;
grant update (due_date, amount, paid_at, paid_by_user_id, updated_by_user_id, updated_at) on policy_installment to broker_app;

create policy policy_installment_leer on policy_installment for select to broker_app
  using ((select authz.es_admin()) and authz.ve_poliza(policy_id));
create policy policy_installment_crear on policy_installment for insert to broker_app
  with check ((select authz.es_admin()) and authz.ve_poliza(policy_id) and updated_by_user_id = (select authz.usuario()));
create policy policy_installment_editar on policy_installment for update to broker_app
  using ((select authz.es_admin()) and authz.ve_poliza(policy_id))
  with check ((select authz.es_admin()) and updated_by_user_id = (select authz.usuario()));
create policy policy_installment_borrar on policy_installment for delete to broker_app
  using ((select authz.es_admin()) and authz.ve_poliza(policy_id));
