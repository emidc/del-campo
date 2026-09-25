# ADR-0058 — Next.js como dependencia de la app interna de VS01

- **Id en `decisions.yaml`:** D-0058
- **Fecha:** 2026-09-23
- **Supersede:** —

## Contexto

D-0058 fijó el stack de la app interna de VS01 el 2026-09-23, a partir de la respuesta
del owner. Lo que faltaba es lo que R-05 exige por separado: el registro de las
**dependencias concretas** que entran al repositorio al implementarla en T-0018.
`packages/db` hoy depende de `postgres` y `csv-parse`; `packages/domain` no depende de
nada (R-25). Incorporar un framework web es, con diferencia, la mayor superficie de
dependencia que el repositorio haya adoptado, y merece quedar escrita antes de que
`pnpm install` la ponga en el lockfile.

Paquetes que adopta T-0018 bajo esta decisión:

| Paquete | Versión | Dónde |
| --- | --- | --- |
| `next` | `^16.3.6` | `apps/web` |
| `react` | `^19.3.0` | `apps/web` |
| `react-dom` | `^19.3.0` | `apps/web` |
| `@types/react`, `@types/react-dom` | dev | `apps/web` |

Tres restricciones del repositorio condicionan cómo se usa:

1. **R-25.** `eslint.config.js` ya prohíbe que `apps/web` importe `@del-campo/db`. La
   app no consulta la base: pasa por `packages/api`, que es parte de esta tarea. El
   límite existía escrito antes de que existiera el paquete; acá se hace efectivo.
2. **D-0045.** El schema vive en migraciones SQL. Next.js no introduce un modelo de
   datos propio, ni migraciones, ni ORM.
3. **El tsconfig raíz fija `erasableSyntaxOnly` y `moduleResolution: NodeNext`** para
   que lo que Node no puede ejecutar con type stripping falle en el type check. JSX y
   la resolución de bundler no conviven con eso. Por eso `apps/web` recibe su propio
   `tsconfig.json`, que extiende el raíz y sobrescribe sólo lo que el framework
   necesita. R-01 no se viola: este es el segundo caso que pide un tsconfig propio, que
   es exactamente la condición que el tsconfig raíz dejó escrita.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0058. Acá se registra la
evidencia y la forma concreta de incorporarla, no el `statement`.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Una app sin framework (Node `http` + HTML server-rendered a mano) | Menos dependencia, pero D-0058 ya eligió Next.js por decisión del owner y D-0014 acota Vercel a la app web. Reabrir esa elección acá sería decidir por implicación lo que ya está decidido con su fuente. |
| Next.js con Pages Router | El App Router es donde Next.js concentra hoy el renderizado en servidor; D-0059 exige que sesión y admisión se verifiquen **en servidor** para páginas y para consultas de datos, y los Server Components hacen que el camino por defecto sea el del servidor en vez de la excepción. |
| Agregar una biblioteca de UI (Tailwind, shadcn, una de componentes) | R-01 y R-02: VS01 tiene cinco pantallas de lectura. CSS propio en un único archivo alcanza y evita una dependencia con su propio ciclo. Si aparece un segundo consumidor de estilos, se reevalúa. |
| Un ORM o query builder para la app | D-0045 y D-0049 ya resolvieron dónde vive el schema y cómo se consulta. La app reutiliza `policy-query.ts` y `document-linking/query.ts` tal como están. |

## Consecuencias

**Más fácil.** Renderizado en servidor por defecto, que es la condición que D-0059
impone; despliegue en Vercel sin configuración de build propia; una sola frontera
(`packages/api`) entre la web y la base.

**Más difícil.** El repositorio pasa de cuatro dependencias de runtime a un árbol de
framework con su propio calendario de versiones mayores. El type check deja de ser un
único `tsc --noEmit` y pasa a ser dos proyectos. Y Next.js trae convenciones implícitas
—caché, runtimes, límites cliente/servidor— que no están escritas en este repositorio:
el riesgo real no es la dependencia, es renderizar en cliente algo que debía
verificarse en servidor. Las pruebas negativas de D-0059 existen para atrapar eso.

**Costo de revertir:** alto para `apps/web`, que habría que reescribir entero; **nulo
para el resto del repositorio**, que es el punto de poner `packages/api` en el medio.
`packages/db`, las migraciones y las consultas no saben que Next.js existe.
