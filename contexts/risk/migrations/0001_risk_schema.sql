-- Esquema de Risk OS (T-0028): las entidades del dossier 15a §4 y lo que agregaron las
-- decisiones del owner (SLICES/RO01-decisiones.md): novedades (H2), reordenamiento (5), orden
-- previo del revisor (6) y registro de sesiones y accesos (2).
--
-- El esquema `risk` y su ledger los crea el runner antes de aplicar esta migración
-- (src/persistence/migrations.ts).
--
-- Tres reglas atraviesan todo el archivo:
--
--   1. Sólo inserción (R-22, R-23). Ninguna tabla admite UPDATE, DELETE ni TRUNCATE: lo
--      impide `risk.solo_insercion()`, abajo. Un cambio de estado es una fila nueva (el
--      estado de una acción, una revisión humana, el cierre de una revisión pendiente), y el
--      estado vigente es el de la última. Así el historial de RO01 §2 no es una tabla aparte
--      que alguien tiene que acordarse de escribir: es la base misma, y "nada se sobrescribe
--      ni se borra" lo garantiza Postgres.
--   2. Ningún derivado se guarda como dato (decisión 6a): no hay columna de `C_raw`, banda,
--      banderas, techo, I efectivo ni posición. Los calculan las funciones de
--      `src/domain/metodologia.ts`. La única excepción es `reordenamiento.orden_calculado`,
--      una foto para auditoría que guarda la versión de las funciones que la produjo.
--   3. Las invariantes de una fila o de una relación son restricciones (D-0051), con nombre,
--      y citan la regla del contrato (`contrato/reglas-validacion.csv`) que transcriben. Lo
--      que depende de varias filas a la vez o del estado en otro momento queda para la
--      aplicación, y lo dice `ops/evidence/T-0028.md`.
--
-- Cada tabla nombra en su `comment on table` la superficie de RO01 §2 que la usa.

-- ── Tipos ────────────────────────────────────────────────────────────────────

-- Ids globales: prefijo de la entidad y ULID en Crockford base32 (RV-ID-01). Los cinco
-- primeros son los del contrato; los demás, de los registros que crea Risk OS.
create domain risk.id_riesgo as text constraint id_riesgo_formato check (value ~ '^RSK-[0-9A-HJKMNP-TV-Z]{26}$');
create domain risk.id_evaluacion as text constraint id_evaluacion_formato check (value ~ '^EVA-[0-9A-HJKMNP-TV-Z]{26}$');
create domain risk.id_accion as text constraint id_accion_formato check (value ~ '^ACC-[0-9A-HJKMNP-TV-Z]{26}$');
create domain risk.id_transferencia as text constraint id_transferencia_formato check (value ~ '^TRF-[0-9A-HJKMNP-TV-Z]{26}$');
create domain risk.id_evento as text constraint id_evento_formato check (value ~ '^EVT-[0-9A-HJKMNP-TV-Z]{26}$');
create domain risk.id_persona as text constraint id_persona_formato check (value ~ '^PER-[0-9A-HJKMNP-TV-Z]{26}$');
create domain risk.id_revision as text constraint id_revision_formato check (value ~ '^REV-[0-9A-HJKMNP-TV-Z]{26}$');
create domain risk.id_novedad as text constraint id_novedad_formato check (value ~ '^NOV-[0-9A-HJKMNP-TV-Z]{26}$');
create domain risk.id_reordenamiento as text constraint id_reordenamiento_formato check (value ~ '^ROR-[0-9A-HJKMNP-TV-Z]{26}$');
create domain risk.id_orden_previo as text constraint id_orden_previo_formato check (value ~ '^OPR-[0-9A-HJKMNP-TV-Z]{26}$');

-- Un texto que, si está, dice algo.
create domain risk.texto as text constraint texto_no_vacio check (btrim(value) <> '');
-- Nivel de un factor (RV-FAC-02, RV-FAC-04).
create domain risk.nivel as smallint constraint nivel_1_a_5 check (value between 1 and 5);
-- Procedencia (EMI-17, RV-PRO-01).
create domain risk.base as text constraint base_enum check (value in ('observed', 'reported', 'inferred', 'assumed'));
-- Quién escribió un registro (RV-PRO-04).
create domain risk.actor as text constraint actor_enum check (value in ('human', 'ai', 'import'));
-- Evidencia: al menos una referencia, o `sin_evidencia` solo (RV-PRO-02, RV-PRO-03).
create domain risk.referencias as text[] constraint referencias_validas check (
  cardinality(value) >= 1
  and array_position(value, null) is null
  and array_position(value, '') is null
  and (cardinality(value) = 1 or array_position(value, 'sin_evidencia') is null));
-- Montos (RV-ECO-01, RV-TRF-03) y su moneda ISO 4217.
create domain risk.monto as numeric constraint monto_no_negativo check (value >= 0);
create domain risk.moneda as text constraint moneda_iso_4217 check (value ~ '^[A-Z]{3}$');
-- De dónde viene un registro: del importador (T-0029) o de una sesión de la UI (T-0030). Lo
-- que viene de una sesión tiene autor, y el autor es una persona, nunca un texto (decisión 2).
create domain risk.origen as text constraint origen_enum check (value in ('importacion', 'sesion'));

-- ── Sólo inserción (R-22, R-23) ──────────────────────────────────────────────

-- `search_path` vacío y nombres calificados (T-0023): no depende de quién dispare el trigger.
create function risk.solo_insercion() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'risk.%: sólo inserción; un % no se permite (R-22, R-23)', tg_table_name, lower(tg_op)
    using errcode = 'restrict_violation';
end
$$;

-- ── Personas y accesos ───────────────────────────────────────────────────────

create table risk.persona (
  id         risk.id_persona primary key,
  nombre     risk.texto not null,
  creada_en  timestamptz not null default now()
);
comment on table risk.persona is
  'RO01 §2, Acceso: cada persona con acceso; su credencial la agrega T-0030. Es el autor de todo lo que se escribe desde una sesión (decisión 2 del owner).';

