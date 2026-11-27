-- Marca de «información completa» de una póliza. La tilda el equipo cuando terminó de
-- cargar todo lo que hay de una póliza renovada desde Renovaciones; ahí la lista muestra
-- el número con un tic. Quién y cuándo la cambió queda en `audit_event`.

alter table policy add column complete boolean not null default false;

grant update (complete) on policy to broker_app;
