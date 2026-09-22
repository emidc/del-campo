begin;

insert into party (id, kind)
values ('f1100000-0000-4000-8000-000000000001', 'ORGANIZATION');
insert into organization_profile (party_id, legal_name)
values ('f1100000-0000-4000-8000-000000000001', 'Aseguradora Observacion Sintetica');
insert into insurer (id, organization_party_id, canonical_name)
values (
  'f1200000-0000-4000-8000-000000000001',
  'f1100000-0000-4000-8000-000000000001',
  'Aseguradora Observacion Sintetica'
);
insert into policy (id, insurer_id, policy_number)
values (
  'f1300000-0000-4000-8000-000000000001',
  'f1200000-0000-4000-8000-000000000001',
  'POL-OBS-SINTETICA-T0019'
);
insert into external_reference (
  id, source_system, source_entity_type, source_external_id, source_value,
  relation_type, resolution_status, unresolved_reason
) values (
  'f1400000-0000-4000-8000-000000000001',
  'fixture', 'SyntheticDocument', 'DOC-OBS-SINTETICO-T0019',
  'Documento Observacion Sintetico T0019', 'POLICY_DOCUMENT',
  'UNRESOLVED', 'MOTIVO_OBSERVACION_SINTETICO'
);
insert into policy_document_reference (external_reference_id, policy_id)
values (
  'f1400000-0000-4000-8000-000000000001',
  'f1300000-0000-4000-8000-000000000001'
);

select
  p.policy_number,
  er.source_external_id,
  er.resolution_status,
  er.unresolved_reason,
  er.resolved_target_id,
  pdr.policy_id <> coalesce(er.resolved_target_id, '00000000-0000-0000-0000-000000000000')
    as pertenencia_es_distinta_del_destino
from policy_document_reference pdr
join policy p on p.id = pdr.policy_id
join external_reference er on er.id = pdr.external_reference_id;

rollback;
