-- Reversa de 0006. `risk_app` no se borra: lo crea y lo administra deploy/rol-app.sql, y puede
-- ser anterior a esta migración. `risk_persona` se borra si nadie más depende de él.
do $$
declare
  p record;
  tabla text;
begin
  for p in
    select pol.polname, c.relname from pg_policy pol join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'risk'
  loop
    execute format('drop policy %I on risk.%I', p.polname, p.relname);
  end loop;
  for tabla in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'risk' and c.relkind = 'r'
  loop
    execute format('alter table risk.%I disable row level security', tabla);
  end loop;
end
$$;

drop function risk.authz_revisor_orden_previo(text);
drop function risk.authz_autor_reordenamiento(text);
drop function risk.authz_puede_orden_previo();
drop function risk.authz_puede_reordenar();
drop function risk.authz_puede_revisar();
drop function risk.authz_puede_cargar();
drop function risk.authz_no_es_propio(text, text, text);
drop function risk.authz_autor_de(text, text, text);
drop function risk.authz_riesgo_de(text, text, text);
drop function risk.authz_ve_resultados_riesgo(text);
drop function risk.authz_ve_resultados(text);
drop function risk.authz_ve_accion(text);
drop function risk.authz_ve_riesgo(text);
drop function risk.authz_ve_organizacion(text);
drop function risk.authz_organizaciones_asignadas();
drop function risk.authz_es_admin();
drop function risk.authz_rol();
drop function risk.authz_persona();
drop function risk.authz_rol_de(text);
drop function risk.authz_persona_declarada();

drop table risk.evento_auditoria;
drop table risk.asignacion;
drop table risk.credencial_externa;
drop table risk.invitacion;
drop table risk.rol_persona;

revoke all on all tables in schema risk from risk_persona;
revoke usage on schema risk from risk_persona;

do $$
begin
  drop role risk_persona;
exception
  when dependent_objects_still_exist then
    raise notice 'risk_persona sigue en uso en otra base; queda sin permisos sobre risk';
end
$$;
