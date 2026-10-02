-- T-0023 — cada función de validación resuelve sus tablas contra `public`, no contra el
-- `search_path` de la sesión que dispara el trigger.
--
-- Las funciones de 0001, 0002 y 0004 nombran tablas sin esquema. Un volcado de
-- `pg_dump` vacía el `search_path` antes del primer COPY, y la carga fallaba con
-- `relation "party" does not exist` (ops/evidence/T-0018.md). Con los esquemas por
-- contexto de D-0063, depender del `search_path` de quien llama deja de ser un detalle.
--
-- Se fija con ALTER FUNCTION … SET y no calificando las tablas dentro de cada cuerpo:
-- el cuerpo (`prosrc`) queda idéntico byte a byte, así que la lógica y los mensajes no
-- pueden haber cambiado. `pg_temp` va al final para que una tabla temporal homónima no
-- se resuelva por delante de `public`.
--
-- Ojo: `create or replace function` reemplaza también la configuración. Una migración
-- futura que redefina una de estas funciones tiene que repetir el SET; la prueba de
-- catálogo de function-search-path.integration.test.ts falla si lo olvida.

-- 0001
alter function prevent_party_merge_cycle() set search_path = public, pg_temp;
alter function party_id_is_immutable() set search_path = public, pg_temp;
alter function prevent_delete_merged_party() set search_path = public, pg_temp;
alter function prevent_kind_change_with_dependents() set search_path = public, pg_temp;
alter function require_party_kind() set search_path = public, pg_temp;
alter function prevent_delete_party_role() set search_path = public, pg_temp;
alter function policy_version_closed_is_immutable() set search_path = public, pg_temp;
alter function prevent_delete_policy_with_document_links() set search_path = public, pg_temp;
alter function external_reference_source_is_immutable() set search_path = public, pg_temp;

-- 0001, redefinida por 0004
alter function require_document_link_resource() set search_path = public, pg_temp;

-- 0002
alter function policy_document_reference_requires_document_kind() set search_path = public, pg_temp;
alter function assert_policy_document_reference_totality(uuid) set search_path = public, pg_temp;
alter function external_reference_document_policy_totality() set search_path = public, pg_temp;
alter function policy_document_reference_totality() set search_path = public, pg_temp;
