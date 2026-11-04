# T-0035 — Retiro de `legado_risk_app` del camino `oidc` de Risk OS

**Estado:** preparado, sin ejecutar. Nada de esto está autorizado en producción: cada etapa
pide la aprobación explícita del owner, como el resto de las fases del
[plan de migración](T-0035-identidad-comun.md). Prepararlo no autoriza ejecutarlo.

**Origen:** decisión del owner del 2026-11-04 en el hilo de T-0035. La política
`legado_risk_app` sirve para que `legacy` no cambie durante la migración, pero no puede quedar
como una vía permanente para consultar datos sin las restricciones de `oidc`. Antes de la
fase 4 hacían falta tres cosas: una conexión de ejecución `oidc` que no dependa de esa política,
pruebas de que ninguna ruta `oidc` lee datos por privilegios heredados, y este procedimiento.

## 1. Qué cambió en el código (migración 0009) y qué no

| | Antes (0006 a 0008) | Después (0009) |
|---|---|---|
| Conexión de la app en `oidc` | `risk_app`, la misma que `legacy` | `risk_oidc`, en su propia variable (`RISK_OIDC_DATABASE_URL`) |
| Qué lee esa conexión sin asumir a la persona | Todo, por `legado_risk_app` | Nada: ningún privilegio sobre ninguna tabla |
| Admisión (credencial, invitación, vínculo, `inicio_sesion`) | Consultas directas de la app | Tres funciones `risk.admision_*`, SECURITY DEFINER, que contestan por una identidad o un email y vuelven a comprobar el ingreso |
| Rechazos sin actor (login, consulta, token) | Insert directo, por `legado_risk_app` | Insert sin lectura, sólo de las columnas del evento (no `id` ni `ocurrido_en`) y sólo con la forma de un rechazo (`evento_auditoria_rechazo`) |
| `SinPermiso` auditado después de revertir | Con la conexión de la app | En otra transacción como la persona, por la política de 0008 |
| `risk_app` miembro de `risk_persona` | Sí (`rol-app.sql`) | No: `rol-app.sql` y la 0009 se lo sacan |
| `ingresar` y `conPrincipal` con otra conexión | Corrían | Fallan antes de leer nada |
| Modo `legacy` | — | **Igual que antes**: `risk_app`, `RISK_DATABASE_URL` y `legado_risk_app` no cambian |

Pruebas, todas contra Postgres:

- `contexts/risk/src/application/camino-oidc.integration.test.ts`: `risk_oidc` no tiene
  privilegios sobre ninguna tabla salvo insertar en la auditoría, leer cualquier tabla le da
  42501 con filas cargadas, ninguna política le deja ver filas, no alcanza a `risk_app` ni al
  dueño, `legado_risk_app` sigue siendo sólo de `risk_app`; las funciones de admisión sólo las
  ejecuta `risk_oidc`, no listan nada y rechazan con 42501 un ingreso en el que la app se
  hubiera equivocado; `ingresar` y `conPrincipal` fallan con la conexión de `risk_app` o la del
  dueño antes de leer o auditar; `rol-oidc.sql` es idempotente y le quita lo que alguien le
  haya dado de más; `verificar-oidc` lo detecta.
- `apps/risk/src/lib/acceso.integration.test.ts` y
  `contexts/risk/src/application/autorizacion.integration.test.ts`: **toda** la suite del
  camino `oidc` (login con Google, páginas, endpoints, matriz, orden previo ciego, baja,
  token entre contextos) corre ahora como `risk_oidc`, como en producción. Si alguna ruta
  necesitara un privilegio heredado, esas pruebas fallarían con 42501.
- `apps/risk/src/lib/deny.test.ts`: en `oidc` la app usa `RISK_OIDC_DATABASE_URL`; con sólo
  `RISK_DATABASE_URL` (la de `risk_app`) todo responde 503.

## 2. Preparación (antes de la fase 4) — owner, con aprobación

