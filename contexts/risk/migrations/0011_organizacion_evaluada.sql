-- T-0036 (C2): la organización evaluada de Risk OS y su correspondencia con la empresa de
-- Broker OS (D-0067, D-0071). Para quien se conecta hoy sólo agrega tablas vacías.
--
--   * `organizacion_ficha`: sector, tamaño y zonas de una organización. La vigente es la última
--     fila. Las zonas son las unidades de la organización (los establecimientos de D-0071), las
--     mismas que nombra `riesgo.unidad_id`.
--   * `vinculo_empresa`: la empresa de Broker OS que corresponde a una organización, como id
--     opaco y sin clave foránea entre contextos. La vigente es la última fila; una fila sin
--     empresa quita el vínculo. Cada organización tiene como mucho una empresa por construcción,
--     y una empresa como mucho una organización vigente (decisión del owner sobre la
--     recomendación de D-0071), que comprueba la operación bajo el lock de accesos.
--   * `vinculo_verificado`: quién confirmó un vínculo y cuándo. Sin esa fila el vínculo está
--     pendiente, y Broker OS no ve riesgos de esa empresa (D-0071).
--
-- Las tres son de sólo inserción. Las escribe la CLI del owner (`organizacion`), como los
-- accesos; `risk_persona` sólo las lee, de las organizaciones que ve.

create table risk.organizacion_ficha (
  id                bigint generated always as identity primary key,
  organizacion_id   risk.texto not null,
  sector            text constraint organizacion_ficha_sector check (length(btrim(sector)) between 1 and 100),
  tamano            text constraint organizacion_ficha_tamano check (length(btrim(tamano)) between 1 and 100),
  -- Sin nulos y pocas; que cada una tenga texto lo comprueba la operación.
  zonas             text[] not null default '{}' constraint organizacion_ficha_zonas check (
    array_position(zonas, null) is null and cardinality(zonas) <= 50),
  autor_persona_id  risk.id_persona not null references risk.persona,
  registrada_en     timestamptz not null default now()
);
create index organizacion_ficha_por_organizacion on risk.organizacion_ficha (organizacion_id, id);
comment on table risk.organizacion_ficha is
  'RO01 §2, organización evaluada: sector, tamaño y zonas (T-0036, C2). La vigente es la última fila; las zonas son las unidades de la organización.';

create table risk.vinculo_empresa (
  id                bigint generated always as identity primary key,
  organizacion_id   risk.texto not null,
  -- El id de la `Party` de Broker OS, opaco (D-0071). Sin empresa: el vínculo se quitó.
  empresa_id        text constraint vinculo_empresa_empresa_id check (empresa_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  autor_persona_id  risk.id_persona not null references risk.persona,
  registrado_en     timestamptz not null default now()
);
create index vinculo_empresa_por_organizacion on risk.vinculo_empresa (organizacion_id, id);
create index vinculo_empresa_por_empresa on risk.vinculo_empresa (empresa_id, id);
comment on table risk.vinculo_empresa is
  'RO01 §2, organización evaluada: la empresa de Broker OS que le corresponde, a mano y sin clave foránea (D-0071, T-0036). La vigente es la última fila; sin empresa, se quitó.';

create table risk.vinculo_verificado (
  vinculo_id        bigint primary key references risk.vinculo_empresa,
  autor_persona_id  risk.id_persona not null references risk.persona,
  verificado_en     timestamptz not null default now()
);
comment on table risk.vinculo_verificado is
  'RO01 §2, organización evaluada: quién confirmó un vínculo con la empresa y cuándo (D-0071, T-0036). Sin esta fila el vínculo está pendiente.';

do $$
declare
  tabla text;
begin
  foreach tabla in array array['organizacion_ficha', 'vinculo_empresa', 'vinculo_verificado'] loop
    execute format('create trigger solo_insercion before update or delete on risk.%I for each row execute function risk.solo_insercion()', tabla);
    execute format('create trigger solo_insercion_truncate before truncate on risk.%I for each statement execute function risk.solo_insercion()', tabla);
    execute format('alter table risk.%I enable row level security', tabla);
    execute format('create policy legado_risk_app on risk.%I for all to risk_app using (true) with check (true)', tabla);
  end loop;
end
$$;

-- Se lee de las organizaciones que la persona ve; nadie la escribe desde la app.
grant select on risk.organizacion_ficha, risk.vinculo_empresa, risk.vinculo_verificado to risk_persona;
create policy organizacion_ficha_leer on risk.organizacion_ficha for select to risk_persona
  using (risk.authz_ve_organizacion(organizacion_id));
create policy vinculo_empresa_leer on risk.vinculo_empresa for select to risk_persona
  using (risk.authz_ve_organizacion(organizacion_id));
create policy vinculo_verificado_leer on risk.vinculo_verificado for select to risk_persona
  using (exists (select 1 from risk.vinculo_empresa v where v.id = vinculo_id));
