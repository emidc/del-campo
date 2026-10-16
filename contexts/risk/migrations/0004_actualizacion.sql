-- Actualización, revisión pendiente e historial (T-0031): las invariantes de varias filas que
-- T-0028 dejó para la aplicación (`ops/evidence/T-0028.md`, «Lo que la base no hace cumplir») y
-- que la base puede comprobar en el momento de cada escritura.
--
-- No hay tablas nuevas: el esquema de T-0028 ya tiene novedades, revisiones pendientes y su
-- cierre, estados de acción, reordenamiento y orden previo, todo de sólo inserción. Lo que
-- agrega esta migración son reglas sobre el orden en que esas filas pueden llegar:
--
--   1. Una persona de una sesión escribe como `human` (decisión 2 del owner; EMI-17): nada que
--      venga de una sesión es de una IA.
--   2. El estado de una acción sigue un orden: `cancelada` es final y `cumplida` sólo admite
--      sumar su eficacia (metodología §11.2).
--   3. Una reevaluación por `accion_ejecutada` registrada desde una sesión, y una revisión
--      pendiente abierta por una acción, nombran una acción ya `cumplida` (RV-EVA-05, D25).
--   4. Una revisión se cierra con una reevaluación aceptada sólo si es una reevaluación del
--      motivo de su disparador, registrada después de la apertura y `accepted` en ese momento
--      (dossier 15a §5). Una reevaluación cierra una sola revisión.
--   5. El orden previo del revisor se registra antes de su primer acceso a resultados de esa
--      empresa, y sus posiciones van en la misma transacción que el registro (decisión 6, A8a).
--
-- Los triggers son AFTER INSERT de fila: corren después de las CHECK, las claves únicas y las
-- foráneas de la misma fila, así que una fila mal formada sigue fallando por su restricción de
-- siempre. Cada uno informa como `constraint` su propio nombre, que es el del trigger (el test
-- de catálogo de `esquema.integration.test.ts` los cuenta como restricciones).
--
-- Lo que sigue en la aplicación, y por qué: que una acción cumplida o una novedad de
-- información nueva o de cambio de contexto *abran* su revisión (la base impide abrirla mal; que
-- se abra lo hace el caso de uso en la misma transacción, `src/application/actualizacion.ts`),
-- que el orden calculado de un reordenamiento coincida con el recálculo y que el orden previo
-- cubra todos los riesgos de la empresa.

-- ── 1. Lo que viene de una sesión lo escribe una persona ─────────────────────

alter table risk.evaluacion add constraint evaluacion_sesion_humana check (origen <> 'sesion' or actor = 'human');
alter table risk.accion add constraint accion_sesion_humana check (origen <> 'sesion' or actor = 'human');
alter table risk.transferencia add constraint transferencia_sesion_humana check (origen <> 'sesion' or actor = 'human');
alter table risk.evento_poliza add constraint evento_poliza_sesion_humana check (origen <> 'sesion' or actor = 'human');

-- ── 2. Estado de una acción ──────────────────────────────────────────────────

-- El estado vigente es el de la última fila. La primera fila de una acción puede ser cualquiera
-- (la importación trae el estado del CSV). Después:
--   - de `cancelada` no se sale;
--   - de `cumplida` sólo se pasa a otra `cumplida` que agrega la eficacia, una sola vez, con la
--     misma fecha y la misma evidencia de ejecución;
--   - un cambio no repite el estado vigente.
create function risk.accion_estado_transicion() returns trigger
language plpgsql set search_path = '' as $$
declare
  previo risk.accion_estado;
begin
  select * into previo from risk.accion_estado s
    where s.accion_id = new.accion_id and s.id < new.id order by s.id desc limit 1;
  if not found then
    return new;
  end if;
  if previo.estado = 'cancelada' then
    raise exception 'risk.accion_estado: la acción % está cancelada; ese estado es final', new.accion_id
      using errcode = 'check_violation', constraint = 'accion_estado_transicion';
  end if;
  if previo.estado = 'cumplida' and not (
    new.estado = 'cumplida' and new.efecto is not null and previo.efecto is null
    and new.fecha_cumplida = previo.fecha_cumplida and new.evidencia_ejecucion = previo.evidencia_ejecucion
  ) then
    raise exception 'risk.accion_estado: la acción % está cumplida; sólo se le agrega la eficacia, una vez', new.accion_id
      using errcode = 'check_violation', constraint = 'accion_estado_transicion';
  end if;
  if previo.estado = new.estado and previo.estado <> 'cumplida' then
    raise exception 'risk.accion_estado: la acción % ya está %', new.accion_id, new.estado
      using errcode = 'check_violation', constraint = 'accion_estado_transicion';
  end if;
  return new;
end
$$;
create trigger accion_estado_transicion after insert on risk.accion_estado
  for each row execute function risk.accion_estado_transicion();

-- ── 3. Lo que nombra una acción ejecutada ────────────────────────────────────

create function risk.estado_vigente_accion(accion text) returns text
language sql stable set search_path = '' as $$
  select s.estado from risk.accion_estado s where s.accion_id = accion order by s.id desc limit 1
$$;

-- RV-EVA-05 desde una sesión. La importación escribe las evaluaciones antes que los estados de
-- sus acciones, y su validador ya comprueba la regla sobre el lote (T-0029).
create function risk.evaluacion_accion_cumplida() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.origen = 'sesion' and new.accion_id is not null
     and risk.estado_vigente_accion(new.accion_id) is distinct from 'cumplida' then
    raise exception 'risk.evaluacion: la acción % no está cumplida (RV-EVA-05)', new.accion_id
      using errcode = 'check_violation', constraint = 'evaluacion_accion_cumplida';
  end if;
  return new;
