-- Resultado del filtro por número en cada entrega (remediación de T-0026). Una entrega
-- cuyo contenido era todo de otro número quedaba `processed` sin escribir nada, igual
-- que una procesada con contenido: con `WHATSAPP_PHONE_NUMBER_ID` mal configurado, todo
-- lo recibido se perdía con la UI sana, el reproceso no lo veía y la retención lo borraba.
--
-- `ignored` es ese caso: ningún elemento descartado, ninguno escrito y al menos uno de
-- otro número. Guarda el número contra el que se filtró, para que el reproceso la vuelva
-- a evaluar cuando el número configurado cambie, y solo entonces.
alter table communication.webhook_delivery
  drop constraint webhook_delivery_processing_check,
  add constraint webhook_delivery_processing_check
    check (processing in ('pending', 'processed', 'ignored', 'failed')),
  -- Elementos escritos (textos, fuera de alcance y estados) y elementos de otro número.
  -- Distinguen una entrega con contenido de una sin nada que guardar.
  add column applied_count integer not null default 0 check (applied_count >= 0),
  add column ignored_count integer not null default 0 check (ignored_count >= 0),
  -- El `phone_number_id` configurado cuando se procesó. No es un dato del participante.
  add column phone_number_filter text check (phone_number_filter ~ '^[0-9]+$'),
  add constraint webhook_delivery_ignored_check
    check (processing <> 'ignored'
           or (phone_number_filter is not null and ignored_count > 0 and applied_count = 0));
