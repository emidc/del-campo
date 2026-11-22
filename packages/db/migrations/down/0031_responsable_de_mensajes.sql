-- Reversa de 0031. Borra los responsables de mensajes.
revoke update (message_owner_user_id) on party from broker_app;
alter table party drop column message_owner_user_id;
