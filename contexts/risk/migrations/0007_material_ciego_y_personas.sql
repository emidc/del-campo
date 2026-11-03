-- T-0035, correcciones de la revisión técnica del owner (2026-11-03) sobre 0006.
--
-- 1. Personas. `persona_leer` dejaba ver todas las filas de `risk.persona` a cualquier persona
--    con acceso. Ahora una persona ve su propia fila, un Administrador ve todas, y cualquier
--    otra persona sólo aparece si quien consulta ve algo que ella escribió. Las subconsultas
--    corren con el RLS de quien consulta, así que la regla es la misma que la de cada tabla:
--    el nombre de alguien no sale de una organización ajena ni de un resultado todavía ciego.
--
-- 2. Material ciego. Hasta registrar su orden previo de una organización, el Revisor
--    profesional ve de ella sólo el material ciego: los riesgos con su identidad y su
--    estructura (`riesgo`, `miembro_escenario`) y su propio orden previo. Nada evaluado ni
--    calculado: ni el plan de acción y su estado (`efecto`), ni las coberturas
--    (`suficiencia`, `exposicion_retenida_monto`) y sus eventos, ni las novedades y las
--    revisiones pendientes que abren. Esas tablas pasan a `authz_ve_resultados`, igual que
--    las evaluaciones. Para el Administrador y el Operador no cambia nada: para ellos
--    `authz_ve_resultados` es `authz_ve_organizacion`.

create function risk.authz_ve_resultados_accion(acc text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(risk.authz_ve_resultados_riesgo((select a.risk_id from risk.accion a where a.id = acc)), false)
$$;
revoke all on function risk.authz_ve_resultados_accion(text) from public;
grant execute on function risk.authz_ve_resultados_accion(text) to risk_persona;

drop policy accion_leer on risk.accion;
drop policy transferencia_leer on risk.transferencia;
drop policy evento_poliza_leer on risk.evento_poliza;
drop policy novedad_leer on risk.novedad;
drop policy revision_pendiente_leer on risk.revision_pendiente;
drop policy accion_estado_leer on risk.accion_estado;
create policy accion_leer on risk.accion for select to risk_persona using (risk.authz_ve_resultados_riesgo(risk_id));
create policy transferencia_leer on risk.transferencia for select to risk_persona using (risk.authz_ve_resultados_riesgo(risk_id));
create policy evento_poliza_leer on risk.evento_poliza for select to risk_persona using (risk.authz_ve_resultados_riesgo(risk_id));
create policy novedad_leer on risk.novedad for select to risk_persona using (risk.authz_ve_resultados_riesgo(risk_id));
create policy revision_pendiente_leer on risk.revision_pendiente for select to risk_persona using (risk.authz_ve_resultados_riesgo(risk_id));
create policy accion_estado_leer on risk.accion_estado for select to risk_persona using (risk.authz_ve_resultados_accion(accion_id));

drop policy persona_leer on risk.persona;
create policy persona_leer on risk.persona for select to risk_persona
  using (id = (select risk.authz_persona())
         or (select risk.authz_es_admin())
         or exists (select 1 from risk.riesgo x where x.autor_persona_id = persona.id)
         or exists (select 1 from risk.accion x where x.autor_persona_id = persona.id)
         or exists (select 1 from risk.evaluacion x where x.autor_persona_id = persona.id)
         or exists (select 1 from risk.accion_estado x where x.autor_persona_id = persona.id)
         or exists (select 1 from risk.transferencia x where x.autor_persona_id = persona.id)
         or exists (select 1 from risk.evento_poliza x where x.autor_persona_id = persona.id)
         or exists (select 1 from risk.revision_humana x where x.revisor_persona_id = persona.id)
         or exists (select 1 from risk.novedad x where x.autor_persona_id = persona.id)
         or exists (select 1 from risk.revision_pendiente x where x.autor_persona_id = persona.id)
         or exists (select 1 from risk.cierre_revision x where x.cerrada_por = persona.id)
         or exists (select 1 from risk.orden_previo x where x.revisor_persona_id = persona.id)
         or exists (select 1 from risk.reordenamiento x where x.autor_persona_id = persona.id));
