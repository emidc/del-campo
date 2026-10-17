-- Límite de intentos de login de la UI de Risk OS (T-0032; D-0069, que lo deja para el
-- despliegue). Hasta T-0031 la UI corría sólo en local; desplegada, el login queda expuesto.
--
-- Cada intento fallido deja una fila. No se guarda lo que se tipeó como usuario, sino su
-- huella sha256: si alguien escribe la contraseña en el campo de usuario, no queda en claro en
-- la base. Con `LOGIN_MAXIMO_FALLIDOS` fallidos de una misma huella dentro de la ventana, ese
-- usuario no puede entrar hasta que la ventana se libere (`src/application/acceso.ts`). Un
-- intento bloqueado no deja fila: así el bloqueo vence solo y no se renueva con cada intento.
--
-- Sólo inserción, como el resto del esquema (R-22, R-23).

create table risk.login_fallido (
  id              bigint generated always as identity primary key,
  usuario_huella  text not null constraint login_fallido_huella_sha256 check (usuario_huella ~ '^[0-9a-f]{64}$'),
  ocurrido_en     timestamptz not null default now()
);
create index login_fallido_por_huella on risk.login_fallido (usuario_huella, ocurrido_en);
comment on table risk.login_fallido is
  'RO01 §2, Acceso: cada intento de login fallido, con la huella del usuario tipeado; frena los intentos repetidos (D-0069, T-0032).';

create trigger solo_insercion before update or delete on risk.login_fallido
  for each row execute function risk.solo_insercion();
create trigger solo_insercion_truncate before truncate on risk.login_fallido
  for each statement execute function risk.solo_insercion();
