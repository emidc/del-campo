-- Down de 0001_vs01_core_schema.sql — BR-008 (revisión ciega T-0012). Vive en un
-- subdirectorio `down/` con el mismo nombre de archivo que su up: `migraciones.ts`
-- sólo indexa `packages/db/migrations/*.sql` (no baja a subdirectorios), así que este
-- archivo nunca se confunde con una migración hacia adelante nueva. El runner
-- (`packages/db/src/cli.ts`, comando `down`) lo ubica por convención: mismo nombre,
-- un nivel más abajo.
--
-- Orden: inverso estricto de creación, tablas primero por sus dependientes y último
-- la extensión. Ningún DROP usa CASCADE: si algo quedó referenciando un objeto de
-- esta migración que esta migración no conoce, el error tiene que pararlo, no
-- arrastrarlo en silencio.

drop table app_user;

drop trigger external_reference_immutable_source on external_reference;
drop function external_reference_source_is_immutable();
drop table external_reference;

drop trigger policy_no_delete_with_document_links on policy;
drop function prevent_delete_policy_with_document_links();
drop trigger document_link_resource_exists on document_link;
drop function require_document_link_resource();
drop table document_link;

drop trigger policy_version_closed_immutable on policy_version;
drop function policy_version_closed_is_immutable();
drop table policy_version;

drop table endorsement;

drop table policy;

drop table insurer_alias;
drop trigger insurer_requires_organization_party on insurer;
drop table insurer;

drop trigger organization_membership_requires_person on organization_membership;
drop trigger organization_membership_requires_organization on organization_membership;
drop table organization_membership;

drop table contact_point;

drop trigger party_role_no_delete on party_role;
drop function prevent_delete_party_role();
drop table party_role;

drop trigger organization_profile_requires_organization_party on organization_profile;
drop table organization_profile;

drop trigger person_profile_requires_person_party on person_profile;
drop table person_profile;

drop function require_party_kind();

drop trigger party_kind_immutable_with_dependents on party;
drop function prevent_kind_change_with_dependents();
drop trigger party_merged_no_delete on party;
drop function prevent_delete_merged_party();
drop trigger party_id_immutable on party;
drop function party_id_is_immutable();
drop trigger party_merge_cycle_guard on party;
drop function prevent_party_merge_cycle();
drop table party;

drop extension if exists btree_gist;
