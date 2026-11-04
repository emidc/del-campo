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
-- Sólo inserción, como el resto del esquema (R-22, R-23): no se purga. Un token aceptado
-- es una llamada entre contextos y la fila es su rastro mínimo (quién emitió, cuándo
-- venció, cuándo se aceptó), sin la persona ni el token. El volumen es una fila por
-- llamada; si algún día pesa, purgar lo vencido es una decisión aparte, con su ADR.
--
-- Quién escribe: la conexión de la app (`risk_app` en la base hosteada, el dueño en local),
-- antes de asumir `risk_persona`, porque el token se verifica antes de la admisión.
-- `risk_persona` no lee ni escribe acá: no tiene grant ni política.
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

create trigger solo_insercion before update or delete on risk.jti_aceptado
  for each row execute function risk.solo_insercion();
create trigger solo_insercion_truncate before truncate on risk.jti_aceptado
  for each statement execute function risk.solo_insercion();

-- RLS como toda tabla del esquema (0006). `legado_risk_app` por la regla de 0006; la política
-- propia de inserción es la que tiene que quedar cuando se retire el acceso amplio de
-- `risk_app` del camino `oidc` (pendiente 2 de la misma revisión). Alcanza sola porque el
-- registro usa `on conflict do nothing` sin columnas: con columnas, Postgres exigiría también
-- una política SELECT (`persistence/jti.ts` lo prueba sin `legado_risk_app`). Sin política
-- para `risk_persona`.
alter table risk.jti_aceptado enable row level security;
create policy legado_risk_app on risk.jti_aceptado for all to risk_app using (true) with check (true);
create policy jti_aceptado_registrar on risk.jti_aceptado for insert to risk_app with check (true);
