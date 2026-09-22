-- T-0019 / D-0054 — pertenencia documental específica para VS01.
--
-- La Policy de pertenencia NO es el destino que ExternalReference intenta resolver:
-- resolved_target_type/resolved_target_id permanecen en external_reference y esta
-- tabla sólo expresa a qué Policy pertenece la referencia documental.

create table policy_document_reference (
  external_reference_id uuid not null,
  policy_id uuid not null,
  created_at timestamptz not null default now(),
  constraint policy_document_reference_external_reference_pk
    primary key (external_reference_id),
  constraint policy_document_reference_external_reference_fk
    foreign key (external_reference_id) references external_reference (id) on delete restrict,
  constraint policy_document_reference_policy_fk
    foreign key (policy_id) references policy (id) on delete restrict
);

create index policy_document_reference_policy_id_idx
  on policy_document_reference (policy_id);

-- D-0054 usa relation_type como discriminador físico. La validación inmediata evita
-- que una relación de otro dominio entre en la asociación documental.
create function policy_document_reference_requires_document_kind() returns trigger
language plpgsql as $$
declare
  reference_relation_type text;
begin
  select relation_type
    into reference_relation_type
    from external_reference
    where id = new.external_reference_id;

  -- La FK conserva la responsabilidad (y el nombre de constraint observable) para
  -- extremos inexistentes. Este trigger sólo discrimina filas que sí existen.
  if not found then
    return new;
  end if;

  if reference_relation_type is distinct from 'POLICY_DOCUMENT' then
    raise exception
      'policy_document_reference: external_reference debe tener relation_type POLICY_DOCUMENT';
  end if;

  return new;
end;
$$;

create trigger policy_document_reference_document_kind
  before insert or update of external_reference_id on policy_document_reference
  for each row
  execute function policy_document_reference_requires_document_kind();

-- La participación total necesita ser diferible: una ExternalReference y su Policy
-- de pertenencia se insertan en dos sentencias de la misma transacción. Al cerrar la
-- transacción no puede quedar un POLICY_DOCUMENT sin asociación ni una asociación
-- cuyo discriminador haya cambiado.
create function assert_policy_document_reference_totality(reference_id uuid) returns void
language plpgsql as $$
declare
  reference_relation_type text;
  has_association boolean;
begin
  select relation_type
    into reference_relation_type
    from external_reference
    where id = reference_id;

  if not found then
    return;
  end if;

  select exists (
    select 1
      from policy_document_reference
      where external_reference_id = reference_id
  ) into has_association;

  if reference_relation_type = 'POLICY_DOCUMENT' and not has_association then
    raise exception
      'external_reference: POLICY_DOCUMENT requiere exactamente una Policy de pertenencia';
  end if;

  if reference_relation_type <> 'POLICY_DOCUMENT' and has_association then
    raise exception
      'policy_document_reference: sólo admite relation_type POLICY_DOCUMENT';
  end if;
end;
$$;

create function external_reference_document_policy_totality() returns trigger
language plpgsql as $$
begin
  perform assert_policy_document_reference_totality(new.id);
  return null;
end;
$$;

create constraint trigger external_reference_document_policy_total
  after insert or update of relation_type on external_reference
  deferrable initially deferred
  for each row
  execute function external_reference_document_policy_totality();

create function policy_document_reference_totality() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform assert_policy_document_reference_totality(old.external_reference_id);
  elsif tg_op = 'UPDATE' then
    perform assert_policy_document_reference_totality(old.external_reference_id);
    perform assert_policy_document_reference_totality(new.external_reference_id);
  else
    perform assert_policy_document_reference_totality(new.external_reference_id);
  end if;
  return null;
end;
$$;

create constraint trigger policy_document_reference_total
  after insert or update or delete on policy_document_reference
  deferrable initially deferred
  for each row
  execute function policy_document_reference_totality();

comment on table policy_document_reference is
  'D-0054: asocia una referencia documental a una única Policy de pertenencia. '
  'No representa ni duplica resolved_target_type/resolved_target_id.';

comment on column policy_document_reference.policy_id is
  'Policy a la que pertenece la referencia documental; no es el destino intentado.';