create table risk.registro_acceso (
  id               bigint generated always as identity primary key,
  persona_id       risk.id_persona not null references risk.persona,
  tipo             text not null constraint registro_acceso_tipo check (tipo in ('inicio_sesion', 'vista_resultados')),
  -- Una vista con ranking, bandas o `C_raw` es siempre de una organización (RO01 §3, regla 4).
  organizacion_id  risk.texto,
  vista            risk.texto,
  ocurrido_en      timestamptz not null default now(),
  constraint registro_acceso_vista_de_una_organizacion check (
    (tipo = 'vista_resultados') = (vista is not null and organizacion_id is not null))
);
comment on table risk.registro_acceso is
  'RO01 §2, Acceso: cada inicio de sesión y cada acceso a una vista con resultados, por persona. Comprueba que el orden previo del revisor es anterior (RO01 §6, A8a).';

-- ── Riesgo ───────────────────────────────────────────────────────────────────

create table risk.riesgo (
  id                  risk.id_riesgo primary key,
  -- Opaco y propio de Risk OS, sin clave foránea ni id de `Party` (D-0063, D-0067).
  organizacion_id     risk.texto not null,
  unidad_id           risk.texto,
  tipo_objeto         text not null constraint riesgo_tipo_objeto check (tipo_objeto in ('riesgo', 'padre', 'sub_riesgo', 'escenario')),
  riesgo_padre_id     risk.id_riesgo,
  -- Constante del lado que referencia, para que la clave foránea exija un padre (RV-RSK-03).
  padre_tipo          text generated always as (case when riesgo_padre_id is not null then 'padre' end) stored,
  titulo              risk.texto not null,
  -- En el padre, la consecuencia concreta común (§1.3.5): es lo único que trae además de su identidad.
  consecuencia_comun  risk.texto,
  id_origen           risk.texto,
  lote_origen         risk.texto,
  origen              risk.origen not null,
  autor_persona_id    risk.id_persona references risk.persona,
  registrado_en       timestamptz not null default now(),
  constraint riesgo_id_organizacion unique (id, organizacion_id),
  constraint riesgo_id_tipo unique (id, tipo_objeto),
  constraint riesgo_id_organizacion_tipo unique (id, organizacion_id, tipo_objeto),
  -- RV-RSK-02: sólo el sub-riesgo tiene padre, y siempre.
  constraint riesgo_padre_solo_en_sub_riesgo check ((tipo_objeto = 'sub_riesgo') = (riesgo_padre_id is not null)),
  -- RV-RSK-03: el padre existe, es de tipo padre y de la misma organización.
  constraint riesgo_padre_es_padre_de_la_organizacion foreign key (riesgo_padre_id, organizacion_id, padre_tipo)
    references risk.riesgo (id, organizacion_id, tipo_objeto),
  constraint riesgo_consecuencia_comun_solo_en_padre check (tipo_objeto = 'padre' or consecuencia_comun is null),
  constraint riesgo_lote_con_id_origen check (id_origen is null or lote_origen is not null),
  -- RV-ID-03.
  constraint riesgo_origen_unico unique (lote_origen, id_origen),
  constraint riesgo_autor_de_sesion check (origen = 'importacion' or autor_persona_id is not null)
);
comment on table risk.riesgo is
  'RO01 §2, lista por organización, escenarios, plan de acción y detalle: identidad estable del riesgo (dossier 15a §4, Risk). Un escenario es un riesgo con tipo escenario.';

-- Miembros de un escenario por causa común (§10.3): la lista `miembros` de risks.csv.
create table risk.miembro_escenario (
  escenario_id     risk.id_riesgo not null,
  escenario_tipo   text not null default 'escenario' constraint miembro_escenario_escenario_tipo check (escenario_tipo = 'escenario'),
  miembro_id       risk.id_riesgo not null,
  miembro_tipo     text not null constraint miembro_escenario_miembro_tipo check (miembro_tipo in ('riesgo', 'sub_riesgo')),
  organizacion_id  risk.texto not null,
  primary key (escenario_id, miembro_id),
  -- RV-RSK-05: el escenario y cada miembro son de la misma organización; el miembro no es
  -- padre ni escenario; no se repite (clave primaria).
  constraint miembro_escenario_escenario foreign key (escenario_id, organizacion_id, escenario_tipo)
    references risk.riesgo (id, organizacion_id, tipo_objeto),
  constraint miembro_escenario_miembro foreign key (miembro_id, organizacion_id, miembro_tipo)
    references risk.riesgo (id, organizacion_id, tipo_objeto),
  constraint miembro_escenario_distinto check (escenario_id <> miembro_id)
);
comment on table risk.miembro_escenario is
  'RO01 §2, vistas de la metodología: escenarios agregados como listado de escenarios y sus miembros (decisión 4 del owner).';

-- ── Acción ───────────────────────────────────────────────────────────────────

-- Lo que no cambia de una acción o decisión de tratamiento. Su estado, ejecución y eficacia
-- están en `accion_estado`, una fila por cambio.
create table risk.accion (
  id                      risk.id_accion primary key,
  risk_id                 risk.id_riesgo not null,
  riesgo_tipo             text not null constraint accion_riesgo_no_padre check (riesgo_tipo in ('riesgo', 'sub_riesgo', 'escenario')),
  tipo_registro           text not null constraint accion_tipo_registro check (tipo_registro in ('accion', 'decision_tratamiento')),
  descripcion             risk.texto not null,
  factor_objetivo         text[],
  mecanismo_causal        text,
  -- Hipótesis: nada la lee para escribir un factor (D16).
  cambio_esperado         text,
  decision                text constraint accion_decision check (decision in ('tratar', 'aceptar', 'transferir')),
  fundamento              text,
  fecha_proxima_revision  date,
  fecha_alta              date not null,
  actor                   risk.actor not null,
  base                    risk.base not null,
  evidencia               risk.referencias not null,
  id_origen               risk.texto,
  lote_origen             risk.texto,
  origen                  risk.origen not null,
  autor_persona_id        risk.id_persona references risk.persona,
  registrada_en           timestamptz not null default now(),
  constraint accion_id_riesgo unique (id, risk_id),
  constraint accion_id_tipo unique (id, tipo_registro),
  -- RV-ACC-01, EMI-17: exactamente un riesgo, que no es padre (las acciones van en los hijos).
  constraint accion_riesgo foreign key (risk_id, riesgo_tipo) references risk.riesgo (id, tipo_objeto),
  -- RV-ACC-03: factor objetivo en las acciones, con V siempre por aspecto.
  constraint accion_factor_objetivo check (
    (tipo_registro = 'accion') = (factor_objetivo is not null)
    and (factor_objetivo is null or (cardinality(factor_objetivo) >= 1
      and factor_objetivo <@ array['p', 'i_econ', 'i_pers', 'i_cont', 'i_legal', 'v_cont', 'v_rec']))),
  -- RV-ACC-04 y D16.
  constraint accion_mecanismo_causal check (
    (tipo_registro = 'accion') = (btrim(coalesce(mecanismo_causal, '')) <> '')),
  constraint accion_cambio_esperado_solo_en_accion check (tipo_registro = 'accion' or cambio_esperado is null),
  -- RV-ACC-10: la decisión trae qué se decidió y cuándo se revisa; aceptar, con fundamento.
  constraint accion_decision_completa check (
    (tipo_registro = 'decision_tratamiento') = (decision is not null)
    and (tipo_registro = 'accion' or fecha_proxima_revision is not null)
    and (decision is distinct from 'aceptar' or btrim(coalesce(fundamento, '')) <> '')),
  constraint accion_lote_con_id_origen check (id_origen is null or lote_origen is not null),
  constraint accion_origen_unico unique (lote_origen, id_origen),
  constraint accion_autor_de_sesion check (origen = 'importacion' or autor_persona_id is not null)
);
comment on table risk.accion is
  'RO01 §2, plan de acción y vista de seguridad: acciones y decisiones de tratamiento de un riesgo (dossier 15a §4, Action).';

