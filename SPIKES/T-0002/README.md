# Spike T-0002 — dónde se hace cumplir la autorización

Prueba de concepto **descartable** para `TASKS/T-0002-spike-authorization-enforcement.md`.
Las conclusiones están en [`../T-0002-enforcement-autorizacion.md`](../T-0002-enforcement-autorizacion.md).
Vive fuera del workspace de pnpm, no importa nada del producto y usa su propia base,
`delcampo_spike_t0002`, con datos sintéticos (R-19).

## Archivos

| Archivo | Qué hace |
|---|---|
| `schema.sql` | Esquemas `broker` y `risk` (dos contextos simulados), funciones `authz.*`, políticas RLS y grants por perfil |
| `seed.ts` | Semilla sintética: 10 usuarios, 2 empresas, asignaciones con historia, accesos de portal |
| `matriz.ts` | La matriz de autorización: 25 lecturas y 12 escrituras, cada una con su origen |
| `mecanismos.ts` | RLS, sólo aplicación e híbrido detrás de la misma interfaz |
| `spike.test.ts` | 63 pruebas: la matriz en los tres mecanismos y las comprobaciones de `## Verification` |
| `mutaciones.ts` | Contraprueba: rompe ocho reglas en la base y exige que la suite falle en cada una |
| `bench.ts` | Costo de RLS frente al filtro en la aplicación con 20 000 pólizas sintéticas |
| `db.ts`, `setup-db.ts` | Conexión por perfil y creación de la base y los roles |

## Roles

Los roles son del clúster y llevan el prefijo `spike_t0002_`: `owner` (migraciones),
`app` (sin BYPASSRLS), `plain` (con BYPASSRLS, para el mecanismo «sólo aplicación»),
`worker`, `mcp`, `service` (con BYPASSRLS, como el `service_role` de Supabase) y
`riskapp`. Ninguno es superusuario. Se autentican como el Postgres local lo permita
(`trust` en desarrollo o `~/.pgpass`).

## Correr

Node 22.18 o mayor (TypeScript nativo) y el driver `postgres` que instala el repo raíz.

```bash
cd SPIKES/T-0002
export PGHOST=localhost PGUSER=postgres   # un superusuario local, sólo para crear roles y base
node --run db:setup
node --run test          # 63 pruebas
node --run mutaciones    # 8 mutaciones, todas tienen que quedar «muerta»
node --run bench
```

## Revertir

```bash
node setup-db.ts --borrar   # borra la base y los siete roles spike_t0002_*
```