Con la cadena de administración (`postgres.<ref>`, Session pooler), como en
[vercel-risk.md §2](../despliegue/vercel-risk.md):

```bash
pnpm --filter @del-campo/risk run db:migrate --hosteada                         # 0006 a 0009
psql "$RISK_HOSTED_DATABASE_URL" -v ON_ERROR_STOP=1 -f contexts/risk/deploy/rol-app.sql
psql "$RISK_HOSTED_DATABASE_URL" -v ON_ERROR_STOP=1 -f contexts/risk/deploy/rol-oidc.sql
psql "$RISK_HOSTED_DATABASE_URL" -c '\password risk_oidc'    # contraseña al azar, al gestor
```

Con `legacy` esto no cambia nada para nadie: `risk_app` ve y escribe lo mismo que antes.

Comprobaciones, cada una con su cadena:

```bash
# RISK_HOSTED_DATABASE_URL = Session pooler con risk_app
pnpm --filter @del-campo/risk run db:verificar --hosteada         # migraciones al día; risk_app sin membresías
# RISK_HOSTED_DATABASE_URL = Session pooler con risk_oidc
pnpm --filter @del-campo/risk run db:verificar-oidc --hosteada    # conexión de oidc: cumple
```

En Vercel, sólo en Production, se **agrega** `RISK_OIDC_DATABASE_URL` (Transaction pooler con
el usuario `risk_oidc.<ref>`) y **se deja** `RISK_DATABASE_URL`: es la vuelta atrás. Con
`AUTH_MODE` sin cambiar, la variable nueva no se usa.

## 3. Etapa A — fase 4: Risk OS pasa a `oidc` con `risk_oidc`

Es la fase 4 del plan, con la preparación de arriba hecha: asignaciones e invitaciones con la
CLI, `AUTH_MODE=oidc` y despliegue, y las comprobaciones de esa fase. Además:

- **Ninguna conexión de la app como `risk_app`.** Lo que lo prueba durante todo el período
  son los logs de conexión de Postgres (en Supabase, *Logs → Postgres*, filtrando por
  `connection authorized: user=risk_app`): las únicas tienen que ser del owner con la CLI. Una
  foto puntual, con la cadena de administración:

  ```sql
  select usename, application_name, count(*) from pg_stat_activity
  where datname = current_database() group by 1, 2 order by 1;
  ```

  Las de la app son de `risk_oidc`. Una de `risk_app` sólo puede ser del owner con la CLI.
- **Ningún error de conexión equivocada.** En los logs de Vercel no aparece «el modo oidc
  corre sólo con la conexión de risk_oidc». Si aparece, la variable apunta a otro rol: la app
  ya se negó (no leyó nada) y se corrige la variable.

**Vuelta atrás:** `AUTH_MODE=legacy` y volver a desplegar. La app vuelve a `RISK_DATABASE_URL`
y a `risk_app`, que no cambió. En la base no se toca nada: `risk_oidc` queda sin uso.

## 4. Observación

**Catorce días estables** con `AUTH_MODE=oidc`, los mismos que pide la fase 5. Estable quiere
decir, durante todo el período:

- ninguna vuelta a `legacy`;
- ninguna conexión de la app como `risk_app` en los logs de conexión del período (no alcanza
  la foto de `pg_stat_activity`, que sólo ve el momento);
- ningún error de conexión equivocada en los logs;
- cada persona invitada entró al menos una vez (`acceso.ingresar` o `acceso.vincular` con
  resultado `ok` en `evento_auditoria`), o el owner decidió que no hace falta;
- `db:verificar-oidc --hosteada` sigue diciendo «cumple» el último día.

Si algo de esto falla, se vuelve a `legacy` (etapa A) y el período empieza de nuevo después
del arreglo.

## 5. Etapa B — la app deja de tener la conexión amplia

