-- Inversa de 0013. Borra las gestiones y su historia: sólo para una base local o de prueba.
drop table service_case_event;
drop table service_case;
drop function service_case_event_inmutable();
drop function authz.correo_integrante(uuid);