-- ── Evaluación ───────────────────────────────────────────────────────────────

-- Inmutable bajo una versión (§14, "Insumos"): una corrección es otra evaluación que apunta a
-- la anterior (congelamiento v1, regla 3). Su revisión humana está en `revision_humana`.
create table risk.evaluacion (
  id                      risk.id_evaluacion primary key,
  risk_id                 risk.id_riesgo not null,
  riesgo_tipo             text not null constraint evaluacion_riesgo_no_padre check (riesgo_tipo in ('riesgo', 'sub_riesgo', 'escenario')),
  tipo_evaluacion         text not null constraint evaluacion_tipo check (tipo_evaluacion in ('inicial', 'reevaluacion')),
  evaluacion_anterior_id  risk.id_evaluacion,
  motivo                  text constraint evaluacion_motivo check (motivo in (
                            'accion_ejecutada', 'informacion_nueva', 'correccion_evaluacion', 'cambio_contexto',
                            'cambio_version_metodologia')),
  accion_id               risk.id_accion,
  fecha                   date not null,
  version_metodologia     text not null constraint evaluacion_version_metodologia check (version_metodologia in (
                            'metodologia v0.1', 'metodologia v0.2', 'metodologia v0.3', 'metodologia v1 candidate',
                            'metodologia v1')),
  evaluador               risk.texto not null,
  actor                   risk.actor not null,
  base                    risk.base not null,
  evidencia               risk.referencias not null,
  riesgo_causa            text,
  riesgo_evento           risk.texto not null,
  riesgo_consecuencia     text,
  -- P: estado, valor, rango, observación y procedencia opcional (decisión 3b).
  p_estado        text not null constraint evaluacion_p_estado check (p_estado in ('known', 'unknown')),
  p_valor         risk.nivel,
  p_min           risk.nivel,
  p_max           risk.nivel,
  p_observacion   text,
  p_base          risk.base,
  p_evidencia     risk.referencias,
  constraint evaluacion_p_valor_si_known check ((p_estado = 'known') = (p_valor is not null)),
  constraint evaluacion_p_rango check (
    (p_min is null or p_max is null or p_min <= p_max)
    and (p_valor is null or ((p_min is null or p_min <= p_valor) and (p_max is null or p_valor <= p_max)))),
  constraint evaluacion_p_unknown_con_nota check (p_estado <> 'unknown' or btrim(coalesce(p_observacion, '')) <> ''),
  constraint evaluacion_p_base_con_valor check (p_base is null or p_valor is not null or p_min is not null or p_max is not null),
  -- I económico: estado, valor, rango, observación y procedencia opcional (decisión 3b).
  i_econ_estado        text not null constraint evaluacion_i_econ_estado check (i_econ_estado in ('known', 'unknown')),
  i_econ_valor         risk.nivel,
  i_econ_min           risk.nivel,
  i_econ_max           risk.nivel,
  i_econ_observacion   text,
  i_econ_base          risk.base,
  i_econ_evidencia     risk.referencias,
  constraint evaluacion_i_econ_valor_si_known check ((i_econ_estado = 'known') = (i_econ_valor is not null)),
  constraint evaluacion_i_econ_rango check (
    (i_econ_min is null or i_econ_max is null or i_econ_min <= i_econ_max)
    and (i_econ_valor is null or ((i_econ_min is null or i_econ_min <= i_econ_valor) and (i_econ_max is null or i_econ_valor <= i_econ_max)))),
  constraint evaluacion_i_econ_unknown_con_nota check (i_econ_estado <> 'unknown' or btrim(coalesce(i_econ_observacion, '')) <> ''),
  constraint evaluacion_i_econ_base_con_valor check (i_econ_base is null or i_econ_valor is not null or i_econ_min is not null or i_econ_max is not null),
  -- I personas: estado, valor, rango, observación y procedencia opcional (decisión 3b).
  i_pers_estado        text not null constraint evaluacion_i_pers_estado check (i_pers_estado in ('known', 'unknown')),
  i_pers_valor         risk.nivel,
  i_pers_min           risk.nivel,
  i_pers_max           risk.nivel,
  i_pers_observacion   text,
  i_pers_base          risk.base,
  i_pers_evidencia     risk.referencias,
  constraint evaluacion_i_pers_valor_si_known check ((i_pers_estado = 'known') = (i_pers_valor is not null)),
  constraint evaluacion_i_pers_rango check (
    (i_pers_min is null or i_pers_max is null or i_pers_min <= i_pers_max)
    and (i_pers_valor is null or ((i_pers_min is null or i_pers_min <= i_pers_valor) and (i_pers_max is null or i_pers_valor <= i_pers_max)))),
  constraint evaluacion_i_pers_unknown_con_nota check (i_pers_estado <> 'unknown' or btrim(coalesce(i_pers_observacion, '')) <> ''),
  constraint evaluacion_i_pers_base_con_valor check (i_pers_base is null or i_pers_valor is not null or i_pers_min is not null or i_pers_max is not null),
  -- I continuidad: estado, valor, rango, observación y procedencia opcional (decisión 3b).
  i_cont_estado        text not null constraint evaluacion_i_cont_estado check (i_cont_estado in ('known', 'unknown')),
  i_cont_valor         risk.nivel,
  i_cont_min           risk.nivel,
  i_cont_max           risk.nivel,
  i_cont_observacion   text,
  i_cont_base          risk.base,
  i_cont_evidencia     risk.referencias,
  constraint evaluacion_i_cont_valor_si_known check ((i_cont_estado = 'known') = (i_cont_valor is not null)),
  constraint evaluacion_i_cont_rango check (
    (i_cont_min is null or i_cont_max is null or i_cont_min <= i_cont_max)
    and (i_cont_valor is null or ((i_cont_min is null or i_cont_min <= i_cont_valor) and (i_cont_max is null or i_cont_valor <= i_cont_max)))),
  constraint evaluacion_i_cont_unknown_con_nota check (i_cont_estado <> 'unknown' or btrim(coalesce(i_cont_observacion, '')) <> ''),
  constraint evaluacion_i_cont_base_con_valor check (i_cont_base is null or i_cont_valor is not null or i_cont_min is not null or i_cont_max is not null),
  -- I legal: estado, valor, rango, observación y procedencia opcional (decisión 3b).
  i_legal_estado        text not null constraint evaluacion_i_legal_estado check (i_legal_estado in ('known', 'unknown')),
  i_legal_valor         risk.nivel,
  i_legal_min           risk.nivel,
  i_legal_max           risk.nivel,
  i_legal_observacion   text,
  i_legal_base          risk.base,
  i_legal_evidencia     risk.referencias,
  constraint evaluacion_i_legal_valor_si_known check ((i_legal_estado = 'known') = (i_legal_valor is not null)),
  constraint evaluacion_i_legal_rango check (
    (i_legal_min is null or i_legal_max is null or i_legal_min <= i_legal_max)
    and (i_legal_valor is null or ((i_legal_min is null or i_legal_min <= i_legal_valor) and (i_legal_max is null or i_legal_valor <= i_legal_max)))),
  constraint evaluacion_i_legal_unknown_con_nota check (i_legal_estado <> 'unknown' or btrim(coalesce(i_legal_observacion, '')) <> ''),
  constraint evaluacion_i_legal_base_con_valor check (i_legal_base is null or i_legal_valor is not null or i_legal_min is not null or i_legal_max is not null),
  -- V contención: estado, valor, rango, observación y procedencia opcional (decisión 3b).
  v_cont_estado        text not null constraint evaluacion_v_cont_estado check (v_cont_estado in ('known', 'unknown')),
  v_cont_valor         risk.nivel,
  v_cont_min           risk.nivel,
  v_cont_max           risk.nivel,
  v_cont_observacion   text,
  v_cont_base          risk.base,
  v_cont_evidencia     risk.referencias,
  constraint evaluacion_v_cont_valor_si_known check ((v_cont_estado = 'known') = (v_cont_valor is not null)),
  constraint evaluacion_v_cont_rango check (
    (v_cont_min is null or v_cont_max is null or v_cont_min <= v_cont_max)
    and (v_cont_valor is null or ((v_cont_min is null or v_cont_min <= v_cont_valor) and (v_cont_max is null or v_cont_valor <= v_cont_max)))),
  constraint evaluacion_v_cont_unknown_con_nota check (v_cont_estado <> 'unknown' or btrim(coalesce(v_cont_observacion, '')) <> ''),
  constraint evaluacion_v_cont_base_con_valor check (v_cont_base is null or v_cont_valor is not null or v_cont_min is not null or v_cont_max is not null),
  -- V recuperación: estado, valor, rango, observación y procedencia opcional (decisión 3b).
  v_rec_estado        text not null constraint evaluacion_v_rec_estado check (v_rec_estado in ('known', 'unknown', 'no_aplica')),
  v_rec_valor         risk.nivel,
  v_rec_min           risk.nivel,
  v_rec_max           risk.nivel,
  v_rec_observacion   text,
  v_rec_base          risk.base,
  v_rec_evidencia     risk.referencias,
  constraint evaluacion_v_rec_valor_si_known check ((v_rec_estado = 'known') = (v_rec_valor is not null)),
  constraint evaluacion_v_rec_rango check (
    (v_rec_min is null or v_rec_max is null or v_rec_min <= v_rec_max)
    and (v_rec_valor is null or ((v_rec_min is null or v_rec_min <= v_rec_valor) and (v_rec_max is null or v_rec_valor <= v_rec_max)))),
  constraint evaluacion_v_rec_unknown_con_nota check (v_rec_estado <> 'unknown' or btrim(coalesce(v_rec_observacion, '')) <> ''),
  constraint evaluacion_v_rec_base_con_valor check (v_rec_base is null or v_rec_valor is not null or v_rec_min is not null or v_rec_max is not null),
  constraint evaluacion_v_rec_no_aplica_sin_rango check (v_rec_estado <> 'no_aplica' or (v_rec_min is null and v_rec_max is null)),
  constraint evaluacion_necesidad_validacion check (
    not (p_estado = 'unknown' or i_econ_estado = 'unknown' or i_pers_estado = 'unknown' or i_cont_estado = 'unknown' or i_legal_estado = 'unknown' or v_cont_estado = 'unknown' or v_rec_estado = 'unknown')
    or btrim(coalesce(necesidad_validacion, '')) <> ''),
  i_econ_monto_bruto      risk.monto,
  moneda                  risk.moneda,
  uncertainty             text not null constraint evaluacion_uncertainty check (uncertainty in ('low', 'medium', 'high')),
  uncertainty_nota        text,
  necesidad_validacion    text,
  motivo_no_evaluable     text,
  justificacion           text,
  reglas_aplicadas        text[],
  id_origen               risk.texto,
  lote_origen             risk.texto,
  origen                  risk.origen not null,
  autor_persona_id        risk.id_persona references risk.persona,
  registrada_en           timestamptz not null default now(),
  constraint evaluacion_id_riesgo unique (id, risk_id),
  constraint evaluacion_id_accion unique (id, accion_id),
  -- Decisión 7 de la 15a, RV-RSK-06: el padre no tiene evaluación propia.
  constraint evaluacion_riesgo foreign key (risk_id, riesgo_tipo) references risk.riesgo (id, tipo_objeto),
  -- RV-EVA-01: la inicial no tiene anterior ni motivo; la reevaluación, los dos.
  constraint evaluacion_inicial_o_reevaluacion check (
    (tipo_evaluacion = 'inicial') = (evaluacion_anterior_id is null)
    and (tipo_evaluacion = 'inicial') = (motivo is null)),
  -- RV-EVA-02: la anterior existe y es del mismo riesgo.
  constraint evaluacion_anterior_del_mismo_riesgo foreign key (evaluacion_anterior_id, risk_id)
    references risk.evaluacion (id, risk_id),
  -- RV-EVA-07, decisión 8: ninguna evaluación tiene dos sucesoras. Con una sola inicial por
  -- riesgo (índice de abajo) y la anterior siempre del mismo riesgo, la historia es una cadena.
  constraint evaluacion_sin_ramas unique (evaluacion_anterior_id),
  -- RV-EVA-04: accion_ejecutada nombra su acción, y sólo ese motivo la nombra.
  constraint evaluacion_accion_con_motivo check ((motivo = 'accion_ejecutada') = (accion_id is not null)),
  -- RV-EVA-05 (en parte): la acción existe y es del mismo riesgo. Que esté cumplida depende de
  -- su estado en ese momento: lo comprueba la aplicación.
  constraint evaluacion_accion_del_mismo_riesgo foreign key (accion_id, risk_id) references risk.accion (id, risk_id),
  -- RV-ECO-01.
  constraint evaluacion_monto_con_moneda check (i_econ_monto_bruto is null or moneda is not null),
  -- RV-UNC-02.
  constraint evaluacion_uncertainty_con_nota check (uncertainty = 'low' or btrim(coalesce(uncertainty_nota, '')) <> ''),
  constraint evaluacion_lote_con_id_origen check (id_origen is null or lote_origen is not null),
  constraint evaluacion_origen_unico unique (lote_origen, id_origen),
  constraint evaluacion_autor_de_sesion check (origen = 'importacion' or autor_persona_id is not null)
);
-- RV-EVA-03: una sola evaluación inicial por riesgo.
create unique index evaluacion_una_inicial on risk.evaluacion (risk_id) where tipo_evaluacion = 'inicial';

