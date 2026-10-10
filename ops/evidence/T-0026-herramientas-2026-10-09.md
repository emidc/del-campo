# T-0026 — herramientas de aceptación (entrega parcial)

Workstream BOS. Evidencia generada durante esta sesión el 2026-10-09.
Base origin/main: `c0fd0065ed43ed14eb01fa234130f93999d8a261`.
Implementación comprobada: `66a0db7` (incluye preparación `4708d82`).
AgentRun: no generado por esta sesión. T-0026 sigue READY, no se declara DONE.
PR conjunto: https://github.com/emidc/del-campo/pull/68.

## Comandos y salida literal

Todos los tests usaron Postgres 17 temporal con datos sintéticos, puerto 55438 y
variables explícitas para delcampo_test y delcampo_communication_test. No se leyeron
secretos ni se accedió a producción. Primero faltó delcampo_test; después faltaron
sus tablas. Se creó esa base y se aplicaron las seis migraciones existentes de Broker
antes de la corrida definitiva. No se cambiaron tests ni código de Broker.

`pnpm check`, extractos literales del log local `/tmp/co01-pnpm-check.log`:

```text
✓ 66 decisiones, 29 ADRs, 26 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
ℹ tests 74
ℹ pass 74
ℹ fail 0
ℹ skipped 0
ℹ tests 422
ℹ suites 90
ℹ pass 422
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

El comando terminó con código 0; incluye typecheck, lint y pnpm test del workspace.
Los 10 eventos AgentRun del checker son eventos ya presentes en el repo, no un run
creado para esta sesión. La salida anterior es un extracto identificado, no el log
completo ni una reconstrucción de pruebas no ejecutadas.

Prueba focal:
`node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 'contexts/communication/src/acceptance/*.test.ts'`
con ambas variables de base locales explícitas:

```text
ℹ tests 9
ℹ suites 1
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

El ensayo inicial del SQL de trigger encontró UNSAFE_TRANSACTION en el driver; se
corrigió el arnés para usar una conexión reservada y se volvió a ejecutar con éxito.
El SQL de operación conserva transacciones explícitas para su uso por el owner.

Build de `pnpm --filter './apps/communication' build`: ejecutado por el revisor
independiente, salida y límites en su informe R-33. El proceso completó; no se utiliza
como evidencia de despliegue en Vercel ni de funcionamiento contra Meta.

## Observación externa

Contra Postgres local real, la prueba envía un payload sintético firmado al handler:
se guarda la entrega, responde 200 y el trigger acotado produce estado failed sin
mensaje. Después de ejecutar el SQL de restauración, el reproceso recupera una fila;
una segunda corrida procesa cero y repetir el webhook mantiene un solo mensaje.
La prueba consulta las tablas para contrastar estado y cantidad; no se basa solo en
el resumen del reproceso.

La lectura de aceptación se contrastó con filas sintéticas, otro phone_number_id y
una respuesta exactamente en el límite de 24 horas. El informe excluye contenido e
identificadores privados y detecta la ventana cerrada. Las pruebas puras cubren
faltantes, repetidos, inesperados, orden distinto, estado no cotejado, observaciones
humanas incompletas y latencias negativas. No se alteraron rutas productivas.

## Qué NO se verificó

No se inició T0 ni se ejecutó una caída de diez minutos en Vercel. No se probaron
reintentos reales de Meta, continuidad de 72 horas, métricas reales ni recuperación
failed en producción. El script no puede certificar por sí solo las declaraciones
humanas: cotejo de teléfonos/UI, continuidad del despliegue y origen UI siguen
requiriendo el registro del owner. No se resolvieron los otros pendientes de T-0026,
incluidos fixtures reales, postura Data API/login, subdominio propio y D-0065.
El registro privado permanece fuera de Git y no se cargó con mensajes ficticios
presentados como observaciones reales.

## Revisión independiente

`REVIEWS/T-0026-acceptance-tooling-2026-10-09.md`: sin Act on para este incremento.
El revisor repitió check, test y build contra su propia instancia sintética. C1 queda
como mejora opcional de cobertura del camino SQL/CLI exitoso completo; C2 ya está
explicitado en la guía y deberá mantenerse al producir el informe real.
