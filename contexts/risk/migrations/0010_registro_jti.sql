-- T-0035, pendiente 3 de la revisión del owner (2026-11-04): registro persistente de los
-- `jti` del token entre contextos de D-0077, para que Risk OS acepte cada token una sola
-- vez aunque corra en varias instancias. Hasta ahora el registro de las pruebas era en
-- memoria, que en Vercel no ve lo que aceptó otra instancia.
--
-- Cómo cumple lo que pidió el owner:
--   * Compartido por todas las instancias del destino: vive en la base de Risk OS.
--   * Unicidad atómica: la clave primaria (emisor, jti). Dos instancias que reciben el
--     mismo token a la vez insertan la misma clave; Postgres deja pasar una y la otra no
--     inserta nada (`on conflict do nothing`), sin ventana entre consultar y escribir.
--   * Vencimiento: cada fila guarda el `exp` del token. El verificador rechaza un token
--     vencido antes de mirar el registro, así que un `jti` sólo hace falta recordarlo
--     hasta su `exp`; después, la fila no decide nada.
--
-- Se purga lo vencido (decisión del owner, 2026-11-04, en la revisión de este PR): es la
-- única tabla del esquema que no es de sólo inserción. No es historia de un riesgo ni
-- auditoría (R-22, R-23): es estado de seguridad efímero, y la llamada aceptada ya deja su
-- rastro en `evento_auditoria` cuando corresponde. Cada registro borra los `jti` vencidos hace
-- más de `10 minutes`: el verificador acepta un token hasta `exp` más 5 s de tolerancia, así
-- que el margen cubre de sobra un desfase de reloj entre la base y las instancias.
--
-- Quién escribe: la conexión del modo `oidc` (`risk_oidc`, migración 0009), antes de asumir
-- `risk_persona`, porque el token se verifica antes de la admisión. Como las funciones de
-- admisión de 0009, lo hace por `risk.registrar_jti`, SECURITY DEFINER con search_path vacío
-- y EXECUTE sólo para `risk_oidc`: esa conexión sigue sin ningún privilegio sobre la tabla y
-- sin poder leer qué `jti` se aceptaron. `risk_persona` no lee ni escribe acá.
--
-- Para quien se conecta hoy sólo agrega una tabla vacía: ninguna ruta acepta tokens todavía.

create table risk.jti_aceptado (
  -- El contexto que firmó el token (`iss`). El `jti` es único por emisor: un emisor no
  -- puede quemar los `jti` de otro.
  emisor       text not null constraint jti_aceptado_emisor_formato check (emisor ~ '^[a-z][a-z0-9-]{1,40}$'),
  jti          text not null constraint jti_aceptado_jti_formato check (length(jti) between 1 and 128),
  -- El `exp` del token. Hasta acá la fila evita la reutilización; después, el vencimiento.
  vence_en     timestamptz not null,
  aceptado_en  timestamptz not null default now(),
  primary key (emisor, jti)
);
comment on table risk.jti_aceptado is
  'RO01 §2, Acceso: cada token entre contextos aceptado, por (emisor, jti), para no aceptarlo dos veces en ninguna instancia (D-0077, T-0035). Sin la persona ni el token.';

-- Para la purga: sin el trigger `solo_insercion` (ver la cabecera). Nadie más que la función
-- de abajo borra: `risk_app` no tiene DELETE (rol-app.sql) y `risk_oidc` ningún privilegio.
create index jti_aceptado_por_vencimiento on risk.jti_aceptado (vence_en);

-- RLS como toda tabla del esquema (0006), con `legado_risk_app` por la regla de 0006 (el modo
-- `legacy` no recibe tokens). Ninguna política para `risk_oidc` ni para `risk_persona`: la
-- función corre como dueña.
alter table risk.jti_aceptado enable row level security;
create policy legado_risk_app on risk.jti_aceptado for all to risk_app using (true) with check (true);

-- `true` si el `jti` de ese emisor no estaba y quedó registrado; `false` si se reutiliza. Dos
-- llamadas a la vez con el mismo par: la segunda espera el lock de la clave y después no inserta.
-- Después purga lo vencido hace más de 10 minutos.
create function risk.registrar_jti(p_emisor text, p_jti text, p_vence_en timestamptz) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_filas bigint;
begin
  insert into risk.jti_aceptado (emisor, jti, vence_en) values (p_emisor, p_jti, p_vence_en)
  on conflict do nothing;
  get diagnostics v_filas = row_count;
  delete from risk.jti_aceptado where vence_en < pg_catalog.now() - interval '10 minutes';
  return v_filas = 1;
end
$$;
revoke all on function risk.registrar_jti(text, text, timestamptz) from public;
grant execute on function risk.registrar_jti(text, text, timestamptz) to risk_oidc;
