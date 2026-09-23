-- T-0017 / D-0057 — conciliación asistida: el insumo local revisado registra, por
-- relación, a qué se vincula, quién la verificó, con qué evidencia, cuándo y bajo qué
-- cuenta. No integra la API de Drive (D-0057) ni escribe en Drive (D-0040).

-- ── document_link: segundo caso de resource_type ────────────────────────────────
-- 0001_vs01_core_schema.sql restringió resource_type a ('POLICY') a propósito, y su
-- comentario ya anticipó este momento: "ampliarlo es una migración nueva cuando exista
-- un segundo caso real (R-01)". La carpeta del cliente (D-0057, DOMAIN.md §47-49) es
-- ese segundo caso: se vincula al Party cliente, no a la Policy — varias Policies del
-- mismo cliente pueden compartir una única carpeta.

alter table document_link
  drop constraint document_link_resource_type_check;

alter table document_link
  add constraint document_link_resource_type_check
  check (resource_type in ('POLICY', 'PARTY'));

create or replace function require_document_link_resource() returns trigger
language plpgsql as $$
begin
  if new.resource_type = 'POLICY' and not exists (select 1 from policy where id = new.resource_id) then
    raise exception 'document_link.resource_id % does not reference an existing policy', new.resource_id;
  end if;
  if new.resource_type = 'PARTY' and not exists (select 1 from party where id = new.resource_id) then
    raise exception 'document_link.resource_id % does not reference an existing party', new.resource_id;
  end if;
  return new;
end;
$$;

-- Party nunca se borra por proceso normal (§7, INV-002): no existe un caso real hoy que
-- justifique un trigger RESTRICT análogo a policy_no_delete_with_document_links (R-01).

-- ── Insumo de conciliación asistida (T-0017) ────────────────────────────────────
-- Una fila por relación o pendiente del CSV de Notes. Es el registro auditable de quién
-- verificó, con qué evidencia, cuándo y bajo qué cuenta — distinto de ExternalReference
-- (D-0034), que representa cómo el dominio entiende la relación, igual que D-0033
-- separa staging de dominio. La identidad natural de una relación es
-- (policy_id, link_scope, target_url): permite releer el mismo insumo sin duplicar y
-- detectar qué relación cambió entre corridas.

create table document_verification_batch (
  id uuid primary key default gen_random_uuid(),
  imported_at timestamptz not null default now(),
  source_file text not null,
  notes text
);

create table document_verification_input (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references document_verification_batch (id),
  policy_id uuid not null references policy (id),
  source_row_number integer not null,

  target_kind text not null check (target_kind in ('FILE', 'FOLDER')),
  link_scope text not null check (link_scope in ('POLICY_DOCUMENT', 'CLIENT_FOLDER')),
  target_url text not null,

  status text not null check (status in ('VERIFIED', 'PENDING')),
  pending_reason text check (pending_reason in ('UNVERIFIED', 'AMBIGUOUS', 'INACCESSIBLE', 'NO_REFERENCE')),

  verified_by text,
  verified_at timestamptz,
  verified_account text,
  evidence text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint document_verification_input_identity_unique
    unique (policy_id, link_scope, target_url),

  -- Notes: "POLICY_DOCUMENT exige FILE".
  constraint document_verification_input_policy_document_is_file
    check (link_scope <> 'POLICY_DOCUMENT' or target_kind = 'FILE'),

  -- Notes: "VERIFIED exige verificador, fecha, cuenta y evidencia"; pending_reason
  -- "vacío si VERIFIED". PENDING sólo exige su motivo: puede o no tener verificador
  -- (INACCESSIBLE registra quién intentó comprobar y no pudo; NO_REFERENCE puede no
  -- tener a nadie que haya intentado nada).
  constraint document_verification_input_verified_requires_fields
    check (
      (status = 'VERIFIED'
        and pending_reason is null
        and verified_by is not null
        and verified_at is not null
        and verified_account is not null
        and evidence is not null)
      or (status = 'PENDING' and pending_reason is not null)
    )
);

create index document_verification_input_policy_id_idx
  on document_verification_input (policy_id);

comment on table document_verification_input is
  'T-0017/D-0057: insumo revisado de conciliación asistida, una fila por relación. '
  'Fuente auditable de verificador/evidencia/cuenta; no es la representación de dominio '
  '(ver external_reference/policy_document_reference/document_link).';
