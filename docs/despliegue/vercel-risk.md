# Risk OS — despliegue y operación

Workstream: BOS. T-0032. Preparada el 2026-10-17 desde el código del repositorio, antes del
primer despliegue: el owner la sigue de punta a punta y lo que no coincida se corrige acá
(T-0032, ## Verification). Decisiones: D-0068 (Supabase Free en sa-east-1 y Vercel Hobby,
dedicados), D-0069 (credencial por persona) y D-0063 (un proyecto y una base por contexto).

**Lo ejecuta todo el owner** (R-13, R-16). Ningún agente se conecta a la base con datos
reales, recibe sus credenciales o las de Vercel, ni ve valores de las históricas (R-19): ve
sólo lo que el owner pega, que son las salidas sin valores de los scripts de esta guía.
Ninguna URL de base, contraseña ni secreto va al repositorio, a un acta, a un mensaje ni a
una captura (R-18).

## 0. Qué hay y qué no

- Un proyecto de Vercel propio (`apps/risk`) y un proyecto de Supabase propio, sin nada
  compartido con VS01 ni con Communication OS: ni credenciales, ni esquema, ni despliegue.
- Sin worker, sin cron, sin monitoreo (T-0032, Non-scope).
- Las previews no reciben la base real: a lo sumo, una base sintética aparte (§3).

## 1. Base: proyecto de Supabase

1. Crear un proyecto **nuevo**, en la organización de Del Campo, región **South America
   (São Paulo) — sa-east-1**, plan Free. Contraseña de la base al azar, guardada en el
   gestor privado.
   - Si Supabase no deja crear otro proyecto Free (el plan limita los proyectos gratuitos
     activos por cuenta), no se resuelve en el camino: se avisa en el hilo, porque cambia
     D-0068.
2. **Data API apagada.** En la creación (o en *Project Settings → Data API*), desactivar la
   Data API. Risk OS no la usa y el esquema `risk` no se expone. `db:verificar` (paso 5)
   comprueba que `anon` y `authenticated` no tengan uso sobre `risk`.
3. Cadenas de conexión, desde *Connect* en el panel del proyecto. Se usan dos y ninguna se
   escribe en un archivo del repositorio:
   - **Administración** (migraciones, rol): *Session pooler*, usuario `postgres.<ref>`.
   - **App y scripts del owner** (runtime, personas, importación, aceptación): el usuario
     `risk_app` del paso 4. En el pooler de Supabase el usuario de un rol propio lleva el
     ref del proyecto (`risk_app.<ref>`); el owner confirma ese formato en el panel el día
     que lo crea y, si es otro, se corrige esta línea. *Transaction pooler* (puerto 6543)
     para Vercel; *Session pooler* para los scripts.

En la terminal del owner, las cadenas van en una variable de esa sesión y nunca como
argumento ni en un `.env` del repositorio. Por ejemplo, con la contraseña desde el gestor:

```bash
read -rs RISK_HOSTED_DATABASE_URL && export RISK_HOSTED_DATABASE_URL   # se pega, no se ve
```

`RISK_HOSTED_DATABASE_URL` es la única variable que los scripts leen con `--hosteada`. Sin
`--hosteada` ignoran esa variable y sólo operan sobre `delcampo_risk_dev` y
`delcampo_risk_test` en localhost; con ella ignoran `RISK_DATABASE_URL`. Los tests se niegan
a correr si `RISK_HOSTED_DATABASE_URL` está definida: al terminar,
`unset RISK_HOSTED_DATABASE_URL`.

## 2. Migraciones y rol de la app — owner, con la cadena de administración

Desde la raíz del repositorio, en `main` actualizado:

```bash
pnpm install --frozen-lockfile
# RISK_HOSTED_DATABASE_URL = Session pooler, usuario postgres.<ref>
pnpm --filter @del-campo/risk run db:migrate --hosteada
```

Aplica las migraciones pendientes de `contexts/risk/migrations/` en orden (0001 a 0005), una
transacción por archivo con su fila en `risk.schema_migrations`. Una que falla no deja nada
y corta las siguientes. Ningún mensaje repite la URL; un error de la base muestra sólo su
código.

