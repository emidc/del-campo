-- Intentos de envío desde la UI (T-0025). Cloud API no acepta claves de idempotencia,
-- así que la clave la genera Communication OS y se persiste ANTES de llamar a la API
-- (R-20): un mismo intento repetido encuentra su fila y no vuelve a llamar.
--
-- Estados:
--   pending      la fila existe y la llamada a la API está en curso, o el proceso cayó
--                antes de registrar el resultado;
--   accepted     la API devolvió un `wamid` y el saliente quedó en `message`;
--   rejected     la API respondió con un error: no salió nada;
--   unconfirmed  timeout, red caída, 5xx, o aceptado sin poder persistirlo: pudo haber
--                salido. No se reintenta solo; lo decide el operador. Si la API llegó a
--                devolver el `wamid`, se guarda: es el dato para reconciliar con los
--                estados que lleguen por webhook (R-20; hallazgo C2 de la revisión ciega).
--
-- Sin clave foránea a `message` por `wamid`: el saliente aceptado se enlaza por
-- `message_id`, y los mensajes no se borran (R-23).
create table communication.outbound_attempt (
  id              bigint generated always as identity primary key,
  idempotency_key uuid not null unique,
  phone_number_id text not null check (phone_number_id <> ''),
  -- El envío sale solo hacia `wa_id`; el BSUID queda como dato del participante.
  wa_id           text not null check (wa_id <> ''),
  bsuid           text check (bsuid <> ''),
  -- Se guarda mientras hace falta mostrarlo. En `accepted` el texto ya vive en
  -- `message`; en `rejected` y `unconfirmed` lo borra la retención a los 30 días.
  body            text check (length(body) > 0),
  -- Para reconocer la misma clave con otro texto aun después de borrar `body`.
  body_sha256     bytea not null check (length(body_sha256) = 32),
  state           text not null default 'pending'
                  check (state in ('pending', 'accepted', 'rejected', 'unconfirmed')),
  wamid           text unique,
  message_id      bigint references communication.message (id),
  error_code      integer,
  error_title     text,
  created_at      timestamptz not null default now(),
  settled_at      timestamptz,
  check ((state = 'pending') = (settled_at is null)),
  check (state <> 'accepted' or wamid is not null),
  check (wamid is null or state in ('accepted', 'unconfirmed')),
  check ((state = 'accepted') = (message_id is not null)),
  check (state <> 'accepted' or body is null),
  check (state <> 'pending' or body is not null),
  check (state = 'rejected' or error_code is null),
  check (state in ('rejected', 'unconfirmed') or error_title is null)
);

-- Los intentos sin confirmar de un participante, para mostrarlos en su hilo.
create index outbound_attempt_wa_id on communication.outbound_attempt (wa_id, created_at)
  where state in ('pending', 'unconfirmed');

-- Un participante cuyos entrantes son todos de tipos fuera de alcance también es una
-- conversación (hallazgo A1 de la revisión ciega de T-0025). El id de una conversación
-- es el menor id de las filas de su participante en `message` o `unsupported_message`;
-- para que no choquen, `unsupported_message.id` sale de la misma secuencia que
-- `message.id`. Las filas existentes reciben su valor al agregar la columna. El receptor
-- de T-0024 no cambia: no escribe la columna.
alter table communication.unsupported_message
  add column id bigint not null unique default nextval('communication.message_id_seq');
