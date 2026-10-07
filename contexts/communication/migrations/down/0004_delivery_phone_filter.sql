-- Reversa de 0004. Las `ignored` pasan a `failed` con su motivo, no a `processed`: así
-- el código anterior las sigue mostrando y reprocesando, en vez de volverlas invisibles.
update communication.webhook_delivery
set processing = 'failed', processing_error = 'ignorada: todo su contenido era de otro número'
where processing = 'ignored';
alter table communication.webhook_delivery
  drop constraint webhook_delivery_ignored_check,
  drop column phone_number_filter,
  drop column ignored_count,
  drop column applied_count,
  drop constraint webhook_delivery_processing_check,
  add constraint webhook_delivery_processing_check
    check (processing in ('pending', 'processed', 'failed'));
