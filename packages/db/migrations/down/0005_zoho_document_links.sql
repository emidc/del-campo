-- Inversa de 0005_zoho_document_links.sql.
--
-- Revertir el nivel es borrar los enlaces de Zoho: D-0064 lo dice explícitamente
-- ("Revertir es borrar el nivel de Zoho: los comprobados no cambian"). Se borran acá en
-- vez de abortar como hace down/0004 con resource_type = PARTY, porque un enlace de
-- Zoho no tiene registro humano detrás que se pueda perder — se regenera desde el lote.

delete from document_link where link_level = 'ZOHO_UNVERIFIED';

drop index document_link_zoho_unico_por_recurso;

alter table document_link drop column link_level;