-- La clave foránea a la anterior se comprueba al final de la sentencia, así que un INSERT de
-- varias filas podría cerrar un ciclo (A→B y B→A) o una fila apuntarse a sí misma. Este
-- trigger exige que la anterior ya esté registrada cuando llega la nueva: con eso, toda
-- reevaluación desciende de la inicial de su riesgo y la historia no tiene ciclos (decisión 8).
create function risk.evaluacion_anterior_registrada() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.evaluacion_anterior_id is not null and not exists (
    select 1 from risk.evaluacion e where e.id = new.evaluacion_anterior_id
  ) then
    raise exception 'risk.evaluacion: la anterior % no está registrada antes que %', new.evaluacion_anterior_id, new.id
      using errcode = 'foreign_key_violation', constraint = 'evaluacion_anterior_registrada';
  end if;
  return new;
end
$$;
create trigger evaluacion_anterior_registrada before insert on risk.evaluacion
  for each row execute function risk.evaluacion_anterior_registrada();
comment on table risk.evaluacion is
  'RO01 §2, actualización, historial, detalle y lista: evaluación inmutable con sus siete factores (dossier 15a §4, Assessment y FactorAssessment). Los derivados no se guardan: los calculan las funciones v1.';

-- ── Estado de una acción ─────────────────────────────────────────────────────

