-- Anular una póliza desde la ficha y deshacerlo. Al anular, la versión abierta pasa a
-- Anulada y guarda acá el estado que tenía, para que «Deshacer» la devuelva a ese mismo
-- estado. Al deshacer, la columna vuelve a quedar vacía.

alter table policy_version add column status_before_cancel text;

comment on column policy_version.status_before_cancel is
  'El estado que tenía la versión antes de que el equipo la anulara desde Broker OS. Vacío si no está anulada desde la app.';

grant update (status_before_cancel) on policy_version to broker_app;
