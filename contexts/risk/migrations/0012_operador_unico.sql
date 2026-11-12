-- T-0041 (SOU-01a): aprobación interna por operador único (D-0083). Para quien se conecta hoy
-- sólo agrega una tabla vacía y una columna en `false`: sin revisión de IA registrada, todo
-- sigue como en 0006 y 0007.
--
-- D-0083 deja que el autor apruebe lo propio, sólo para uso interno, si hay una revisión de IA
-- registrada y pasaron 24 horas desde el último cambio material. Acá:
--
--   * La versión es la fila: una evaluación, una acción o una cobertura no se editan, y un
--     cambio material es otra fila (una reevaluación). El estado de una acción y los eventos de
--     una póliza son hechos aparte, con su propia tabla. Por eso la revisión de IA nombra una
--     fila exacta y las 24 horas se cuentan desde el `registrada_en` de esa fila, con la hora
--     de la base. Una fila nueva necesita su revisión de IA y su espera.
--   * `revision_ia`: modelo, hallazgos y correcciones de la revisión de IA de una fila. La
--     escribe la CLI del owner (`revision-ia`); `risk_persona` sólo la lee.
--   * `aprobacion_interna` en `revision_humana` y en `cierre_revision`: la revisión o el cierre
--     que hizo el autor de lo revisado. Un trigger la acepta sólo si quien revisa es el autor,
--     es Administrador, la fila tiene revisión de IA y tiene 24 horas. Vale para toda conexión:
--     la marca nunca queda puesta sin cumplir, tampoco en `legacy`.
--   * Para `risk_persona`, las políticas de 0006 y 0007 pasan de «nunca lo propio» a «lo propio
--     sólo con la marca, lo ajeno sólo sin ella». El alcance por organización no cambia. Cerrar
--     «sin cambio» la revisión que uno abrió sigue negado, sin excepción.
--   * `risk_persona` no elige el `registrada_en` de lo que carga: no puede ser anterior a su
--     transacción. Sin esto, la espera se saltearía con SQL directo.
--
-- La marca no habilita exportar, publicar ni entregar al cliente: eso lo rechaza el servidor
-- (`exigirEntregable`, SOU-01b).

create table risk.revision_ia (
  id                bigint generated always as identity primary key,
  evaluacion_id     risk.id_evaluacion references risk.evaluacion,
  accion_id         risk.id_accion references risk.accion,
  transferencia_id  risk.id_transferencia references risk.transferencia,
  modelo            risk.texto not null,
  hallazgos         risk.texto not null,
  correcciones      text,
  registrada_por    risk.id_persona not null references risk.persona,
  registrada_en     timestamptz not null default now(),
  -- Revisa exactamente una fila, que es una versión.
  constraint revision_ia_un_objeto check (num_nonnulls(evaluacion_id, accion_id, transferencia_id) = 1)
);
create index revision_ia_por_evaluacion on risk.revision_ia (evaluacion_id) where evaluacion_id is not null;
create index revision_ia_por_accion on risk.revision_ia (accion_id) where accion_id is not null;
create index revision_ia_por_transferencia on risk.revision_ia (transferencia_id) where transferencia_id is not null;
comment on table risk.revision_ia is
  'RO01 §2, revisión humana: la revisión de IA de una evaluación, acción o cobertura, con modelo, hallazgos y correcciones (D-0083, T-0041). Sin ella el autor no aprueba lo propio.';

create trigger solo_insercion before update or delete on risk.revision_ia
  for each row execute function risk.solo_insercion();
create trigger solo_insercion_truncate before truncate on risk.revision_ia
  for each statement execute function risk.solo_insercion();
alter table risk.revision_ia enable row level security;
create policy legado_risk_app on risk.revision_ia for all to risk_app using (true) with check (true);

grant select on risk.revision_ia to risk_persona;
create policy revision_ia_leer on risk.revision_ia for select to risk_persona
  using (risk.authz_ve_resultados_riesgo(risk.authz_riesgo_de(evaluacion_id, accion_id, transferencia_id)));

alter table risk.revision_humana add column aprobacion_interna boolean not null default false;
alter table risk.cierre_revision add column aprobacion_interna boolean not null default false;
comment on column risk.revision_humana.aprobacion_interna is
  'Aprobación interna por operador único (D-0083): la revisó su autor. No habilita exportar, publicar ni entregar al cliente.';
