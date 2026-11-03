-- T-0035, incremento 5: identidad común (D-0077) y autorización híbrida (D-0022) en la base
-- de Risk OS. Para quien se conecta hoy sólo agrega cosas.
--
-- Por qué no cambia el comportamiento actual:
--   * En local y en los tests, la app, la CLI y las migraciones se conectan como dueñas de
--     las tablas. `enable row level security` sin `force` no aplica RLS al dueño.
--   * En la base hosteada, la app se conecta como `risk_app` (deploy/rol-app.sql), que no
--     es dueño. Para ese rol cada tabla del esquema tiene la política `legado_risk_app`,
--     que deja pasar todo: ve y escribe lo mismo que antes, con los mismos grants. RO01 §8
--     dice que hoy «todas las personas con acceso pueden todo», y eso sigue así en `legacy`.
--   * `risk_persona` es NOLOGIN. La app sólo lo asume con `set local role` y sólo con
--     AUTH_MODE=oidc (fase 4 del plan de migración, con aprobación del owner). Con INHERIT
--     FALSE, la membresía no da ningún privilegio mientras no lo asuma.
--   * Las tablas nuevas empiezan vacías y ninguna tabla existente cambia.
--
-- Qué agrega, todo dentro del esquema `risk` (D-0063):
--   * Identidad, sobre la `risk.persona` que ya existe, para no perder la autoría (plan de
--     migración, §1): `rol_persona`, `invitacion`, `credencial_externa` (proveedor, sujeto)
--     y `asignacion` de organizaciones. Todas son de sólo inserción, como el resto del
--     esquema: el rol vigente es la última fila y una baja es una fila sin rol.
--   * Auditoría: `evento_auditoria`, estructurada y mínima, sin payloads.
--   * `authz_*`: las funciones de predicado, SECURITY DEFINER con search_path vacío y
--     EXECUTE sólo para `risk_persona` (D-0022, condición 4).
--   * RLS en toda tabla del esquema, con políticas para `risk_persona` según la matriz.
--
-- Matriz (rol × acción × alcance), aprobada por el owner el 2026-11-03 en el hilo de
-- T-0035. Revisor profesional = REVISOR.
--   * Ver resultados: el Administrador ve todas las organizaciones; el Operador y el Revisor,
--     sólo las que tienen asignadas, una por una (D-0027: no hay alcance universal).
--   * Independencia del orden previo: el Revisor no ve evaluaciones, revisiones, cierres,
--     reordenamientos ni el orden previo de otro de una organización hasta registrar el suyo
--     para esa organización (RO01 §6, A8a). Antes, sólo ve el material ciego: los riesgos,
--     sus acciones y sus coberturas, sin evaluar.
--   * Cargar (novedades, plan de acción, coberturas, eventos y reevaluaciones):
--     Administrador y Operador.
--   * Revisar y aceptar evaluaciones, acciones y coberturas, y cerrar revisiones: los tres
--     roles, nunca sobre lo que la misma persona escribió (tampoco un Administrador).
--   * Reordenamiento profesional: los tres roles.
--   * Orden previo con material ciego: sólo el Revisor (RO01 §6, A8a).
--   * Importar y administrar accesos: la CLI del owner, fuera de la app.

-- ── Roles de conexión (D-0022: sin BYPASSRLS, mínimo privilegio) ─────────────

-- `risk_app` lo crea y lo ajusta `deploy/rol-app.sql`, después de migrar. Acá se crea sin
-- LOGIN sólo si todavía no existe, para poder nombrarlo en las políticas; el archivo de
-- despliegue lo deja como siempre.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'risk_app') then
    create role risk_app nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'risk_persona') then
    create role risk_persona nologin nobypassrls nosuperuser nocreatedb nocreaterole noinherit;
  end if;
end
$$;

-- PostgreSQL 16+ no da SET sobre un rol a quien lo creó si no es superusuario (el
-- `postgres` de Supabase): sin esta membresía no se podría probar `set local role`.
grant risk_persona to current_user with inherit false, set true;

-- ── Identidad ────────────────────────────────────────────────────────────────

