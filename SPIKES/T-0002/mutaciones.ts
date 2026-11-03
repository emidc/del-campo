// Contraprueba: cada mutación rompe una regla en la base y la suite TIENE que fallar. Si
// una mutación pasa en verde, la prueba correspondiente no prueba nada.
import { spawnSync } from 'node:child_process'

const MUTACIONES: Record<string, string> = {
  'M1 póliza visible para cualquier principal': `
    drop policy poliza_leer on broker.poliza;
    create policy poliza_leer on broker.poliza for select to spike_t0002_app, spike_t0002_mcp using (true);`,
  'M2 el portal ve informes en borrador': `
    drop policy informe_leer on broker.informe;
    create policy informe_leer on broker.informe for select to spike_t0002_app, spike_t0002_mcp
      using ((select authz.es_admin())
          or ((select authz.rol()) = 'OPERADOR' and empresa_id in (select authz.empresas_asignadas()))
          or empresa_id = (select authz.empresa_portal()));`,
  'M3 sin regla de autor en RLS': `
    drop policy informe_aprobar on broker.informe;
    create policy informe_aprobar on broker.informe for update to spike_t0002_app
      using (estado = 'BORRADOR' and ((select authz.es_admin())
        or ((select authz.rol()) = 'OPERADOR' and empresa_id in (select authz.empresas_asignadas()))))
      with check (estado = 'APROBADO' and aprobado_por = (select authz.usuario()));`,
  'M4 la baja no corta el acceso': `
    create or replace function authz.usuario() returns uuid language sql stable security definer
      set search_path = pg_catalog as $$ select authz.usuario_declarado() $$;`,
  'M5 intervalo cerrado: el último instante sigue valiendo': `
    create or replace function authz.empresas_asignadas() returns setof uuid language sql stable security definer
      set search_path = pg_catalog as $$
      select a.empresa_id from broker.asignacion a where a.usuario_id = authz.usuario()
        and authz.rol() in ('OPERADOR', 'REVISOR')
        and tstzrange(a.desde, coalesce(a.hasta, 'infinity'), '[]') @> authz.instante() $$;`,
  'M6 el worker puede leer notas internas': `grant select on broker.nota_interna to spike_t0002_worker;`,
  'M7 el MCP puede escribir notas': `
    grant insert on broker.nota_interna to spike_t0002_mcp;
    create policy nota_mcp on broker.nota_interna for insert to spike_t0002_mcp with check (true);`,
  'M8 Risk OS confía en la admisión de Broker OS': `
    create or replace function authz.risk_usuario() returns uuid language sql stable security definer
      set search_path = pg_catalog as $$ select authz.usuario() $$;`,
}

let vivas = 0
for (const [nombre, sql] of Object.entries(MUTACIONES)) {
  const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', 'spike.test.ts'], {
    cwd: import.meta.dirname, env: { ...process.env, SPIKE_T0002_MUTACION: sql }, encoding: 'utf8',
  })
  const fallidas = [...r.stdout.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map((m) => m[1]).filter((t) => !/^\d ·/.test(t ?? ''))
  if (r.status === 0) vivas++
  console.log(`${r.status === 0 ? 'VIVA   ' : 'muerta '} ${nombre}: ${fallidas.length} prueba(s) fallan`)
  for (const t of fallidas) console.log(`         - ${t}`)
}
// Restaurar el schema sin mutaciones.
spawnSync(process.execPath, ['setup-db.ts'], { cwd: import.meta.dirname, stdio: 'inherit' })
console.log(vivas === 0 ? 'todas las mutaciones detectadas' : `${vivas} mutación(es) sin detectar`)
process.exit(vivas === 0 ? 0 : 1)
