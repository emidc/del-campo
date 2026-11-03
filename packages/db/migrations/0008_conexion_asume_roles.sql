-- T-0035, incremento 3 — la conexión de la app puede asumir los roles de 0007.
--
-- Broker OS adopta `broker_app` por transacción con `set local role` (D-0022). Sin esta
-- membresía, un dueño de las tablas que no es superusuario (el `postgres` de Supabase)
-- no puede hacerlo: PostgreSQL 16+ no da SET sobre un rol a quien lo creó.
--
-- Por qué no cambia el comportamiento actual: con INHERIT FALSE la conexión no gana
-- ningún privilegio de estos roles; sólo puede asumirlos, y al asumirlos queda sujeta a
-- RLS. Mientras ninguna ruta haga `set role` (AUTH_MODE=legacy), nada cambia.

grant broker_app, broker_worker, broker_mcp to current_user with inherit false, set true;
