-- T-0035 — `broker_app` deja de leer `staging_import_batch.notes`.
--
-- La 0010 le dio `select` sobre la fecha, la huella y las notas del lote. VS01 sólo
-- necesita la fecha (SLICES/VS01.md §2: que los resultados no aparenten ser datos en vivo
-- de Zoho) y la huella para identificar el lote. Las notas son texto libre de quien
-- importa y pueden traer información operativa que nadie en la búsqueda necesita: el
-- owner decidió (2026-11-04) no exponerlas por defecto. La app deja de pedirlas.
--
-- Como la 0010, no rige para la conexión actual, que es dueña de las tablas.

revoke select (notes) on staging_import_batch from broker_app;