Después, el rol de la app (idempotente; se vuelve a correr después de cada migración nueva):

```bash
psql "$RISK_HOSTED_DATABASE_URL" -v ON_ERROR_STOP=1 -f contexts/risk/deploy/rol-app.sql
psql "$RISK_HOSTED_DATABASE_URL" -c '\password risk_app'    # contraseña al azar, al gestor
```

`risk_app` lee e inserta en `risk` y nada más: sin UPDATE, DELETE ni TRUNCATE, sin ser dueño
de ninguna tabla (no puede desactivar el trigger de sólo inserción, R-22), sin crear nada y
sin leer otros esquemas (D-0063). Lo prueba `rol-app.integration.test.ts`.

**Reversa.** En local, `pnpm --filter @del-campo/risk run db:down` revierte una migración por
vez (probado en CI). En la base hosteada, `db:down --hosteada` existe pero **no es el camino
para volver atrás la app** (§7): borra tablas con lo registrado. Se usa sólo con una copia
previa (§8) y una decisión explícita.

## 3. Proyecto de Vercel

| Ajuste | Valor |
| --- | --- |
| Framework Preset | **Next.js** (fijado en `apps/risk/vercel.json`) |
| Root Directory | **`apps/risk`** |
| Include files outside root directory | **Sí**: el build necesita `contexts/risk` |
| Node.js Version | **24.x** |
| Install, Build, Output | los defaults (`pnpm install`, `next build`) |
| Región de las funciones | **São Paulo (`gru1`)**, junto a la base (en `vercel.json`) |

