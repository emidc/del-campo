-- Reversa de 0007: vuelven las políticas de 0006.
drop policy cierre_revision_cerrar on risk.cierre_revision;
create policy cierre_revision_cerrar on risk.cierre_revision for insert to risk_persona
  with check ((select risk.authz_puede_revisar()) and risk.authz_ve_resultados_riesgo(risk_id)
              and cerrada_por = (select risk.authz_persona())
              and (evaluacion_id is null or risk.authz_no_es_propio(evaluacion_id, null, null)));
drop function risk.authz_autor_revision(text);

drop policy persona_leer on risk.persona;
create policy persona_leer on risk.persona for select to risk_persona
  using ((select risk.authz_persona()) is not null);

drop policy accion_leer on risk.accion;
drop policy transferencia_leer on risk.transferencia;
drop policy evento_poliza_leer on risk.evento_poliza;
drop policy novedad_leer on risk.novedad;
drop policy revision_pendiente_leer on risk.revision_pendiente;
drop policy accion_estado_leer on risk.accion_estado;
create policy accion_leer on risk.accion for select to risk_persona using (risk.authz_ve_riesgo(risk_id));
create policy transferencia_leer on risk.transferencia for select to risk_persona using (risk.authz_ve_riesgo(risk_id));
create policy evento_poliza_leer on risk.evento_poliza for select to risk_persona using (risk.authz_ve_riesgo(risk_id));
create policy novedad_leer on risk.novedad for select to risk_persona using (risk.authz_ve_riesgo(risk_id));
create policy revision_pendiente_leer on risk.revision_pendiente for select to risk_persona using (risk.authz_ve_riesgo(risk_id));
create policy accion_estado_leer on risk.accion_estado for select to risk_persona using (risk.authz_ve_accion(accion_id));

drop function risk.authz_ve_resultados_accion(text);
