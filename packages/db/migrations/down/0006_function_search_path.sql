-- Inversa de 0006_function_search_path.sql: las funciones vuelven a resolver sus tablas
-- contra el `search_path` de la sesión. No toca datos.

alter function prevent_party_merge_cycle() reset search_path;
alter function party_id_is_immutable() reset search_path;
alter function prevent_delete_merged_party() reset search_path;
alter function prevent_kind_change_with_dependents() reset search_path;
alter function require_party_kind() reset search_path;
alter function prevent_delete_party_role() reset search_path;
alter function policy_version_closed_is_immutable() reset search_path;
alter function prevent_delete_policy_with_document_links() reset search_path;
alter function external_reference_source_is_immutable() reset search_path;
alter function require_document_link_resource() reset search_path;
alter function policy_document_reference_requires_document_kind() reset search_path;
alter function assert_policy_document_reference_totality(uuid) reset search_path;
alter function external_reference_document_policy_totality() reset search_path;
alter function policy_document_reference_totality() reset search_path;
