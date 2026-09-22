-- Inversa de T-0013. No descarta staging con datos reales silenciosamente: una base con
-- filas debe resetearse a propósito (`pnpm db:reset`), no perderlas por un `down` casual.

do $$
begin
  if exists (select 1 from staging_import_batch) then
    raise exception
      '0003_zoho_staging: no se puede revertir con datos de staging existentes; usar pnpm db:reset si se acepta perderlos';
  end if;
end;
$$;

alter table staging_import_exception drop constraint staging_import_exception_identity_unique;
alter table endorsement drop constraint endorsement_source_reference_unique;
alter table insurer_alias drop constraint insurer_alias_import_dedup;
alter table external_reference drop constraint external_reference_import_dedup;
alter table contact_point drop constraint contact_point_import_dedup;

drop table party_source_link;
drop table staging_import_exception;
drop table staging_account;
drop table staging_contact;
drop table staging_endorsement;
drop table staging_policy;
drop table staging_import_batch;
