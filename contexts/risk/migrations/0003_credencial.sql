-- Credenciales por persona de la UI de Risk OS (T-0030, D-0069). La persona es la de
-- `risk.persona` (T-0028): el autor de lo que se escribe desde una sesión y de cada fila de
-- `risk.registro_acceso` (decisión 2 del owner).
--
-- Sólo inserción, como el resto del esquema (R-22, R-23): una contraseña no se actualiza, se
-- reemplaza con una fila nueva de `credencial`. La vigente de una persona es la última; una
-- baja es una fila sin hash. Ninguna contraseña está en el repositorio (R-18): las filas las
-- escribe el owner con `pnpm --filter @del-campo/risk run persona` (README del contexto).

create table risk.usuario (
  -- El nombre con que se entra: minúsculas, dígitos, punto, guion y guion bajo.
  usuario     text primary key constraint usuario_formato check (usuario ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
  persona_id  risk.id_persona not null references risk.persona
                constraint usuario_una_por_persona unique,
  creado_en   timestamptz not null default now()
);
comment on table risk.usuario is
  'RO01 §2, Acceso: el usuario con que entra cada persona, uno por persona (D-0069).';

create table risk.credencial (
  id             bigint generated always as identity primary key,
  persona_id     risk.id_persona not null,
  -- `scrypt:N:r:p:<sal base64>:<hash base64>` (D-0069). Sin hash: la persona está dada de baja.
  password_hash  text constraint credencial_hash_scrypt check (
                   password_hash ~ '^scrypt:[0-9]+:[0-9]+:[0-9]+:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$'),
  registrada_en  timestamptz not null default now(),
  -- Sólo una persona que tiene usuario tiene credencial.
  constraint credencial_de_un_usuario foreign key (persona_id) references risk.usuario (persona_id)
);
create index credencial_por_persona on risk.credencial (persona_id, id);
comment on table risk.credencial is
  'RO01 §2, Acceso: cada alta, rotación o baja de la contraseña de una persona, como hash; la vigente es la última (D-0069).';

create trigger solo_insercion before update or delete on risk.usuario
  for each row execute function risk.solo_insercion();
create trigger solo_insercion_truncate before truncate on risk.usuario
  for each statement execute function risk.solo_insercion();
create trigger solo_insercion before update or delete on risk.credencial
  for each row execute function risk.solo_insercion();
create trigger solo_insercion_truncate before truncate on risk.credencial
  for each statement execute function risk.solo_insercion();
