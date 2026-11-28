// Conexión de la app a Postgres. Deliberadamente separada de `packages/db/src/import/db.ts`,
// que fija `delcampo_t0013_dev` porque D-0053 acota el importador a esa base: la app no
// tiene esa restricción, y copiar el pin acá habría impedido apuntarla a Supabase.
//
// Vive en `packages/api` y no en `apps/web` porque R-25 prohíbe que la web toque la base.
// La credencial sólo existe del lado del servidor: ninguna variable que la contenga lleva
// el prefijo `NEXT_PUBLIC_`, que es lo único que Next.js expone al navegador.

import postgres from 'postgres'

let pool: postgres.Sql | undefined

export const sql = (): postgres.Sql => {
  if (pool !== undefined) return pool
  const url = process.env.DATABASE_URL
  if (url === undefined || url.trim() === '') {
    throw new Error('falta la variable de entorno DATABASE_URL; ver docs/despliegue/vercel-vs01.md')
  }
  // `max: 10` (el default de postgres.js): una pantalla como la ficha de cliente lanza una
  // docena de transacciones en paralelo y con 3 se ejecutaban en tandas. Las conexiones van
  // al pooler de Supabase en modo transacción, que es el que reparte las del plan.
  pool = postgres(url, { max: 10, idle_timeout: 20, prepare: false })
  return pool
}
