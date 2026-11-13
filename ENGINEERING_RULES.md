# Del Campo — Reglas de trabajo

**Vigente desde:** 2026-11-13 (`D-0090`). Reemplaza al baseline v0.1 (R-01 a R-33), que
queda en el historial de Git. Las menciones a esas reglas en código, decisiones o tareas
anteriores son históricas y no obligan.

Broker OS es un sistema para un equipo de ocho personas. Estas reglas existen para que
llegue a usarse pronto y no se rompa, no para dejar constancia de cómo se trabajó.

## 1. Cómo entra un cambio

1. Cada cambio va en un PR contra `main`, con `pnpm check` en verde (tipos, lint y tests).
2. Emiliano revisa y mergea. Nadie más mergea a `main`.
3. El PR dice en pocas líneas qué cambia para quien usa el sistema. No hacen falta
   carpetas de evidencia, informes de revisión ni registro de la corrida.
4. Lo que se puede probar con un test, se prueba con un test. Lo que no, se describe en el
   PR como pasos para que Emiliano lo vea funcionando.

## 2. Qué necesita la aprobación de Emiliano antes de hacerse

- Cualquier cosa contra producción: migraciones, variables, despliegues manuales, cargas
  o correcciones de datos reales.
- Mensajes a clientes, aseguradoras o terceros, y cambios en su Drive.
- Dar acceso a una persona de afuera del equipo.
- Sumar un servicio externo pago o una integración nueva.

Todo lo demás (leer, ramas, tests, base local, abrir el PR) se hace sin preguntar.

## 3. Simplicidad

- Se elige la solución más simple que resuelve el caso real que hay hoy. No se construye
  para un caso que todavía no existe.
- Un solo sistema: una aplicación, una base de datos, un proyecto de Vercel
  (`PROJECT.md` §2). No se agregan servicios, esquemas aislados ni APIs internas entre
  partes del mismo sistema.
- Antes de agregar una tabla, un rol, un estado o una pantalla, preguntarse si alguien del
  equipo lo va a usar este mes. Si la respuesta es dudosa, se le pregunta a Emiliano en
  una línea.
- Borrar código que ya no se usa es trabajo bienvenido.

## 4. Usuarios y permisos

- Hay dos tipos de usuario: **equipo Del Campo**, que ve y edita todo, y **cliente**, que
  ve sólo su empresa en el portal. No hay roles internos ni permisos por función.
- La regla que no se negocia: **un cliente nunca ve datos de otra empresa.** Tiene tests
  propios, y todo cambio que toque el portal los corre.
- Cada cambio de datos guarda quién lo hizo y cuándo. Cuando lo hace un agente, guarda
  también qué agente y en nombre de qué persona.

## 5. Datos y secretos

- Nada de secretos en Git, PRs, logs ni prompts. Las credenciales viven en Vercel y
  Supabase.
- Los tests y la base local usan datos inventados. No se copian datos reales al repo.
- Los tests nunca corren contra una base hosteada (`scripts/guard-db-tests.mjs`).
- Los datos reales de clientes se trabajan con IA sólo desde las cuentas registradas en
  `D-0088`, y con el material necesario para la tarea.
- No se borran datos reales sin aprobación. Zoho sigue siendo la fuente hasta que
  Emiliano diga lo contrario.

## 6. Agentes y MCP

- Broker OS guarda y muestra datos. El método de trabajo (por ejemplo, cómo se analiza un
  riesgo) vive en los agentes, no en el código de Broker OS.
- Un agente es un conjunto de instrucciones versionadas en `agentes/<nombre>/`, que usa
  las herramientas del servidor MCP de Broker OS. Actúa con el usuario de la persona del
  equipo que lo está usando.
- Cada cambio a las instrucciones de un agente sube su versión y anota en una línea qué
  problema de uso real lo motivó.
- Las herramientas MCP son pocas y con nombre de tarea (leer una empresa, guardar un
  riesgo). No se expone la base de datos.

## 7. Tareas y decisiones

- Una tarea es un archivo corto en `TASKS/` (`TASKS/_TEMPLATE.md`) y su espejo en Linear.
  Dice para qué sirve y cuándo está lista. Nada más es obligatorio.
- `decisions.yaml` registra sólo decisiones que cambian el rumbo. No hace falta un ADR
  para decidir algo que se puede cambiar en un PR.
- Si una regla de este archivo estorba para entregar algo útil, se le dice a Emiliano y
  se cambia la regla.
