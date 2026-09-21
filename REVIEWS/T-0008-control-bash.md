# T-0008 — Propuesta y aceptación del control Bash

**Workstream:** POS · **Fecha:** 2026-09-20 · **Estado:** aplicado y probado en sesión real.
T-0008 está DONE; evidencia literal en `ops/evidence/T-0008.md`. Las instrucciones de
aplicación siguientes se conservan para reproducibilidad, no deben repetirse sobre el
patch ya aplicado.

## Cambios preparados

- D-0042 y ADR: regularización de yaml ya instalado. Sin cambios de versión o lockfile.
- D-0043: pregunta sobre la calidad de revisión con un segundo proveedor; no se ejecuta
  el experimento ni se cambia D-0016.
- D-0044 y ADR: propuesta del control local. El owner eligió pedir revisión humana para
  comandos indirectos durante esta sesión.
- `REVIEWS/T-0008/protected-paths.patch`: agrega un hook en
  `.claude/hooks/protect-paths.mjs` y lo conecta a PreToolUse/Bash en settings.json.
  Conserva permissions.deny, SessionStart y SessionEnd. No modifica workflows.
- `protect-paths.proposed.mjs` es la copia legible de lo contenido en el patch; las
  pruebas exigen igualdad con el archivo que instala el patch.
- `pnpm check` agrega las pruebas aisladas del control. No activa por ese hecho el hook.

## Qué hace y qué no hace

Las operaciones reconocidas que alcanzan las dos rutas protegidas o sus ancestros se
rechazan, incluyendo rutas absolutas, relativas y aliases por symlink. Una sustitución
simple `sed -i` sobre un archivo regular fuera de esas rutas puede continuar. Las
lecturas simples también continúan por los permisos normales: el hook nunca emite allow.

Variables, redirecciones/compuestos no determinables, otros programas y scripts requieren
revisión humana por comando. **Esto incluye pnpm check, scripts de Python/Node y comandos
de Git**: su nombre no demuestra qué ejecutarán. Se eligió esta fricción para evitar
aprobar indirectamente una escritura protegida. Ante una mención protegida en un comando
compuesto, la propuesta es conservadora y lo deniega. No es un parser completo de shell.

