-- Reproceso de entregas (T-0026). Meta no reintenta después de un 200 (D-0065): una
-- entrega `failed`, o `pending` porque el proceso cayó después de responder, solo se
-- recupera volviendo a procesar su cuerpo crudo. Estas columnas registran cuántas veces
-- se reprocesó cada una y cuándo fue la última, para que el reproceso deje rastro y
-- rote entre las que siguen fallando.
alter table communication.webhook_delivery
  add column reprocess_count     integer not null default 0 check (reprocess_count >= 0),
  add column last_reprocessed_at timestamptz,
  add check ((reprocess_count = 0) = (last_reprocessed_at is null));

-- Las que esperan reproceso, la retención que no las borra y el atraso que muestra la UI.
create index webhook_delivery_unprocessed on communication.webhook_delivery (received_at)
  where processing <> 'processed';
