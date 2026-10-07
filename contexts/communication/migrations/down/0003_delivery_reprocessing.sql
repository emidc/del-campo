-- Reversa de 0003.
drop index communication.webhook_delivery_unprocessed;
alter table communication.webhook_delivery
  drop column last_reprocessed_at,
  drop column reprocess_count;
