-- T-0035, puntos 2, 3 y 6 de la revisión ciega retrospectiva (REVIEWS/T-0035-blind-review.md),
-- que el owner pidió cerrar en un PR aparte antes de la fase 4. Los tres exigían SQL directo
-- como `risk_persona`, que la aplicación no tiene; acá los cierra también la base (D-0022).
--
-- 2. Orden previo vacío. `authz_ve_resultados` aceptaba cualquier `orden_previo` del Revisor,
--    aunque no tuviera ítems. Ahora exige que cubra cada riesgo y cada padre de la
--    organización registrados hasta ese momento, como ya exige la aplicación. Los riesgos
--    que se cargan después no le quitan los resultados. Para que ese corte no se pueda
--    correr hacia atrás, el Revisor ya no elige `registrado_en`: es el momento de la
--    transacción que lo inserta.
--
-- 3. Funciones `authz_*` que devolvían datos fuera del alcance. Las que sólo usan otras
--    funciones (`authz_rol_de`, `authz_organizaciones_asignadas`, `authz_autor_de`) dejan de
--    ser ejecutables por `risk_persona`: corren igual dentro de las demás, con los permisos
--    de su dueño. Las que usan las políticas devuelven sólo lo que quien consulta ya puede
--    saber: `authz_riesgo_de` el riesgo si lo ve, y las de autor o revisor el id sólo si es
--    el de quien consulta. Las políticas que las comparan con `authz_persona()` deciden lo
--    mismo que antes.
--
-- 6. Eventos de auditoría arbitrarios. `risk_persona` podía escribir cualquier acción a su
--    nombre, por ejemplo `persona.dar_de_baja` con resultado `ok`. Ahora sólo las de la
--    matriz de riesgos (`riesgo.*`); las de acceso y de personas las escriben la conexión
--    de la app y la CLI.

-- ── 2. Orden previo que cubre el material ciego ──────────────────────────────

create or replace function risk.authz_ve_resultados(org text) returns boolean
language sql stable security definer set search_path = '' as $$
  select risk.authz_ve_organizacion(org)
    and (risk.authz_rol() <> 'REVISOR' or exists (
      select 1 from risk.orden_previo o
      where o.organizacion_id = org and o.revisor_persona_id = risk.authz_persona()
        and not exists (
          select 1 from risk.riesgo r
          where r.organizacion_id = org and r.tipo_objeto in ('riesgo', 'padre')
            and r.registrado_en <= o.registrado_en
            and not exists (
              select 1 from risk.orden_previo_item i where i.orden_previo_id = o.id and i.risk_id = r.id))))
$$;

drop policy orden_previo_registrar on risk.orden_previo;
create policy orden_previo_registrar on risk.orden_previo for insert to risk_persona
  with check ((select risk.authz_puede_orden_previo()) and risk.authz_ve_organizacion(organizacion_id)
              and revisor_persona_id = (select risk.authz_persona())
              and registrado_en = pg_catalog.now());

-- ── 3. Funciones que no dejan ver lo que RLS oculta ──────────────────────────

revoke execute on function risk.authz_rol_de(text) from risk_persona;
revoke execute on function risk.authz_organizaciones_asignadas() from risk_persona;
revoke execute on function risk.authz_autor_de(text, text, text) from risk_persona;

create or replace function risk.authz_riesgo_de(ev text, acc text, trf text) returns text
language sql stable security definer set search_path = '' as $$
  select x.risk_id from (
    select coalesce(
      (select e.risk_id from risk.evaluacion e where e.id = ev),
      (select a.risk_id from risk.accion a where a.id = acc),
      (select t.risk_id from risk.transferencia t where t.id = trf)) as risk_id
  ) x
  where risk.authz_ve_riesgo(x.risk_id)
$$;

create or replace function risk.authz_autor_reordenamiento(ror text) returns text
language sql stable security definer set search_path = '' as $$
  select o.autor_persona_id from risk.reordenamiento o
  where o.id = ror and o.autor_persona_id = risk.authz_persona()
$$;

create or replace function risk.authz_revisor_orden_previo(opr text) returns text
language sql stable security definer set search_path = '' as $$
  select o.revisor_persona_id from risk.orden_previo o
  where o.id = opr and o.revisor_persona_id = risk.authz_persona()
$$;

create or replace function risk.authz_autor_revision(rev text) returns text
language sql stable security definer set search_path = '' as $$
  select r.autor_persona_id from risk.revision_pendiente r
  where r.id = rev and r.autor_persona_id = risk.authz_persona()
$$;

-- ── 6. Auditoría: sólo acciones de la matriz de riesgos ──────────────────────

drop policy evento_auditoria_escribir on risk.evento_auditoria;
create policy evento_auditoria_escribir on risk.evento_auditoria for insert to risk_persona
  with check (origen = 'app' and actor_persona_id is not distinct from (select risk.authz_persona())
              and accion like 'riesgo.%');
