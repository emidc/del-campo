-- Inversa de 0004_document_verification.sql.

drop table document_verification_input;
drop table document_verification_batch;

create or replace function require_document_link_resource() returns trigger
language plpgsql as $$
begin
  if new.resource_type = 'POLICY' and not exists (select 1 from policy where id = new.resource_id) then
    raise exception 'document_link.resource_id % does not reference an existing policy', new.resource_id;
  end if;
  return new;
end;
$$;

do $$
begin
  if exists (select 1 from document_link where resource_type = 'PARTY') then
    raise exception
      '0004_document_verification: no se puede revertir con document_link.resource_type = PARTY existentes';
  end if;
end;
$$;

alter table document_link
  drop constraint document_link_resource_type_check;

alter table document_link
  add constraint document_link_resource_type_check
  check (resource_type in ('POLICY'));