create table risk.rol_persona (
  id                bigint generated always as identity primary key,
  persona_id        risk.id_persona not null references risk.persona,
  -- Sin rol: la persona está dada de baja en `oidc` y no entra (D-0072).
  rol               text constraint rol_persona_rol check (rol in ('ADMINISTRADOR', 'OPERADOR', 'REVISOR')),
  -- Quién lo decidió. Sin autor: el arranque, cuando todavía no hay un Administrador.
  autor_persona_id  risk.id_persona references risk.persona,
  registrado_en     timestamptz not null default now()
);
create index rol_persona_por_persona on risk.rol_persona (persona_id, id);
comment on table risk.rol_persona is
  'RO01 §2, Acceso: el rol de cada persona en AUTH_MODE=oidc (T-0035). El vigente es el de la última fila; una fila sin rol es la baja, que corta el acceso en el request siguiente.';

create table risk.invitacion (
  id                bigint generated always as identity primary key,
  -- La persona que va a entrar. Para alguien que ya usa Risk OS es su persona de siempre:
  -- así lo que registró con contraseña sigue siendo suyo (plan de migración, fase 4).
  persona_id        risk.id_persona not null references risk.persona,
  email             text not null constraint invitacion_email check (email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
  vence_en          timestamptz not null,
  autor_persona_id  risk.id_persona references risk.persona,
  creada_en         timestamptz not null default now(),
  constraint invitacion_vence_despues check (vence_en > creada_en),
  constraint invitacion_id_persona unique (id, persona_id)
);
create index invitacion_por_email on risk.invitacion (email, id);
comment on table risk.invitacion is
  'RO01 §2, Acceso: sólo se entra con Google por invitación de un Administrador (D-0072). El primer login con ese email verificado la consume creando la credencial externa.';

create table risk.credencial_externa (
  id             bigint generated always as identity primary key,
  persona_id     risk.id_persona not null,
  proveedor      text not null constraint credencial_externa_proveedor check (proveedor in ('google')),
  sujeto         text not null constraint credencial_externa_sujeto check (btrim(sujeto) <> '' and length(sujeto) <= 255),
  -- La invitación que consumió. Una invitación se consume una sola vez.
  invitacion_id  bigint not null constraint credencial_externa_una_por_invitacion unique,
  registrada_en  timestamptz not null default now(),
  -- D-0077: desde el primer login la identidad es el sujeto, no el email.
  constraint credencial_externa_identidad_unica unique (proveedor, sujeto),
  constraint credencial_externa_una_por_persona unique (persona_id, proveedor),
  -- Se vincula sólo a la persona que nombra su invitación.
  constraint credencial_externa_de_su_invitacion foreign key (invitacion_id, persona_id)
    references risk.invitacion (id, persona_id)
);
comment on table risk.credencial_externa is
  'RO01 §2, Acceso: el par (proveedor, sujeto) de Google con que entra una persona en AUTH_MODE=oidc (D-0077). Convive con `credencial` (contraseñas de D-0069) hasta el cierre del plan.';

create table risk.asignacion (
  id                bigint generated always as identity primary key,
  persona_id        risk.id_persona not null references risk.persona,
  organizacion_id   risk.texto not null,
  -- La última fila de (persona, organización) decide: `false` quita la asignación.
  vigente           boolean not null,
  autor_persona_id  risk.id_persona references risk.persona,
  registrada_en     timestamptz not null default now()
);
create index asignacion_por_persona on risk.asignacion (persona_id, organizacion_id, id);
comment on table risk.asignacion is
  'RO01 §2, Acceso: qué organizaciones ve un Operador o un Revisor, una por una (D-0027, T-0035). Un Administrador las ve todas.';

-- ── Auditoría estructurada y mínima ──────────────────────────────────────────

create table risk.evento_auditoria (
  id                bigint generated always as identity primary key,
  ocurrido_en       timestamptz not null default now(),
  actor_persona_id  risk.id_persona references risk.persona,
  origen            text not null constraint evento_auditoria_origen check (origen in ('app', 'cli')),
  accion            text not null constraint evento_auditoria_accion check (accion ~ '^[a-z][a-z0-9_.]{2,63}$'),
  tipo_objeto       text constraint evento_auditoria_tipo_objeto check (tipo_objeto ~ '^[a-z][a-z0-9_]{1,40}$'),
  -- Un id de Risk OS (`RSK-…`, `PER-…`) o de organización, que es opaco (D-0067).
  id_objeto         text constraint evento_auditoria_id_objeto check (length(id_objeto) between 1 and 200),
  resultado         text not null constraint evento_auditoria_resultado check (resultado in ('ok', 'denied', 'error')),
  motivo            text constraint evento_auditoria_motivo check (motivo ~ '^[A-Z][A-Z0-9_]{1,40}$')
);
create index evento_auditoria_por_objeto on risk.evento_auditoria (tipo_objeto, id_objeto, ocurrido_en);
comment on table risk.evento_auditoria is
  'RO01 §2, Acceso: quién hizo qué sobre qué y con qué resultado (T-0035). Sin payloads ni texto libre: ni el texto de una novedad ni un monto caben en estos campos.';

do $$
declare
  tabla text;
begin
  foreach tabla in array array['rol_persona', 'invitacion', 'credencial_externa', 'asignacion', 'evento_auditoria'] loop
    execute format('create trigger solo_insercion before update or delete on risk.%I for each row execute function risk.solo_insercion()', tabla);
    execute format('create trigger solo_insercion_truncate before truncate on risk.%I for each statement execute function risk.solo_insercion()', tabla);
  end loop;
end
$$;

-- ── Funciones de predicado (D-0022) ──────────────────────────────────────────
-- Las únicas fuentes de los predicados: las usan las políticas y la app. SECURITY DEFINER
-- para leer identidad, asignaciones y autores sin depender del RLS de quien llama;
-- search_path vacío y nombres calificados, para que nadie las desvíe con un homónimo.

-- El principal lo fija la app, local a la transacción: set_config('authz.persona_id', x, true).
create function risk.authz_persona_declarada() returns text
language sql stable security definer set search_path = '' as $$
  select nullif(pg_catalog.current_setting('authz.persona_id', true), '')
$$;

create function risk.authz_rol_de(p text) returns text
language sql stable security definer set search_path = '' as $$
  select r.rol from risk.rol_persona r where r.persona_id = p order by r.id desc limit 1
$$;

-- El principal sólo vale si la persona entró con una credencial externa y su rol vigente no
-- es la baja: una baja corta el acceso en el request siguiente (D-0022, condición 6).
create function risk.authz_persona() returns text
language sql stable security definer set search_path = '' as $$
  select p.id::text from risk.persona p
  where p.id = risk.authz_persona_declarada()
    and exists (select 1 from risk.credencial_externa c where c.persona_id = p.id)
    and risk.authz_rol_de(p.id) is not null
$$;

create function risk.authz_rol() returns text
language sql stable security definer set search_path = '' as $$
  select risk.authz_rol_de(risk.authz_persona())
$$;

create function risk.authz_es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(risk.authz_rol() = 'ADMINISTRADOR', false)
$$;

-- Las organizaciones asignadas hoy a quien consulta: la última fila de cada una decide.
create function risk.authz_organizaciones_asignadas() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(pg_catalog.array_agg(u.organizacion_id::text), '{}') from (
    select distinct on (a.organizacion_id) a.organizacion_id, a.vigente
    from risk.asignacion a
    where a.persona_id = risk.authz_persona()
    order by a.organizacion_id, a.id desc
  ) u
  where u.vigente
$$;

create function risk.authz_ve_organizacion(org text) returns boolean
language sql stable security definer set search_path = '' as $$
  select risk.authz_persona() is not null
    and (risk.authz_es_admin() or org = any(risk.authz_organizaciones_asignadas()))
$$;

create function risk.authz_ve_riesgo(rsk text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(risk.authz_ve_organizacion((select r.organizacion_id from risk.riesgo r where r.id = rsk)), false)
$$;

create function risk.authz_ve_accion(acc text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(risk.authz_ve_riesgo((select a.risk_id from risk.accion a where a.id = acc)), false)
$$;

-- Resultados de una organización: lo que da ranking, bandas o `C_raw` (las evaluaciones y lo
-- que las revisa o las ordena). Un Revisor los ve recién después de registrar su orden previo
-- para esa organización: lo exige la base, no sólo la interfaz (decisión del owner, A8a).
create function risk.authz_ve_resultados(org text) returns boolean
language sql stable security definer set search_path = '' as $$
  select risk.authz_ve_organizacion(org)
    and (risk.authz_rol() <> 'REVISOR' or exists (
      select 1 from risk.orden_previo o
      where o.organizacion_id = org and o.revisor_persona_id = risk.authz_persona()))
$$;

create function risk.authz_ve_resultados_riesgo(rsk text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(risk.authz_ve_resultados((select r.organizacion_id from risk.riesgo r where r.id = rsk)), false)
$$;

-- El riesgo del objeto revisado: una evaluación, una acción o una cobertura.
create function risk.authz_riesgo_de(ev text, acc text, trf text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select e.risk_id from risk.evaluacion e where e.id = ev),
    (select a.risk_id from risk.accion a where a.id = acc),
    (select t.risk_id from risk.transferencia t where t.id = trf))
$$;

-- Quién escribió el objeto revisado. `null` si vino de una importación.
create function risk.authz_autor_de(ev text, acc text, trf text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select e.autor_persona_id from risk.evaluacion e where e.id = ev),
    (select a.autor_persona_id from risk.accion a where a.id = acc),
    (select t.autor_persona_id from risk.transferencia t where t.id = trf))
$$;

-- Nadie revisa ni acepta lo que escribió, tampoco un Administrador (T-0035, AD-16).
create function risk.authz_no_es_propio(ev text, acc text, trf text) returns boolean
language sql stable security definer set search_path = '' as $$
  select risk.authz_persona() is not null
    and risk.authz_autor_de(ev, acc, trf) is distinct from risk.authz_persona()
$$;

create function risk.authz_puede_cargar() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(risk.authz_rol() in ('ADMINISTRADOR', 'OPERADOR'), false)
$$;

create function risk.authz_puede_revisar() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(risk.authz_rol() in ('ADMINISTRADOR', 'OPERADOR', 'REVISOR'), false)
$$;

create function risk.authz_puede_reordenar() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(risk.authz_rol() in ('ADMINISTRADOR', 'OPERADOR', 'REVISOR'), false)
$$;

create function risk.authz_puede_orden_previo() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(risk.authz_rol() = 'REVISOR', false)
$$;

-- El autor de un reordenamiento y el revisor de un orden previo: sus filas hijas sólo las
-- escribe esa misma persona.
create function risk.authz_autor_reordenamiento(ror text) returns text
language sql stable security definer set search_path = '' as $$
  select o.autor_persona_id from risk.reordenamiento o where o.id = ror
$$;

create function risk.authz_revisor_orden_previo(opr text) returns text
language sql stable security definer set search_path = '' as $$
  select o.revisor_persona_id from risk.orden_previo o where o.id = opr
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'authz_persona_declarada()', 'authz_rol_de(text)', 'authz_persona()', 'authz_rol()', 'authz_es_admin()',
    'authz_organizaciones_asignadas()', 'authz_ve_organizacion(text)', 'authz_ve_riesgo(text)', 'authz_ve_accion(text)', 'authz_ve_resultados(text)', 'authz_ve_resultados_riesgo(text)',
    'authz_riesgo_de(text, text, text)', 'authz_autor_de(text, text, text)', 'authz_no_es_propio(text, text, text)',
    'authz_puede_cargar()', 'authz_puede_revisar()', 'authz_puede_reordenar()', 'authz_puede_orden_previo()',
    'authz_autor_reordenamiento(text)', 'authz_revisor_orden_previo(text)'
  ] loop
    execute format('revoke all on function risk.%s from public', f);
    execute format('grant execute on function risk.%s to risk_persona', f);
  end loop;
end
$$;

-- ── RLS en toda tabla del esquema ────────────────────────────────────────────
-- Sin `force`: el dueño sigue exento. `risk_app` pasa por `legado_risk_app` (ver la
-- cabecera). Una tabla sin política para `risk_persona` queda vacía para ese rol: no ve
-- contraseñas, intentos fallidos, lotes ni el ledger de migraciones.

do $$
declare
  tabla text;
begin
  for tabla in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'risk' and c.relkind = 'r'
  loop
    execute format('alter table risk.%I enable row level security', tabla);
    execute format('create policy legado_risk_app on risk.%I for all to risk_app using (true) with check (true)', tabla);
  end loop;
end
$$;

grant usage on schema risk to risk_persona;

-- Quién escribió qué: los nombres de las personas, para el historial y la autoría.
grant select on risk.persona to risk_persona;
create policy persona_leer on risk.persona for select to risk_persona
  using ((select risk.authz_persona()) is not null);

-- Lo que se ve de una organización: sólo si la persona la ve.
grant select on risk.riesgo, risk.miembro_escenario, risk.orden_previo, risk.orden_previo_item,
  risk.reordenamiento, risk.reordenamiento_vigente to risk_persona;
create policy riesgo_leer on risk.riesgo for select to risk_persona using (risk.authz_ve_organizacion(organizacion_id));
create policy miembro_escenario_leer on risk.miembro_escenario for select to risk_persona using (risk.authz_ve_organizacion(organizacion_id));
-- El orden previo propio se ve siempre; el de otro revisor, recién con el propio registrado.
create policy orden_previo_leer on risk.orden_previo for select to risk_persona
  using (risk.authz_ve_organizacion(organizacion_id)
         and (revisor_persona_id = (select risk.authz_persona()) or risk.authz_ve_resultados(organizacion_id)));
create policy orden_previo_item_leer on risk.orden_previo_item for select to risk_persona
  using (risk.authz_ve_organizacion(organizacion_id)
         and (risk.authz_revisor_orden_previo(orden_previo_id) = (select risk.authz_persona())
              or risk.authz_ve_resultados(organizacion_id)));
create policy reordenamiento_leer on risk.reordenamiento for select to risk_persona using (risk.authz_ve_resultados(organizacion_id));
create policy reordenamiento_vigente_leer on risk.reordenamiento_vigente for select to risk_persona using (risk.authz_ve_resultados(organizacion_id));

grant select on risk.accion, risk.evaluacion, risk.transferencia, risk.evento_poliza, risk.novedad,
  risk.revision_pendiente, risk.cierre_revision, risk.accion_estado, risk.revision_humana to risk_persona;
create policy accion_leer on risk.accion for select to risk_persona using (risk.authz_ve_riesgo(risk_id));
create policy evaluacion_leer on risk.evaluacion for select to risk_persona using (risk.authz_ve_resultados_riesgo(risk_id));
create policy transferencia_leer on risk.transferencia for select to risk_persona using (risk.authz_ve_riesgo(risk_id));
create policy evento_poliza_leer on risk.evento_poliza for select to risk_persona using (risk.authz_ve_riesgo(risk_id));
create policy novedad_leer on risk.novedad for select to risk_persona using (risk.authz_ve_riesgo(risk_id));
create policy revision_pendiente_leer on risk.revision_pendiente for select to risk_persona using (risk.authz_ve_riesgo(risk_id));
create policy cierre_revision_leer on risk.cierre_revision for select to risk_persona using (risk.authz_ve_resultados_riesgo(risk_id));
create policy accion_estado_leer on risk.accion_estado for select to risk_persona using (risk.authz_ve_accion(accion_id));
create policy revision_humana_leer on risk.revision_humana for select to risk_persona
  using (risk.authz_ve_resultados_riesgo(risk.authz_riesgo_de(evaluacion_id, accion_id, transferencia_id)));

-- Cargar: Administrador y Operador, a su nombre, en lo que ven.
grant insert on risk.novedad, risk.accion, risk.accion_estado, risk.evaluacion, risk.transferencia,
  risk.evento_poliza, risk.revision_pendiente to risk_persona;
create policy novedad_cargar on risk.novedad for insert to risk_persona
  with check ((select risk.authz_puede_cargar()) and risk.authz_ve_riesgo(risk_id)
              and autor_persona_id = (select risk.authz_persona()));
create policy accion_cargar on risk.accion for insert to risk_persona
  with check ((select risk.authz_puede_cargar()) and risk.authz_ve_riesgo(risk_id)
              and origen = 'sesion' and autor_persona_id = (select risk.authz_persona()));
create policy accion_estado_cargar on risk.accion_estado for insert to risk_persona
  with check ((select risk.authz_puede_cargar()) and risk.authz_ve_accion(accion_id)
              and origen = 'sesion' and autor_persona_id = (select risk.authz_persona()));
create policy evaluacion_cargar on risk.evaluacion for insert to risk_persona
  with check ((select risk.authz_puede_cargar()) and risk.authz_ve_riesgo(risk_id)
              and origen = 'sesion' and autor_persona_id = (select risk.authz_persona()));
create policy transferencia_cargar on risk.transferencia for insert to risk_persona
  with check ((select risk.authz_puede_cargar()) and risk.authz_ve_riesgo(risk_id)
              and origen = 'sesion' and autor_persona_id = (select risk.authz_persona()));
create policy evento_poliza_cargar on risk.evento_poliza for insert to risk_persona
  with check ((select risk.authz_puede_cargar()) and risk.authz_ve_riesgo(risk_id)
              and origen = 'sesion' and autor_persona_id = (select risk.authz_persona()));
-- La abre quien carga la novedad o cumple la acción, en la misma transacción.
create policy revision_pendiente_cargar on risk.revision_pendiente for insert to risk_persona
  with check ((select risk.authz_puede_cargar()) and risk.authz_ve_riesgo(risk_id)
              and origen = 'sesion' and autor_persona_id = (select risk.authz_persona()));

-- Revisar y cerrar: los tres roles, a su nombre, nunca sobre lo propio.
grant insert on risk.revision_humana, risk.cierre_revision to risk_persona;
create policy revision_humana_revisar on risk.revision_humana for insert to risk_persona
  with check ((select risk.authz_puede_revisar())
              and risk.authz_ve_resultados_riesgo(risk.authz_riesgo_de(evaluacion_id, accion_id, transferencia_id))
              and origen = 'sesion' and revisor_persona_id = (select risk.authz_persona())
              and risk.authz_no_es_propio(evaluacion_id, accion_id, transferencia_id));
create policy cierre_revision_cerrar on risk.cierre_revision for insert to risk_persona
  with check ((select risk.authz_puede_revisar()) and risk.authz_ve_resultados_riesgo(risk_id)
              and cerrada_por = (select risk.authz_persona())
              and (evaluacion_id is null or risk.authz_no_es_propio(evaluacion_id, null, null)));

-- Reordenar: los tres roles, a su nombre.
grant insert on risk.reordenamiento, risk.reordenamiento_vigente to risk_persona;
create policy reordenamiento_reordenar on risk.reordenamiento for insert to risk_persona
  with check ((select risk.authz_puede_reordenar()) and risk.authz_ve_resultados(organizacion_id)
              and autor_persona_id = (select risk.authz_persona()));
create policy reordenamiento_vigente_reordenar on risk.reordenamiento_vigente for insert to risk_persona
  with check ((select risk.authz_puede_reordenar()) and risk.authz_ve_resultados(organizacion_id)
              and risk.authz_autor_reordenamiento(reordenamiento_id) = (select risk.authz_persona()));

-- Orden previo: sólo el Revisor, a su nombre.
grant insert on risk.orden_previo, risk.orden_previo_item to risk_persona;
create policy orden_previo_registrar on risk.orden_previo for insert to risk_persona
  with check ((select risk.authz_puede_orden_previo()) and risk.authz_ve_organizacion(organizacion_id)
              and revisor_persona_id = (select risk.authz_persona()));
create policy orden_previo_item_registrar on risk.orden_previo_item for insert to risk_persona
  with check ((select risk.authz_puede_orden_previo()) and risk.authz_ve_organizacion(organizacion_id)
              and risk.authz_revisor_orden_previo(orden_previo_id) = (select risk.authz_persona()));

-- Registro de accesos (A8a): cada persona registra los suyos y lee los suyos.
grant select, insert on risk.registro_acceso to risk_persona;
create policy registro_acceso_leer on risk.registro_acceso for select to risk_persona
  using (persona_id = (select risk.authz_persona()) or (select risk.authz_es_admin()));
create policy registro_acceso_registrar on risk.registro_acceso for insert to risk_persona
  with check (persona_id = (select risk.authz_persona())
              and (organizacion_id is null or risk.authz_ve_organizacion(organizacion_id)));

-- Identidad: cada persona ve lo suyo; un Administrador ve todo. Nadie la escribe desde la
-- app: la administra la CLI del owner.
grant select on risk.rol_persona, risk.credencial_externa, risk.asignacion, risk.invitacion to risk_persona;
create policy rol_persona_leer on risk.rol_persona for select to risk_persona
  using (persona_id = (select risk.authz_persona()) or (select risk.authz_es_admin()));
create policy credencial_externa_leer on risk.credencial_externa for select to risk_persona
  using (persona_id = (select risk.authz_persona()) or (select risk.authz_es_admin()));
create policy asignacion_leer on risk.asignacion for select to risk_persona
  using (persona_id = (select risk.authz_persona()) or (select risk.authz_es_admin()));
create policy invitacion_leer on risk.invitacion for select to risk_persona
  using ((select risk.authz_es_admin()));

-- Auditoría: la escribe la app a nombre de quien actúa; la lee un Administrador.
grant select, insert on risk.evento_auditoria to risk_persona;
create policy evento_auditoria_escribir on risk.evento_auditoria for insert to risk_persona
  with check (origen = 'app' and actor_persona_id is not distinct from (select risk.authz_persona()));
create policy evento_auditoria_leer on risk.evento_auditoria for select to risk_persona
  using ((select risk.authz_es_admin()));