Con la observación cumplida y la aprobación del owner: **se borra `RISK_DATABASE_URL` de
Vercel Production** y se vuelve a desplegar. Desde ahí la app no tiene ninguna credencial que
pase por `legado_risk_app`: aunque alguien pusiera `AUTH_MODE=legacy`, la app se negaría (503 en
los endpoints, el login en las páginas) en vez de abrir la conexión amplia.

`risk_app` sigue existiendo para la CLI del owner (importación, personas, accesos,
aceptación), que corre desde su equipo con `RISK_HOSTED_DATABASE_URL`.

**Vuelta atrás:** volver a cargar `RISK_DATABASE_URL` con la cadena de `risk_app` (está en el
gestor), `AUTH_MODE=legacy` y desplegar. Sigue funcionando mientras existan las contraseñas
de `risk.credencial`, o sea hasta la fase 5.

## 6. Etapa C — retirar la política (en la fase 5 o después)

Borrar `legado_risk_app` de todas las tablas es una migración nueva, con su reversa (que la
vuelve a crear igual). **No se escribe todavía**, porque antes hay una decisión del owner que
este procedimiento no toma:

> **La CLI del owner hoy corre como `risk_app` y depende de esa política.** Sin ella, importar
> un lote, dar de alta una persona o invitar dejaría de funcionar. Opciones:
>
> 1. Un rol `risk_cli` propio, con políticas por tabla para lo que hace la CLI (importar,
>    administrar accesos, leer lo que la aceptación necesita), sin LOGIN en la app.
> 2. Correr la CLI con el rol administrativo, que es dueño y está exento de RLS. Es más simple
>    pero puede desactivar el trigger de sólo inserción (R-22), que es justo lo que `risk_app`
>    evita hoy.
> 3. Dejar `legado_risk_app` sólo para la CLI y sacarle a `risk_app` todo uso desde la app (la
>    etapa B ya lo hace). La política sigue existiendo, pero ninguna credencial de producción
>    de la app la alcanza.
>
> Recomendación: la 1, porque mantiene el mínimo privilegio de R-22 y deja la política sin
> ningún usuario. Se decide al preparar la fase 5, no antes.

**Cuándo se decide:** es condición para cerrar la fase 5. Queda en la tabla de pendientes de
`ops/evidence/T-0035.md` y, al cerrar T-0035, como tarea propia con fecha en Project OS.

Con la decisión tomada, la etapa C es:

1. Migración que borra la política (y, si corresponde, crea `risk_cli`), con su reversa, y
   `rol-app.sql` actualizado. Probados en CI y contra una copia restaurada (vercel-risk.md §8):
   cada comando de la CLI (importar, persona, acceso, aceptación) corre y no ve más de lo que
   necesita.
2. Aplicarla en la hosteada con aprobación del owner; `db:verificar` y `db:verificar-oidc`.
3. **Observación de catorce días**, igual que en la etapa A, más: cada uso de la CLI en el
   período termina sin 42501, y ninguna tabla de `risk` tiene una política para `risk_app`
   (`select count(*) from pg_policy where polname = 'legado_risk_app'` da 0).
4. Al terminar, la etapa queda cerrada en la evidencia.

**Vuelta atrás:** la reversa de esa migración, que vuelve a crear la política para `risk_app`.

## 7. Resumen de vueltas atrás

| Desde | Cómo se vuelve | Qué toca |
|---|---|---|
| Preparación (§2) | Nada que volver: `legacy` no cambió. `db:down --hosteada --borra-datos` de la 0009 sólo con copia y decisión | Base |
| Etapa A | `AUTH_MODE=legacy` y desplegar | Una variable |
| Etapa B | Cargar `RISK_DATABASE_URL`, `AUTH_MODE=legacy` y desplegar | Dos variables |
| Etapa C | Reversa de su migración | Base, con aprobación |
| Fase 5 (contraseñas dadas de baja) | Ya no es por variable: credenciales nuevas | Ver el plan |
