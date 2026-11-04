-- T-0035, pendiente 3 de la revisión del owner (2026-11-04): registro persistente de los
-- `jti` del token entre contextos de D-0077, para que Communication OS acepte cada token una
-- sola vez aunque corra en varias instancias. Es la misma tabla que la migración 0009 de
-- Risk OS, en el esquema propio (D-0063).
--
--   * Compartido por todas las instancias del destino: vive en la base de Communication OS.
--   * Unicidad atómica: la clave primaria (emisor, jti) con `on conflict do nothing`. Hoy
--     Communication OS puede recibir tokens de dos emisores (Broker OS y Risk OS); el `jti`
--     es único por emisor, así que uno no puede quemar los del otro.
--   * Vencimiento: cada fila guarda el `exp` del token. El verificador rechaza un token
--     vencido antes de mirar el registro; después de su `exp`, la fila no decide nada.
--
-- Sólo inserción, como `audit_event`: no se purga. La fila es el rastro mínimo de una
-- llamada aceptada (quién emitió, cuándo venció, cuándo se aceptó), sin la persona ni el
-- token. Si algún día el volumen pesa, purgar lo vencido es una decisión aparte.
--
-- Quién escribe: la conexión de la app, que es dueña de las tablas, antes de asumir
-- `communication_app`. `communication_app` no lee ni escribe acá: RLS sin política y sin grant.

create table communication.jti_aceptado (
  emisor       text not null constraint jti_aceptado_emisor_formato check (emisor ~ '^[a-z][a-z0-9-]{1,40}$'),
  jti          text not null constraint jti_aceptado_jti_formato check (length(jti) between 1 and 128),
  vence_en     timestamptz not null,
  aceptado_en  timestamptz not null default now(),
  primary key (emisor, jti)
);
comment on table communication.jti_aceptado is
  'T-0035 (D-0077): cada token entre contextos aceptado, por (emisor, jti), para no aceptarlo dos veces en ninguna instancia. Sin la persona ni el token.';

create function communication.jti_aceptado_solo_insercion() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'jti_aceptado es sólo de inserción' using errcode = 'restrict_violation';
end
$$;
revoke all on function communication.jti_aceptado_solo_insercion() from public;
create trigger jti_aceptado_solo_insercion before update or delete on communication.jti_aceptado
  for each row execute function communication.jti_aceptado_solo_insercion();
create trigger jti_aceptado_solo_insercion_truncate before truncate on communication.jti_aceptado
  for each statement execute function communication.jti_aceptado_solo_insercion();

alter table communication.jti_aceptado enable row level security;