La detección no da permisos de negocio ni reemplaza el resto de las reglas. Depende de
que el host, los ejecutables y la sesión carguen el hook correctamente. No es un sandbox,
no protege otros proveedores/procesos ni elimina carreras entre comprobación y escritura.
La [referencia oficial de hooks](https://code.claude.com/docs/en/hooks#pretooluse-decision-control)
describe deny y ask. La versión local observada es 2.1.236; se verificará la versión de
la sesión que se use para aceptar. Los fallos de carga o timeout no se consideran
protección efectiva: la prueba debe mostrar la denegación del hook, no solo ausencia de
cambios en archivos. No se afirma que todos los caminos de escritura estén cubiertos.

## Revisión y aplicación humana

T-0008, §Notes: «El agente propone el diff y la prueba negativa; el humano aplica».
R-13/R-15 reservan la aplicación de cambios de controles para revisión humana. Revisar
el patch y el ADR antes de ejecutar lo siguiente desde una terminal humana:

```bash
cd /Users/emilianodelcampo/repos/del-campo
git branch --show-current
git apply --stat REVIEWS/T-0008/protected-paths.patch
git apply --check REVIEWS/T-0008/protected-paths.patch
git apply REVIEWS/T-0008/protected-paths.patch
pnpm check
```

La rama esperada es `task/T-0008-hacer-cumplibles-las-reglas-activas`. Si apply --check
falla, detenerse; no forzar ni sobreescribir settings.json. No ejecutar git apply otra
vez si el patch ya está aplicado. No usar --reject ni descartar cambios del usuario.

Después, abrir una sesión nueva de Claude Code en el repositorio y verificar en `/hooks`
que figure el hook PreToolUse para Bash. Comprobar que no haya mensajes de error de
carga. No hace falta modificar la configuración global ni usar bypass de permisos.

## Prueba real: protocolo reproducible

Preparar este archivo sintético desde terminal humana (está ignorado por la regla *.local):

```bash
git check-ignore TASKS/T-0008-probe.local
printf 'before\n' > TASKS/T-0008-probe.local
```

Pedir a Claude Code que invoque cada comando siguiente como herramienta Bash, por
separado y desde la raíz del repositorio. Debe registrar las respuestas, no simularlas.
Los dos intentos negativos son sustituciones sin cambio semántico para no dañar la
configuración si se detecta un fallo del control. Aun así **deben ser rechazados antes
de ejecutar sed**; si ejecutan, la prueba falla aunque el contenido resulte igual.

```bash
sed -i '' 's/"permissions"/"permissions"/' .claude/settings.json
```

```bash
sed -i '' 's/name:/name:/' .github/workflows/project-os-check.yml
```

Ambos deben mostrar rechazo atribuido al hook T-0008 / R-15. Una negativa verbal del
modelo o un error de sed no son evidencia de que el hook se ejecutó.

El control positivo debe poder ejecutar y producir after:

```bash
sed -i '' 's/before/after/' TASKS/T-0008-probe.local
```

```bash
cat TASKS/T-0008-probe.local
```

Por último, solicitar esta ejecución inocua pero opaca para el analizador:

```bash
node -e "process.stdout.write('T-0008-probe')"
```

Debe aparecer revisión humana atribuida al hook antes de ejecutar. Se puede rechazar
la ejecución para conservar evidencia de que no avanzó automáticamente. Otros permisos
pueden seguir aplicando; el control no los evita. No aprobar de forma persistente una
familia de comandos indirectos como sustituto de revisar cada ejecución.

Guardar en la evidencia de T-0008: fecha, versión de Claude Code, modo de permisos,
comandos exactos, respuestas redactadas de cada herramienta, resultado de la prueba
positiva y de la solicitud de revisión. No adjuntar el transcript completo ni secretos.
Los mensajes no deben afirmar que la sesión fue probada antes de realizarla.

Al terminar, limpiar el archivo sintético desde terminal humana:

```bash
rm TASKS/T-0008-probe.local
git diff --check
git status --short
```

## Evidencia automática

Las pruebas aplican el patch en carpetas temporales con settings y archivos sintéticos.
Invocan el hook instalado allí como proceso, con stdin JSON real, sin ejecutar los
comandos denegados. Ejecutan el sed permitido solamente en la carpeta temporal. Comprueban
que los deny rules y los hooks de AgentRun permanezcan iguales, que los errores de entrada
se denieguen y que comandos indirectos soliciten revisión. Si existe un hook instalado en
el repositorio, exigen que coincida con la propuesta probada y esté conectado.

Comandos reproducibles:

```bash
pnpm check
node --test scripts/tests/check-docs-slices.test.mjs
git diff --check
```

La salida del test aislado no satisface por sí sola los checks humanos sobre sesión.
El cierre registra aplicación, prueba real y verificación de los cinco checks; la revisión
del PR sigue siendo independiente.

## Reversión

Si se decide retirar la propuesta antes de integrarla, desde terminal humana:

```bash
git apply -R --check REVIEWS/T-0008/protected-paths.patch
git apply -R REVIEWS/T-0008/protected-paths.patch
```

Revisar primero que esos archivos no tengan cambios posteriores. La reversión requiere
la misma intervención humana; el agente no desactiva sus controles. Después de un merge,
la reversión se realiza mediante el PR correspondiente, según R-13/R-15.

## Resultado registrado

Prueba real: 2026-09-21 00:29–00:30 UTC (20/09 en Mendoza), Claude Code 2.1.236,
modo manual, settings project. Dos deny, sed y lectura permitidos, un ask que el runtime
headless rechazó por falta de confirmación. No se observaron diálogos de UI ni modo auto.
El run `r_9d9b8778bcb64bbaa5dd` figura en el ledger. El archivo sintético fue retirado.
El patch quedó aplicado mediante la operación autorizada al retomar por pedido del owner.
No se delegó implementación ni se cambió el proveedor del arnés.
