-- Inversa de 0012. Volver a la clave `source_record_id` sólo es posible si ningún
-- registro de origen aparece en más de un lote: si aparece, revertir obligaría a elegir
-- qué crudo descartar, y eso es borrar historia (R-23). En ese caso falla y no toca nada.

do $$
begin
  if exists (select source_record_id from staging_policy group by source_record_id having count(*) > 1)
    or exists (select source_record_id from staging_endorsement group by source_record_id having count(*) > 1)
    or exists (select source_record_id from staging_contact group by source_record_id having count(*) > 1)
    or exists (select source_record_id from staging_account group by source_record_id having count(*) > 1)
  then
    raise exception
      '0012_staging_por_lote: hay registros de origen en más de un lote; revertir descartaría crudo de un lote. Usar pnpm db:reset si se acepta perderlo';
  end if;
end;
$$;

drop table staging_import_batch_module;
drop index staging_import_batch_huella_unica;

drop index staging_policy_source_record_id_idx;
drop index staging_endorsement_source_record_id_idx;
drop index staging_contact_source_record_id_idx;
drop index staging_account_source_record_id_idx;

alter table staging_policy drop constraint staging_policy_pkey;
alter table staging_policy add constraint staging_policy_pkey primary key (source_record_id);

alter table staging_endorsement drop constraint staging_endorsement_pkey;
alter table staging_endorsement add constraint staging_endorsement_pkey primary key (source_record_id);

alter table staging_contact drop constraint staging_contact_pkey;
alter table staging_contact add constraint staging_contact_pkey primary key (source_record_id);

alter table staging_account drop constraint staging_account_pkey;
alter table staging_account add constraint staging_account_pkey primary key (source_record_id);
