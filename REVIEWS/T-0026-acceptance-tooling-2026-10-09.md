# Revisión ciega R-33 — T-0026 (preparación de aceptación)

Workstream BOS. Revisor aislado, 2026-10-09.
Base: origin/main c0fd0065ed43ed14eb01fa234130f93999d8a261.
HEAD: 66a0db7eaa88fceb9e11c97f720f124e28a4575c.
Diff revisado completo: 12 archivos, 736 líneas agregadas, incluidos ambos archivos de tests. Contrato leído con git show origin/main:TASKS/T-0026-despliegue-y-aceptacion-co01.md. AGENTS.md y ENGINEERING_RULES.md leídos; DOMAIN.md y decisions.yaml encontrados por búsqueda propia. No recibí transcript ni justificación del implementador. Evidencia parcial leída solamente después de ejecutar los tres comandos Verification.

## Act on

Ninguno en el alcance de esta preparación. No encontré una regresión concreta introducida por el diff que amerite bloquear estas herramientas. El script toma una lista independiente, comprueba marcadores faltantes/repetidos/inesperados, participante/dirección, orden, ventana, estados y recuperación. Su lectura es una transacción READ ONLY consistente; la salida se construye mediante campos permitidos, y los errores no imprimen credenciales ni datos del driver. El fallo SQL está limitado al marcador exacto y tiene restauración explícita e idempotente.

Esto NO aprueba el cierre de T-0026 ni la aceptación de CO01: esos resultados requieren operaciones y evidencia reales aún pendientes.

## Consider

C1 — Añadir cobertura de integración del camino exitoso completo de readReport/CLI. El unit test construye Observation con acceptedFromUi=true directamente; el test SQL introduce salientes sin intentos aceptados y confirma el rechazo. No hay una prueba nueva que inserte outbound_attempt aceptados, estados y los mínimos completos, y obtenga los nueve criterios verdaderos a través de SQL. También sería útil comprobar los códigos CLI 0/1/2. Es una mejora de confianza, no un bug demostrado.

C2 — Mantener explícita la reconciliación humana de mensajes sin marcador y de intentos de envío inciertos. read.ts descarta cuerpos cuyo inicio no coincide con el patrón; el informe verde no demuestra que no existieran mensajes ajenos a esa lista. La guía ya declara este límite y exige registrar incidencias; conservar esa condición al elaborar el informe final.

## Noted

- Los nueve criterios son coherentes con la tabla de CO01 §4; la mención de ocho en T-0026 es una inconsistencia previa y el nuevo protocolo la identifica explícitamente.
- La preparación no cambia la tarea a DONE ni afirma una corrida de 72 h. La evidencia se declara retrospectiva y enumera lo no verificado; no presento sus capturas como evidencia propia.
- La guía de despliegue requerida por T-0026 aún falta, y siguen pendientes fixtures reales, dominio, controles de acceso, retención conforme a D-0065, cron real y ejercicios operativos. Son bloqueantes del cierre completo, no regresiones de este diff preparatorio.
- El cálculo de ventana es conservador y no prueba la hora exacta del click; la guía lo reconoce. La disponibilidad y el comportamiento real de Vercel/Meta necesitan el ensayo del owner.
- Verifiqué que data/co01-acceptance.local/manifest.json queda ignorado por Git. git diff --check no reportó problemas.
- No modifiqué implementación, tests, CI, hooks ni commits. No leí .env ni conecté producción. PostgreSQL 17 temporal independiente en 127.0.0.1:55439, usuario sintético co01review, bases delcampo_test y delcampo_communication_test.

## Dismissed

D1 — «La falta de aceptación real obliga a bloquear este PR como si declarara T-0026 terminada». Descartado: los documentos describen una preparación parcial y preservan READY; no hay afirmación de cumplimiento final. El cierre sí sigue bloqueado por las mediciones pendientes.

D2 — «Introducir el fallo SQL equivale a modificar las migraciones o dejar un fallo productivo automático». Descartado: son archivos manuales separados de migraciones; el protocolo exige owner, conteo previo, restauración siempre y comprobación posterior. La integración ejecuta fallo/restauración/reproceso doble sin duplicación.

## Verificación independiente

Entorno explícito para pnpm check y pnpm test:
DATABASE_URL=postgres://co01review@127.0.0.1:55439/delcampo_test
COMMUNICATION_DATABASE_URL=postgres://co01review@127.0.0.1:55439/delcampo_communication_test

Las primeras ejecuciones detectaron precondiciones faltantes del entorno nuevo (base Broker inexistente y luego esquema no migrado). Se creó la base sintética y se aplicaron las seis migraciones con pnpm db:migrate antes de repetir; no se atribuyen esos errores al diff.

- pnpm --filter './apps/communication' build: PASS. Incluyó reintentos de prerender por timeout, luego completó y listó todas las rutas. Log: /tmp/co01-blind-build.log.
- pnpm check: PASS, 74 tests documentales y 422 tests funcionales; cero fallos/skip, typecheck y lint exitosos. Log: /tmp/co01-blind-check-final.log.
- pnpm test: PASS, 422 tests, 90 suites, cero fallos/skip. Log: /tmp/co01-blind-test-final.log.

No se verificaron producción, pausa real, Meta, credenciales, fixtures reales ni observaciones humanas del manifest. No corresponde inferir aceptación de CO01 del éxito local.
