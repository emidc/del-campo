-- Reversa de 0029. Borra ubicaciones, condiciones, coberturas, relevamientos y conclusiones.
drop table risk_conclusion_evidence;
drop table risk_conclusion;
drop function risk_conclusion_poliza_del_cliente();
drop table survey_finding;
drop table survey;
drop function public.coberturas_a_fecha(uuid, date);
drop table policy_coverage;
drop function policy_coverage_reemplazo_posterior();
drop view location_fact_current;
drop table location_fact;
drop table client_location;
