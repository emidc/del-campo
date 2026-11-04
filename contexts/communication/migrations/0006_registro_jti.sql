-- T-0035, pendiente 3 de la revisión del owner (2026-11-04): registro persistente de los
-- `jti` del token entre contextos de D-0077, para que Communication OS acepte cada token una
-- sola vez aunque corra en varias instancias. Es la misma tabla que la migración 0010 de
-- Risk OS, en el esquema propio (D-0063).
--
--   * Compartido por todas las instancias del destino: vive en la base de Communication OS.
--   * Unicidad atómica: la clave primaria (emisor, jti) con `on conflict do nothing`. Hoy
--     Communication OS puede recibir tokens de dos emisores (Broker OS y Risk OS); el `jti`
--     es único por emisor, así que uno no puede quemar los del otro.
--   * Vencimiento: cada fila guarda el `exp` del token. El verificador rechaza un token
--     vencido antes de mirar el registro; después de su `exp`, la fila no decide nada.
--
-- Se purga lo vencido (decisión del owner, 2026-11-04): no es auditoría, es estado de
-- seguridad efímero. Cada registro borra los `jti` vencidos hace más de 10 minutos; el
-- verificador acepta un token hasta `exp` más 5 s, así que el margen cubre de sobra un
-- desfase de reloj entre la base y las instancias.
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

create index jti_aceptado_por_vencimiento on communication.jti_aceptado (vence_en);

alter table communication.jti_aceptado enable row level security;

-- `true` si el `jti` de ese emisor no estaba y quedó registrado; `false` si se reutiliza. Dos
-- llamadas a la vez con el mismo par: la segunda espera el lock de la clave y después no
-- inserta. Después purga lo vencido hace más de 10 minutos. Sólo la ejecuta el dueño.
create function communication.registrar_jti(p_emisor text, p_jti text, p_vence_en timestamptz) returns boolean
language plpgsql volatile set search_path = '' as $$
declare
  v_filas bigint;
begin
  insert into communication.jti_aceptado (emisor, jti, vence_en) values (p_emisor, p_jti, p_vence_en)
  on conflict do nothing;
  get diagnostics v_filas = row_count;
  delete from communication.jti_aceptado where vence_en < pg_catalog.now() - interval '10 minutes';
  return v_filas = 1;
end
$$;
revoke all on function communication.registrar_jti(text, text, timestamptz) from public;