-- Una fila por cambio de estado de una acción (no de una decisión de tratamiento). El estado
-- vigente es el de la última; las anteriores son el historial de RO01 §2.
create table risk.accion_estado (
  id                    bigint generated always as identity primary key,
  accion_id             risk.id_accion not null,
  accion_tipo           text not null default 'accion' constraint accion_estado_solo_acciones check (accion_tipo = 'accion'),
  estado                text not null constraint accion_estado_estado check (estado in ('planificada', 'en_curso', 'cumplida', 'cancelada')),
  fecha_cumplida        date,
  evidencia_ejecucion   risk.referencias,
  efecto                text constraint accion_estado_efecto check (efecto in ('efecto_total', 'efecto_parcial', 'sin_efecto_medible')),
  efecto_nota           text,
  evaluacion_efecto_id  risk.id_evaluacion,
  origen                risk.origen not null,
  autor_persona_id      risk.id_persona references risk.persona,
  registrado_en         timestamptz not null default now(),
  constraint accion_estado_accion foreign key (accion_id, accion_tipo) references risk.accion (id, tipo_registro),
  -- RV-ACC-06, D25: `cumplida` es ejecución verificada, con fecha y al menos una referencia.
  constraint accion_estado_cumplida_con_evidencia check (
    (estado = 'cumplida') = (fecha_cumplida is not null)
    and (estado = 'cumplida') = (evidencia_ejecucion is not null)
    and (evidencia_ejecucion is null or array_position(evidencia_ejecucion, 'sin_evidencia') is null)),
  -- RV-ACC-07 y RV-ACC-09: la eficacia va con la reevaluación que la observó, sólo en una
  -- acción cumplida, y con nota salvo que el efecto sea total.
  constraint accion_estado_efecto_con_reevaluacion check ((efecto is null) = (evaluacion_efecto_id is null)),
  constraint accion_estado_efecto_solo_cumplida check (efecto is null or estado = 'cumplida'),
  constraint accion_estado_efecto_con_nota check (
    efecto is null or efecto = 'efecto_total' or btrim(coalesce(efecto_nota, '')) <> ''),
  -- RV-ACC-08: la reevaluación del efecto tiene motivo accion_ejecutada y nombra esta acción
  -- (sólo esas evaluaciones tienen accion_id), así que también es del mismo riesgo.
  constraint accion_estado_reevaluacion_de_esta_accion foreign key (evaluacion_efecto_id, accion_id)
    references risk.evaluacion (id, accion_id),
  constraint accion_estado_autor_de_sesion check (origen = 'importacion' or autor_persona_id is not null)
);
create index accion_estado_por_accion on risk.accion_estado (accion_id, id);
comment on table risk.accion_estado is
  'RO01 §2, plan de acción, actualización y feed de actividad: estado, ejecución y eficacia de cada acción, una fila por cambio (metodología §11.2).';

-- ── Transferencia ────────────────────────────────────────────────────────────

