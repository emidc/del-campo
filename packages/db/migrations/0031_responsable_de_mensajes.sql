-- T-0072 — A quién le avisan los mensajes de WhatsApp de un cliente.
--
-- Cada cliente puede tener un integrante del equipo responsable de sus mensajes, que se
-- elige desde la ficha. El aviso de un mensaje entrante le llega a esa persona; sin
-- responsable, a Victoria; si el mensaje no se asocia a ningún cliente, a Matías. Esa
-- regla vive en la app (packages/api/src/comunicacion/domain/avisos.ts), que además sólo
-- deja elegir a un integrante activo. Todo el equipo sigue viendo y respondiendo todas
-- las conversaciones.

alter table party add column message_owner_user_id uuid references app_user (id);

grant update (message_owner_user_id) on party to broker_app;