Variables, **sólo en Production** (la lista canónica está en el
[README de la app](../../apps/risk/README.md#variables-de-entorno)):

| Variable | Valor |
| --- | --- |
| `RISK_DATABASE_URL` | Transaction pooler con el usuario `risk_app` |
| `RISK_UI_SESSION_SECRET` | 32 caracteres o más al azar (`openssl rand -base64 36`). Cambiarlo cierra todas las sesiones. |

Ninguna con prefijo `NEXT_PUBLIC_`. **Las previews nunca ven la base real.** Para A11 (RO01
§6, protocolo 3: el owner recorre las vistas con las 8 sintéticas en el despliegue), un
segundo proyecto de Supabase, **sintético**, con los mismos pasos 1 y 2 y las sintéticas
importadas (`import SPIKES/T-0021/v0/fase-15/sinteticos --hosteada --corte 2026-10-14`), y
sus dos variables cargadas sólo en **Preview**, con otro `RISK_UI_SESSION_SECRET`. Si el
límite de proyectos gratuitos no lo permite, Preview queda sin variables (los endpoints
responden 503 y no se puede entrar) y A11 se recorre en local como en T-0030, dicho así en
el acta. Development queda sin variables.

Cargar las variables y volver a desplegar para que entren en vigencia. Registrar el SHA del
deployment de Production que se promueve.

## 4. Verificación del despliegue (sin datos)

Con la cadena de `risk_app` (Session pooler):

```bash
pnpm --filter @del-campo/risk run db:verificar --hosteada
```

Imprime el rol, las migraciones pendientes y un punto por regla (sin superusuario, sin
privilegios de más, sin acceso fuera de `risk`, sin rastros de VS01 ni de Communication OS,
Data API sin acceso a `risk`). Sale con 0 si todo cumple y con 2 si algo no. Se pega en
`ops/evidence/T-0032.md`.

Contra el dominio de Production (sin credencial y con una inválida):

```bash
D=https://<dominio-de-risk>.vercel.app
for p in /api/organizaciones /api/o/X/lista /api/o/X/escenarios /api/o/X/plan /api/o/X/transferencia /api/o/X/actividad /api/r/X; do
  printf '%s ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "$D$p"
  printf '%s (cookie inválida) ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' -H 'Cookie: risk_session=v1.x.y.z.w' "$D$p"
done                                                       # 401 en todos
for p in / /o/X /o/X/escenarios /o/X/plan /o/X/transferencia /o/X/orden-previo /r/X; do
  printf '%s ' "$p"; curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "$D$p"
done                                                       # redirige a /login
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$D/api/login" -H 'Origin: https://otro.example' # 403
```

Contra la URL de una preview, lo mismo: 401 (o 503 si quedó sin variables; con la protección
de despliegues de Vercel activa, responde Vercel antes que la app). En *Settings →
Environment Variables*, `RISK_DATABASE_URL` de Preview no es la de Production.

**Que no ve VS01 ni Communication OS:** lo prueban `db:verificar` (el rol no tiene nada fuera
de `risk` y la base no tiene sus esquemas) y la separación de proyectos: las variables de
Risk OS no existen en los proyectos de VS01 ni de Communication y viceversa. El owner lo
mira en *Settings → Environment Variables* de cada uno.

## 5. Personas (D-0069)

Una credencial por persona: el owner, la operadora de los ciclos si es otra persona, y el
revisor profesional. La contraseña entra por la entrada estándar, nunca como argumento:

```bash
# RISK_HOSTED_DATABASE_URL = Session pooler con risk_app
openssl rand -base64 24 | tee /dev/tty | \
  pnpm --filter @del-campo/risk run persona alta --nombre "Nombre Apellido" --usuario nombre --hosteada
pnpm --filter @del-campo/risk run persona clave --usuario nombre --hosteada   # cambiarla
pnpm --filter @del-campo/risk run persona baja --usuario nombre --hosteada    # darla de baja
```

El alta imprime el id de la persona (`PER-…`): va al manifiesto de la aceptación (§9), que es
privado. La contraseña se entrega por un canal privado. El nombre del revisor tiene que ser
distinto del evaluador original de las históricas (decisión 6 del owner).

**Límite de intentos:** después de 10 logins fallidos de un mismo usuario en 15 minutos,
ese usuario no entra durante 15 minutos aunque la contraseña sea correcta; la pantalla lo
dice. Cuenta por usuario y guarda sólo su huella (sha256), nunca el usuario en claro ni la IP.

## 6. Importar las históricas

Por empresa, en el equipo del owner, con la carpeta de los tres CSV fuera del repositorio:

```bash
# RISK_HOSTED_DATABASE_URL = Session pooler con risk_app
pnpm --filter @del-campo/risk run import /ruta/privada/H1 --hosteada --corte AAAA-MM-DD --por "Nombre"
```

Contra la base hosteada **no migra**: si falta una migración, no importa nada y lo dice. El
informe es **sin valores** por defecto: estado, huella del lote, conteos de filas y hallazgos
por `regla_id`, sin mensajes ni celdas. **Ese informe, el de cada intento, rechazados
incluidos, se pega en el acta** (`ops/evidence/T-0032-aceptacion.md`, A6) y sus datos van al
manifiesto (§9). `--con-valores` muestra los mensajes con celdas para corregir el origen: es
para leerlo el owner y no se pega en ningún lado.

Un intento rechazado no escribe nada. Se corrige el CSV en el origen y se vuelve a intentar;
el rechazo queda contado (un fallo no se borra del acta). Un lote ya importado devuelve
`ya_importado` sin escribir. Un lote por empresa: el script de aceptación marca un lote que
escribió filas de dos empresas.

## 7. Volver a la versión anterior

Promover en Vercel el deployment anterior conocido (*Deployments → … → Promote*) y comprobar
que funciona con el esquema actual: las migraciones sólo agregan, así que una versión
anterior de la app sigue leyendo. No se revierten migraciones para volver atrás la app.

## 8. Copia, restauración, pausa y apagado

**Copia manual** (el plan Free no tiene copias automáticas). Al menos antes de cada carga, al
terminar cada semana de ciclos y antes de cualquier reversa. Con la cadena de administración
(Session pooler) y un `pg_dump` de la misma mayor que el servidor:

```bash
pg_dump "$RISK_HOSTED_DATABASE_URL" --schema=risk --format=custom --no-owner \
  --file "/ruta/privada/risk-$(date -u +%Y%m%dT%H%MZ).dump"
```

El archivo tiene los datos reales: va a un lugar privado y cifrado del owner, **nunca** al
repositorio, a Drive compartido ni a un mensaje.

**Restaurar** en un proyecto vacío (o en el mismo, después de borrar el esquema):

```bash
pg_restore --dbname "$RISK_HOSTED_DATABASE_URL" --no-owner --exit-on-error /ruta/privada/risk-….dump
psql "$RISK_HOSTED_DATABASE_URL" -v ON_ERROR_STOP=1 -f contexts/risk/deploy/rol-app.sql
pnpm --filter @del-campo/risk run db:verificar --hosteada     # con risk_app
```

**Pausa por inactividad.** El plan Free pausa el proyecto tras una semana sin actividad: la
app responde con error y nadie entra. Se reactiva desde el panel de Supabase (*Restore
project*); los datos se conservan. Durante los ciclos, entrar al menos una vez por semana.

**Apagar.** Pausar el proyecto de Vercel y el de Supabase. Borrar la base sólo con una
decisión explícita del owner y una copia (§8): al cierre de Q4 se decide si los datos se
conservan (D-0063). No se toca ningún proyecto de VS01 ni de Communication OS.

## 9. Aceptación de RO01 §6

El owner arma, fuera del repositorio, un **manifiesto** JSON privado que dice qué organización
es cada empresa, qué intentos de importación hubo (copiados de los informes sin valores) y
qué persona es el revisor:

```json
{
  "empresas": {
    "H1": { "organizacionId": "ORG-…", "intentos": [
      { "fecha": "2026-10-20", "estado": "rechazado", "huella": "<64 hex del informe>", "rechazos": { "RV-RSK-01": 2 }, "avisos": {} },
      { "fecha": "2026-10-21", "estado": "importado", "huella": "<64 hex>", "rechazos": {}, "avisos": { "RV-EVA-08": 6 } }
    ] },
    "H2": { "…": "…" }, "H3": { "…": "…" }, "H4": { "…": "…" }, "H5": { "…": "…" }
  },
  "personas": { "R1": "PER-… (el revisor)", "O1": "PER-… (la operadora, opcional)" }
}
```

Sólo acepta ids, fechas, estados, huellas y conteos por `regla_id`; cualquier otro campo lo
rechaza nombrando sólo el campo, sin repetir el contenido. Con la cadena de `risk_app`:

```bash
pnpm --filter @del-campo/risk run aceptacion /ruta/privada/manifiesto.json --hosteada
```

Lee en una transacción de sólo lectura (no escribe ni registra accesos) y devuelve A6, A7,
A8 (a, b y c), A9 sobre las históricas, A12 y los disparadores de reapertura del dossier de
la Fase 13, §5, con códigos H1 a H5 y R1, conteos, fechas, `regla_id`, prefijos de huella e
ids opacos de riesgo y de revisión. Sale con 0 si todo lo que mide cumple, con 1 si algo no y
con 2 si falla el manifiesto o la conexión. **Esa salida se pega entera en el acta**, también
si no cumple. El orden de los pasos y qué mide cada criterio está en el acta.

## 10. Planes (D-0068)

Supabase Free en sa-east-1 y Vercel Hobby. Límites a tener presentes: la pausa por una
semana sin actividad y la falta de copias automáticas en Supabase Free (§8), el límite de
proyectos gratuitos activos por cuenta, y el uso no comercial que piden las condiciones de
Vercel Hobby. Los números exactos de cada plan se miran en las páginas de precios el día de
crear los proyectos, no se copian acá. Al pasar a planes pagos, cuando Broker OS quede
operativo (presupuesto informado en [vercel-communication.md](vercel-communication.md)), se
ganan copias automáticas y sin pausa; el despliegue y esta guía no cambian salvo el §8. Esta
tarea no contrata nada (R-14).