-- Una cobertura de una póliza sobre un riesgo. `poliza_ref` es una referencia documental
-- local, sin clave foránea a `Policy` (D-0063, D-0067). Ninguna columna entra al cálculo (D17).
create table risk.transferencia (
  id                          risk.id_transferencia primary key,
  risk_id                     risk.id_riesgo not null,
  riesgo_tipo                 text not null constraint transferencia_riesgo_no_padre check (riesgo_tipo in ('riesgo', 'sub_riesgo', 'escenario')),
  poliza_ref                  risk.texto not null,
  cobertura                   risk.texto not null,
  vigencia_desde              date not null,
  vigencia_hasta              date not null,
  limite_monto                risk.monto,
  sublimite_aplicable_monto   risk.monto,
  sublimites_texto            text,
  deducible_monto             risk.monto,
  deducible_texto             text,
  exclusiones                 text,
  exposicion_retenida_monto   risk.monto,
  exposicion_retenida_nota    text,
  suficiencia                 text not null constraint transferencia_suficiencia check (suficiencia in (
                                'suficiente', 'parcial', 'insuficiente', 'sin_cobertura', 'no_evaluada')),
  suficiencia_nota            text,
  moneda                      risk.moneda,
  actor                       risk.actor not null,
  base                        risk.base not null,
  evidencia                   risk.referencias not null,
  uncertainty                 text not null constraint transferencia_uncertainty check (uncertainty in ('low', 'medium', 'high')),
  uncertainty_nota            text,
  id_origen                   risk.texto,
  lote_origen                 risk.texto,
  origen                      risk.origen not null,
  autor_persona_id            risk.id_persona references risk.persona,
  registrada_en               timestamptz not null default now(),
  constraint transferencia_id_riesgo unique (id, risk_id),
  -- RV-TRF-01, EMI-17: exactamente un riesgo, que no es padre.
  constraint transferencia_riesgo foreign key (risk_id, riesgo_tipo) references risk.riesgo (id, tipo_objeto),
  -- RV-TRF-02.
  constraint transferencia_vigencia check (vigencia_desde <= vigencia_hasta),
  -- RV-TRF-03.
  constraint transferencia_montos_con_moneda check (
    num_nonnulls(limite_monto, sublimite_aplicable_monto, deducible_monto, exposicion_retenida_monto) = 0
    or moneda is not null),
  constraint transferencia_uncertainty_con_nota check (uncertainty = 'low' or btrim(coalesce(uncertainty_nota, '')) <> ''),
  constraint transferencia_lote_con_id_origen check (id_origen is null or lote_origen is not null),
  constraint transferencia_origen_unico unique (lote_origen, id_origen),
  constraint transferencia_autor_de_sesion check (origen = 'importacion' or autor_persona_id is not null)
);
comment on table risk.transferencia is
  'RO01 §2, transferencia y actividad: cobertura de una póliza sobre un riesgo, con su suficiencia y exposición retenida (dossier 15a §4, Transfer).';

-- Observación local de un hecho de la póliza, con procedencia; no es un hecho autoritativo
-- de `Policy` (D-0067). No crea una reevaluación ni abre una revisión pendiente (D17).
create table risk.evento_poliza (
  id                 risk.id_evento primary key,
  risk_id            risk.id_riesgo not null,
  transferencia_ref  risk.id_transferencia not null,
  tipo_evento        text not null constraint evento_poliza_tipo check (tipo_evento in (
                       'firma', 'ampliacion', 'renovacion', 'consumo_limite', 'vencimiento', 'cancelacion')),
  fecha_evento       date not null,
  monto_evento       risk.monto,
  moneda             risk.moneda,
  nota_evento        text,
  actor              risk.actor not null,
  base               risk.base not null,
  evidencia          risk.referencias not null,
  id_origen          risk.texto,
  lote_origen        risk.texto,
  origen             risk.origen not null,
  autor_persona_id   risk.id_persona references risk.persona,
  registrado_en      timestamptz not null default now(),
  -- RV-TRF-04: apunta a una cobertura del mismo riesgo.
  constraint evento_poliza_de_una_cobertura_del_riesgo foreign key (transferencia_ref, risk_id)
    references risk.transferencia (id, risk_id),
  -- RV-TRF-05: el consumo del límite trae su monto; fuera de consumo y ampliación, no hay monto.
  constraint evento_poliza_monto check (
    (tipo_evento <> 'consumo_limite' or monto_evento is not null)
    and (tipo_evento in ('consumo_limite', 'ampliacion') or monto_evento is null)),
  -- RV-TRF-03.
  constraint evento_poliza_monto_con_moneda check (monto_evento is null or moneda is not null),
  constraint evento_poliza_lote_con_id_origen check (id_origen is null or lote_origen is not null),
  constraint evento_poliza_origen_unico unique (lote_origen, id_origen),
  constraint evento_poliza_autor_de_sesion check (origen = 'importacion' or autor_persona_id is not null)
);
comment on table risk.evento_poliza is
  'RO01 §2, transferencia y actividad: eventos de póliza como observaciones locales, con su procedencia, y el límite disponible calculado (dossier 15a §4, TransferEvent; D-0067).';

-- ── Revisión humana ──────────────────────────────────────────────────────────

-- Una fila por revisión de una evaluación, acción o cobertura (EMI-17). El `review_status`
-- vigente es el de la última; sin ninguna, `pending`. Una revisión que viene en los CSV entra
-- con el texto de `revisado_por`; desde la UI, el revisor es la persona de la sesión.
create table risk.revision_humana (
  id                   bigint generated always as identity primary key,
  evaluacion_id        risk.id_evaluacion references risk.evaluacion,
  accion_id            risk.id_accion references risk.accion,
  transferencia_id     risk.id_transferencia references risk.transferencia,
  estado               text not null constraint revision_humana_estado check (estado in ('accepted', 'needs_revision', 'rejected')),
  revisado_por_actor   text not null constraint revision_humana_actor check (revisado_por_actor in ('human', 'ai')),
  revisor_persona_id   risk.id_persona references risk.persona,
  revisado_por_origen  risk.texto,
  fecha_revision       date not null,
  origen               risk.origen not null,
  registrada_en        timestamptz not null default now(),
  -- EMI-17: revisa exactamente un registro.
  constraint revision_humana_un_objeto check (num_nonnulls(evaluacion_id, accion_id, transferencia_id) = 1),
  -- RV-REV-03, decisión 4a: sólo una persona deja algo en `accepted`.
  constraint revision_humana_accepted_solo_humano check (estado <> 'accepted' or revisado_por_actor = 'human'),
  -- Decisión 2 del owner: desde una sesión revisa una persona, nunca un nombre escrito a mano.
  constraint revision_humana_revisor check (
    case origen
      when 'sesion' then revisor_persona_id is not null and revisado_por_origen is null and revisado_por_actor = 'human'
      else revisor_persona_id is null and revisado_por_origen is not null
    end)
);
create index revision_humana_por_evaluacion on risk.revision_humana (evaluacion_id, id) where evaluacion_id is not null;
create index revision_humana_por_accion on risk.revision_humana (accion_id, id) where accion_id is not null;
create index revision_humana_por_transferencia on risk.revision_humana (transferencia_id, id) where transferencia_id is not null;
comment on table risk.revision_humana is
  'RO01 §2, revisión humana: review_status de evaluaciones, acciones y coberturas, con quién revisó y cuándo; decide la evaluación vigente (RO01 §3, regla 6).';

