delete from service_case_event where kind = 'PROPUESTA';
alter table service_case_event drop constraint service_case_event_kind_check;
alter table service_case_event add constraint service_case_event_kind_check
  check (kind in ('ALTA', 'NOTA', 'ESTADO', 'CIERRE', 'ASIGNACION', 'ETAPA', 'REQUISITO'));

drop table service_case_quote_option;
drop function cotizacion_solo_propuestas();
