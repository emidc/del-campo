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

comment on table policy_document_reference is
  'D-0054: asocia una referencia documental a una única Policy de pertenencia. '
  'No representa ni duplica resolved_target_type/resolved_target_id.';

comment on column policy_document_reference.policy_id is
  'Policy a la que pertenece la referencia documental; no es el destino intentado.';