end
$$;
create trigger evaluacion_accion_cumplida after insert on risk.evaluacion
  for each row execute function risk.evaluacion_accion_cumplida();

-- Sólo una acción cumplida abre una revisión (dossier 15a §5; D18: no se abre por planificar).
create function risk.revision_pendiente_accion_cumplida() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.accion_id is not null and risk.estado_vigente_accion(new.accion_id) is distinct from 'cumplida' then
    raise exception 'risk.revision_pendiente: la acción % no está cumplida', new.accion_id
      using errcode = 'check_violation', constraint = 'revision_pendiente_accion_cumplida';
  end if;
  return new;
end
$$;
create trigger revision_pendiente_accion_cumplida after insert on risk.revision_pendiente
  for each row execute function risk.revision_pendiente_accion_cumplida();

-- ── 4. Cierre de una revisión ────────────────────────────────────────────────

-- Una reevaluación cierra a lo sumo una revisión: dos ciclos no comparten cierre (RO01 §6, A7).
alter table risk.cierre_revision add constraint cierre_revision_una_por_evaluacion unique (evaluacion_id);

-- Qué motivos cierran cada disparador (dossier 15a §5, tabla «Motivo esperado»).
create function risk.motivo_cierra(disparador text, motivo text) returns boolean
language sql immutable set search_path = '' as $$
  select case disparador
    when 'accion_ejecutada' then motivo = 'accion_ejecutada'
    when 'informacion_nueva' then motivo in ('informacion_nueva', 'correccion_evaluacion')
    when 'cambio_contexto' then motivo = 'cambio_contexto'
    when 'cambio_version_metodologia' then motivo = 'cambio_version_metodologia'
    else false
  end
$$;

create function risk.cierre_revision_reevaluacion_valida() returns trigger
language plpgsql set search_path = '' as $$
declare
  r risk.revision_pendiente;
  e risk.evaluacion;
  ultima text;
begin
  if new.resultado <> 'reevaluacion_aceptada' then
    return new;
  end if;
  select * into r from risk.revision_pendiente where id = new.revision_id;
  select * into e from risk.evaluacion where id = new.evaluacion_id;
  if e.tipo_evaluacion <> 'reevaluacion' then
    raise exception 'risk.cierre_revision: % no es una reevaluación', e.id
      using errcode = 'check_violation', constraint = 'cierre_revision_reevaluacion_valida';
  end if;
  if not risk.motivo_cierra(r.disparador, e.motivo)
     or (r.disparador = 'accion_ejecutada' and e.accion_id is distinct from r.accion_id)
     or (r.disparador = 'cambio_version_metodologia' and e.version_metodologia is distinct from r.version_metodologia) then
    raise exception 'risk.cierre_revision: la reevaluación % (%) no responde al disparador % de %', e.id, e.motivo, r.disparador, r.id
      using errcode = 'check_violation', constraint = 'cierre_revision_reevaluacion_valida';
  end if;
  if e.registrada_en < r.abierta_en then
    raise exception 'risk.cierre_revision: la reevaluación % es anterior a la apertura de %', e.id, r.id
      using errcode = 'check_violation', constraint = 'cierre_revision_reevaluacion_valida';
  end if;
  select h.estado into ultima from risk.revision_humana h where h.evaluacion_id = e.id order by h.id desc limit 1;
  if ultima is distinct from 'accepted' then
    raise exception 'risk.cierre_revision: la reevaluación % no está accepted', e.id
      using errcode = 'check_violation', constraint = 'cierre_revision_reevaluacion_valida';
  end if;
  return new;
end
$$;
create trigger cierre_revision_reevaluacion_valida after insert on risk.cierre_revision
  for each row execute function risk.cierre_revision_reevaluacion_valida();

-- ── 5. Orden previo del revisor ──────────────────────────────────────────────

-- Antes de su primer acceso a ranking, bandas o `C_raw` de esa empresa (decisión 6; RO01 A8a).
-- `registro_acceso` lo escriben las vistas con resultados antes de devolver nada (T-0030).
create function risk.orden_previo_antes_de_resultados() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from risk.registro_acceso a
    where a.persona_id = new.revisor_persona_id and a.organizacion_id = new.organizacion_id
      and a.tipo = 'vista_resultados' and a.ocurrido_en <= new.registrado_en
  ) then
    raise exception 'risk.orden_previo: la persona % ya vio resultados de %; el orden no es previo', new.revisor_persona_id, new.organizacion_id
      using errcode = 'check_violation', constraint = 'orden_previo_antes_de_resultados';
  end if;
  return new;
end
$$;
create trigger orden_previo_antes_de_resultados after insert on risk.orden_previo
  for each row execute function risk.orden_previo_antes_de_resultados();

-- Las posiciones entran con el registro, en la misma transacción: no se agregan después de que
-- el revisor pudo ver resultados. `registrado_en` es `now()`, la hora de inicio de la transacción.
create function risk.orden_previo_item_en_su_registro() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select o.registrado_en from risk.orden_previo o where o.id = new.orden_previo_id) <> transaction_timestamp() then
    raise exception 'risk.orden_previo_item: las posiciones de % van en la misma transacción que su registro', new.orden_previo_id
      using errcode = 'check_violation', constraint = 'orden_previo_item_en_su_registro';
  end if;
  return new;
end
$$;
create trigger orden_previo_item_en_su_registro after insert on risk.orden_previo_item
  for each row execute function risk.orden_previo_item_en_su_registro();
