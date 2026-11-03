-- Reversa de 0008: vuelven las definiciones de 0006 y 0007.
drop policy evento_auditoria_escribir on risk.evento_auditoria;
create policy evento_auditoria_escribir on risk.evento_auditoria for insert to risk_persona
  with check (origen = 'app' and actor_persona_id is not distinct from (select risk.authz_persona()));

create or replace function risk.authz_autor_revision(rev text) returns text
language sql stable security definer set search_path = '' as $$
  select r.autor_persona_id from risk.revision_pendiente r where r.id = rev
$$;

create or replace function risk.authz_revisor_orden_previo(opr text) returns text
language sql stable security definer set search_path = '' as $$
  select o.revisor_persona_id from risk.orden_previo o where o.id = opr
$$;

create or replace function risk.authz_autor_reordenamiento(ror text) returns text
language sql stable security definer set search_path = '' as $$
  select o.autor_persona_id from risk.reordenamiento o where o.id = ror
$$;

create or replace function risk.authz_riesgo_de(ev text, acc text, trf text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select e.risk_id from risk.evaluacion e where e.id = ev),
    (select a.risk_id from risk.accion a where a.id = acc),
    (select t.risk_id from risk.transferencia t where t.id = trf))
$$;

grant execute on function risk.authz_rol_de(text) to risk_persona;
grant execute on function risk.authz_organizaciones_asignadas() to risk_persona;
grant execute on function risk.authz_autor_de(text, text, text) to risk_persona;

drop policy orden_previo_registrar on risk.orden_previo;
create policy orden_previo_registrar on risk.orden_previo for insert to risk_persona
  with check ((select risk.authz_puede_orden_previo()) and risk.authz_ve_organizacion(organizacion_id)
              and revisor_persona_id = (select risk.authz_persona()));

create or replace function risk.authz_ve_resultados(org text) returns boolean
language sql stable security definer set search_path = '' as $$
  select risk.authz_ve_organizacion(org)
    and (risk.authz_rol() <> 'REVISOR' or exists (
      select 1 from risk.orden_previo o
      where o.organizacion_id = org and o.revisor_persona_id = risk.authz_persona()))
$$;
