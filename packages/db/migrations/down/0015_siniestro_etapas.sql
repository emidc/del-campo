-- Inversa de 0015. Falla si ya hay eventos ETAPA o REQUISITO: borrarlos sería borrar historia.
alter table service_case_event drop constraint service_case_event_kind_check;
alter table service_case_event add constraint service_case_event_kind_check
  check (kind in ('ALTA', 'NOTA', 'ESTADO', 'CIERRE', 'ASIGNACION'));

revoke update (claim_stage) on service_case from broker_app;
drop table service_case_requirement;

alter table service_case drop constraint service_case_siniestro_con_etapa;
drop trigger siniestro_cambio_de_etapa on service_case;
drop trigger siniestro_requisitos_de_fabrica on service_case;
drop trigger siniestro_etapa_inicial on service_case;
drop function siniestro_cambio_de_etapa();
drop function siniestro_requisitos_de_fabrica();
drop function siniestro_etapa_inicial();
drop function siniestro_orden(text);
alter table service_case drop column claim_stage;