comment on column risk.cierre_revision.aprobacion_interna is
  'Aprobación interna por operador único (D-0083): cerró la revisión el autor de la reevaluación.';

-- Las condiciones de D-0083 para que `quien` apruebe esa fila como propia. Sólo la usan los dos
-- triggers de abajo, que corren como su dueño.
create function risk.aprobacion_interna_cumple(ev text, acc text, trf text, quien text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    risk.authz_autor_de(ev, acc, trf) = quien
    and risk.authz_rol_de(quien) = 'ADMINISTRADOR'
    and exists (select 1 from risk.revision_ia i
                where i.evaluacion_id = ev or i.accion_id = acc or i.transferencia_id = trf)
    and coalesce(
          (select e.registrada_en from risk.evaluacion e where e.id = ev),
          (select a.registrada_en from risk.accion a where a.id = acc),
          (select t.registrada_en from risk.transferencia t where t.id = trf))
        <= pg_catalog.now() - interval '24 hours',
    false)
$$;
revoke all on function risk.aprobacion_interna_cumple(text, text, text, text) from public;

create function risk.revision_humana_aprobacion_interna() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not risk.aprobacion_interna_cumple(new.evaluacion_id, new.accion_id, new.transferencia_id, new.revisor_persona_id) then
    raise exception 'risk.revision_humana: la aprobación interna la hace el autor, Administrador, con revisión de IA de esa versión y 24 horas desde su registro (D-0083)'
      using errcode = 'check_violation', constraint = 'revision_humana_aprobacion_interna';
  end if;
  return new;
end
$$;
revoke all on function risk.revision_humana_aprobacion_interna() from public;
create trigger revision_humana_aprobacion_interna after insert on risk.revision_humana
  for each row when (new.aprobacion_interna) execute function risk.revision_humana_aprobacion_interna();

-- Sólo un cierre con la reevaluación propia: «sin cambio» no tiene aprobación interna.
create function risk.cierre_revision_aprobacion_interna() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.evaluacion_id is null or not risk.aprobacion_interna_cumple(new.evaluacion_id, null, null, new.cerrada_por) then
    raise exception 'risk.cierre_revision: la aprobación interna la hace el autor de la reevaluación, Administrador, con revisión de IA de esa versión y 24 horas desde su registro (D-0083)'
      using errcode = 'check_violation', constraint = 'cierre_revision_aprobacion_interna';
  end if;
  return new;
end
$$;
revoke all on function risk.cierre_revision_aprobacion_interna() from public;
create trigger cierre_revision_aprobacion_interna after insert on risk.cierre_revision
  for each row when (new.aprobacion_interna) execute function risk.cierre_revision_aprobacion_interna();

-- Revisar y cerrar como `risk_persona`: lo propio sólo con la marca, lo ajeno sólo sin ella.
drop policy revision_humana_revisar on risk.revision_humana;
create policy revision_humana_revisar on risk.revision_humana for insert to risk_persona
  with check ((select risk.authz_puede_revisar())
              and risk.authz_ve_resultados_riesgo(risk.authz_riesgo_de(evaluacion_id, accion_id, transferencia_id))
              and origen = 'sesion' and revisor_persona_id = (select risk.authz_persona())
              and aprobacion_interna = (not risk.authz_no_es_propio(evaluacion_id, accion_id, transferencia_id)));

drop policy cierre_revision_cerrar on risk.cierre_revision;
create policy cierre_revision_cerrar on risk.cierre_revision for insert to risk_persona
  with check ((select risk.authz_puede_revisar()) and risk.authz_ve_resultados_riesgo(risk_id)
              and cerrada_por = (select risk.authz_persona())
              and (evaluacion_id is null or aprobacion_interna = (not risk.authz_no_es_propio(evaluacion_id, null, null)))
              and (evaluacion_id is not null
                   or risk.authz_autor_revision(revision_id) is distinct from (select risk.authz_persona())));

-- La espera se cuenta con la hora de la base: `risk_persona` no registra nada con fecha anterior.
create policy evaluacion_registrada_ahora on risk.evaluacion as restrictive for insert to risk_persona
  with check (registrada_en >= pg_catalog.now());
create policy accion_registrada_ahora on risk.accion as restrictive for insert to risk_persona
  with check (registrada_en >= pg_catalog.now());
create policy transferencia_registrada_ahora on risk.transferencia as restrictive for insert to risk_persona
  with check (registrada_en >= pg_catalog.now());