-- ── Novedades (H2) ───────────────────────────────────────────────────────────

create table risk.novedad (
  id                risk.id_novedad primary key,
  -- El riesgo siempre; además, la acción o la cobertura si el destino es una de ellas.
  risk_id           risk.id_riesgo not null references risk.riesgo,
  accion_id         risk.id_accion,
  transferencia_id  risk.id_transferencia,
  tipo              text not null constraint novedad_tipo check (tipo in ('comentario', 'informacion_nueva', 'cambio_contexto')),
  texto             risk.texto not null,
  evidencia         risk.referencias not null,
  autor_persona_id  risk.id_persona not null references risk.persona,
  registrada_en     timestamptz not null default now(),
  constraint novedad_id_riesgo_tipo unique (id, risk_id, tipo),
  constraint novedad_un_destino check (num_nonnulls(accion_id, transferencia_id) <= 1),
  constraint novedad_accion_del_riesgo foreign key (accion_id, risk_id) references risk.accion (id, risk_id),
  constraint novedad_transferencia_del_riesgo foreign key (transferencia_id, risk_id) references risk.transferencia (id, risk_id)
);
comment on table risk.novedad is
  'RO01 §2, actualización y feed de actividad: novedades append-only sobre un riesgo, una acción o una cobertura (H2). informacion_nueva y cambio_contexto abren revisión; comentario no.';

-- ── Revisión pendiente ───────────────────────────────────────────────────────

-- La abre un cambio de actividad (dossier 15a §5); la cierra una persona en `cierre_revision`.
create table risk.revision_pendiente (
  id                   risk.id_revision primary key,
  risk_id              risk.id_riesgo not null,
  riesgo_tipo          text not null constraint revision_pendiente_riesgo_no_padre check (riesgo_tipo in ('riesgo', 'sub_riesgo', 'escenario')),
  disparador           text not null constraint revision_pendiente_disparador check (disparador in (
                         'accion_ejecutada', 'informacion_nueva', 'cambio_contexto', 'cambio_version_metodologia')),
  accion_id            risk.id_accion,
  novedad_id           risk.id_novedad,
  version_metodologia  risk.texto,
  origen               risk.origen not null,
  autor_persona_id     risk.id_persona references risk.persona,
  abierta_en           timestamptz not null default now(),
  constraint revision_pendiente_id_riesgo unique (id, risk_id),
  constraint revision_pendiente_riesgo foreign key (risk_id, riesgo_tipo) references risk.riesgo (id, tipo_objeto),
  -- El disparador nombra su referencia, y sólo la suya (dossier 15a §5).
  constraint revision_pendiente_referencia check (
    (disparador = 'accion_ejecutada') = (accion_id is not null)
    and (disparador in ('informacion_nueva', 'cambio_contexto')) = (novedad_id is not null)
    and (disparador = 'cambio_version_metodologia') = (version_metodologia is not null)),
  constraint revision_pendiente_accion_del_riesgo foreign key (accion_id, risk_id) references risk.accion (id, risk_id),
  -- La novedad es del mismo riesgo y de su mismo tipo: un comentario no abre revisión (H2).
  constraint revision_pendiente_novedad_del_riesgo foreign key (novedad_id, risk_id, disparador)
    references risk.novedad (id, risk_id, tipo),
  -- Un disparador abre una sola revisión.
  constraint revision_pendiente_una_por_accion unique (accion_id),
  constraint revision_pendiente_una_por_novedad unique (novedad_id),
  constraint revision_pendiente_una_por_version unique (risk_id, version_metodologia),
  constraint revision_pendiente_autor_de_sesion check (origen = 'importacion' or autor_persona_id is not null)
);
comment on table risk.revision_pendiente is
  'RO01 §2, revisión pendiente: la abre una acción cumplida, una novedad de información nueva o de cambio de contexto, o un cambio de versión; cuenta los ciclos (RO01 §6, A7).';

create table risk.cierre_revision (
  -- Clave primaria: una revisión se cierra una sola vez.
  revision_id        risk.id_revision primary key,
  risk_id            risk.id_riesgo not null,
  resultado          text not null constraint cierre_revision_resultado check (resultado in ('reevaluacion_aceptada', 'sin_cambio')),
  evaluacion_id      risk.id_evaluacion,
  fundamento         text,
  -- Siempre una persona (dossier 15a §5): ni la importación ni una IA cierran una revisión.
  cerrada_por        risk.id_persona not null references risk.persona,
  cerrada_en         timestamptz not null default now(),
  constraint cierre_revision_de_la_revision foreign key (revision_id, risk_id) references risk.revision_pendiente (id, risk_id),
  constraint cierre_revision_evaluacion_del_riesgo foreign key (evaluacion_id, risk_id) references risk.evaluacion (id, risk_id),
  -- Una reevaluación aceptada nombra la evaluación; un "sin cambio" no la tiene y trae fundamento.
  constraint cierre_revision_resultado_completo check (
    (resultado = 'reevaluacion_aceptada') = (evaluacion_id is not null)
    and (resultado <> 'sin_cambio' or btrim(coalesce(fundamento, '')) <> ''))
);
comment on table risk.cierre_revision is
  'RO01 §2, revisión pendiente e historial: cierre de una revisión por una persona, con reevaluación aceptada o "sin cambio" fundamentado (dossier 15a §5).';

