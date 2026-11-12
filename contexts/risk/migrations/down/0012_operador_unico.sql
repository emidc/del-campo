-- Reversa de 0012: vuelven las políticas de 0006 y 0007. Las aprobaciones internas ya
-- registradas quedan como revisiones y cierres comunes, sin la marca.
drop policy transferencia_registrada_ahora on risk.transferencia;
drop policy accion_registrada_ahora on risk.accion;
drop policy evaluacion_registrada_ahora on risk.evaluacion;

drop policy cierre_revision_cerrar on risk.cierre_revision;
create policy cierre_revision_cerrar on risk.cierre_revision for insert to risk_persona
  with check ((select risk.authz_puede_revisar()) and risk.authz_ve_resultados_riesgo(risk_id)
              and cerrada_por = (select risk.authz_persona())
              and (evaluacion_id is null or risk.authz_no_es_propio(evaluacion_id, null, null))
              and (evaluacion_id is not null
                   or risk.authz_autor_revision(revision_id) is distinct from (select risk.authz_persona())));

drop policy revision_humana_revisar on risk.revision_humana;
create policy revision_humana_revisar on risk.revision_humana for insert to risk_persona
  with check ((select risk.authz_puede_revisar())
              and risk.authz_ve_resultados_riesgo(risk.authz_riesgo_de(evaluacion_id, accion_id, transferencia_id))
              and origen = 'sesion' and revisor_persona_id = (select risk.authz_persona())
              and risk.authz_no_es_propio(evaluacion_id, accion_id, transferencia_id));

drop trigger cierre_revision_aprobacion_interna on risk.cierre_revision;
drop function risk.cierre_revision_aprobacion_interna();
drop trigger revision_humana_aprobacion_interna on risk.revision_humana;
drop function risk.revision_humana_aprobacion_interna();
drop function risk.aprobacion_interna_cumple(text, text, text, text);

alter table risk.cierre_revision drop column aprobacion_interna;
alter table risk.revision_humana drop column aprobacion_interna;
drop table risk.revision_ia;
