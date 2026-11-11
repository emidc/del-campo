-- Inversa de 0018. Falla si ya hay eventos INTERLOCUTOR: borrarlos sería borrar historia.
alter table service_case_event drop constraint service_case_event_kind_check;
alter table service_case_event add constraint service_case_event_kind_check
  check (kind in ('ALTA', 'NOTA', 'ESTADO', 'CIERRE', 'ASIGNACION', 'ETAPA', 'REQUISITO', 'PROPUESTA'));

drop table service_case_contact;
drop function siniestro_interlocutor_de_siniestro();