-- ── Orden previo del revisor (decisión 6) ────────────────────────────────────

create table risk.orden_previo (
  id                  risk.id_orden_previo primary key,
  organizacion_id     risk.texto not null,
  revisor_persona_id  risk.id_persona not null references risk.persona,
  -- Referencia al material ciego del que salió, sin valores (R-19).
  material_ref        risk.texto not null,
  registrado_en       timestamptz not null default now(),
  constraint orden_previo_id_organizacion unique (id, organizacion_id),
  -- Es previo: uno por revisor y por empresa. Uno posterior a ver resultados ya no lo es.
  constraint orden_previo_uno_por_revisor_y_empresa unique (organizacion_id, revisor_persona_id)
);
comment on table risk.orden_previo is
  'RO01 §2, orden previo del revisor: su orden profesional y sus bandas por empresa, registrados con material ciego antes de su primer acceso a resultados (decisión 6 del owner; RO01 §6, A8a).';

create table risk.orden_previo_item (
  orden_previo_id  risk.id_orden_previo not null,
  organizacion_id  risk.texto not null,
  risk_id          risk.id_riesgo not null,
  posicion         integer not null constraint orden_previo_item_posicion check (posicion >= 1),
  banda            text constraint orden_previo_item_banda check (banda in ('Baja', 'Media', 'Alta', 'Crítica')),
  primary key (orden_previo_id, risk_id),
  constraint orden_previo_item_orden foreign key (orden_previo_id, organizacion_id) references risk.orden_previo (id, organizacion_id),
  constraint orden_previo_item_riesgo_de_la_empresa foreign key (risk_id, organizacion_id) references risk.riesgo (id, organizacion_id)
);
comment on table risk.orden_previo_item is
  'RO01 §2, orden previo del revisor: la posición y la banda que el revisor da a cada riesgo de la empresa.';

-- ── Reordenamiento profesional (decisión 5) ──────────────────────────────────

-- Campos mínimos del dossier 15a §6. Cambia el orden que se muestra, con el calculado al lado;
-- no cambia factores, `C_raw` ni banda.
create table risk.reordenamiento (
  id                    risk.id_reordenamiento primary key,
  organizacion_id       risk.texto not null,
  -- Lo hace un profesional: siempre una persona de la sesión (`autor_actor` = human del dossier).
  autor_persona_id      risk.id_persona not null references risk.persona,
  tipo                  text not null constraint reordenamiento_tipo check (tipo in ('par', 'posicion', 'banda')),
  risk_id_sube          risk.id_riesgo,
  risk_id_baja          risk.id_riesgo,
  risk_id               risk.id_riesgo,
  posicion_profesional  integer constraint reordenamiento_posicion check (posicion_profesional >= 1),
  banda_profesional     text constraint reordenamiento_banda check (banda_profesional in ('Baja', 'Media', 'Alta', 'Crítica')),
  -- Foto del orden calculado en ese momento, para auditoría (decisión 6a): guarda la versión de
  -- las funciones que lo produjeron, y se puede reproducir desde `reordenamiento_vigente`.
  orden_calculado       jsonb not null,
  version_funciones     text not null constraint reordenamiento_version_funciones check (version_funciones in ('metodologia v1')),
  causa                 text not null constraint reordenamiento_causa check (causa in (
                          'desacuerdo_de_criterio_profesional', 'regla_ambigua', 'ficha_insuficiente',
                          'lectura_distinta_del_mismo_hecho', 'limite_de_la_combinacion', 'error_de_aplicacion', 'sin_causa')),
  fundamento            risk.texto not null,
  patron                text not null constraint reordenamiento_patron check (patron in ('familia_s06', 'safety_bajo_economico', 'otro')),
  -- Disparador 1 de la Fase 13: el orden escrito antes de ver resultados, si lo hay.
  orden_previo_id       risk.id_orden_previo,
  registrado_en         timestamptz not null default now(),
  constraint reordenamiento_tipo_completo check (case tipo
    when 'par' then risk_id_sube is not null and risk_id_baja is not null and risk_id_sube <> risk_id_baja
                    and num_nulls(risk_id, posicion_profesional, banda_profesional) = 3
    when 'posicion' then risk_id is not null and posicion_profesional is not null
                    and num_nulls(risk_id_sube, risk_id_baja, banda_profesional) = 3
    else risk_id is not null and banda_profesional is not null
                    and num_nulls(risk_id_sube, risk_id_baja, posicion_profesional) = 3
  end),
  -- El orden es siempre dentro de una organización (§7.1.4).
  constraint reordenamiento_sube_de_la_organizacion foreign key (risk_id_sube, organizacion_id) references risk.riesgo (id, organizacion_id),
  constraint reordenamiento_baja_de_la_organizacion foreign key (risk_id_baja, organizacion_id) references risk.riesgo (id, organizacion_id),
  constraint reordenamiento_riesgo_de_la_organizacion foreign key (risk_id, organizacion_id) references risk.riesgo (id, organizacion_id),
  constraint reordenamiento_orden_previo_de_la_organizacion foreign key (orden_previo_id, organizacion_id)
    references risk.orden_previo (id, organizacion_id)
);
comment on table risk.reordenamiento is
  'RO01 §2, reordenamiento profesional: discrepancia con causa sobre el orden calculado de una organización, con los campos de los disparadores de reapertura (decisión 5; dossier 15a §6).';

-- Las evaluaciones vigentes de los riesgos involucrados cuando se reordenó: con ellas, el orden
-- calculado de ese momento se puede reproducir.
create table risk.reordenamiento_vigente (
  reordenamiento_id  risk.id_reordenamiento not null references risk.reordenamiento,
  evaluacion_id      risk.id_evaluacion not null references risk.evaluacion,
  primary key (reordenamiento_id, evaluacion_id)
);
comment on table risk.reordenamiento_vigente is
  'RO01 §2, reordenamiento profesional: las evaluaciones vigentes con las que se calculó el orden que se reordenó.';

-- ── Sólo inserción en todas las tablas ───────────────────────────────────────

do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'risk' and c.relkind = 'r' and c.relname <> 'schema_migrations'
  loop
    execute format('create trigger solo_insercion before update or delete on risk.%I for each row execute function risk.solo_insercion()', t);
    execute format('create trigger solo_insercion_truncate before truncate on risk.%I for each statement execute function risk.solo_insercion()', t);
  end loop;
end
$$;
