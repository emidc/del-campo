# ADR-0022 — La autorización es híbrida: RLS decide las filas y la aplicación la acción

- **Id en `decisions.yaml`:** D-0022
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-03
- **Supersede:** —
- **Aprobación:** el owner, el 2026-11-03, en el hilo de T-0035 («D-0022 — APROBADO:
  autorización híbrida»), sobre la propuesta del spike `T-0002`.

## Contexto

`D-0022` pregunta si la autorización de Broker OS se hace cumplir con RLS de Postgres, en
la capa de aplicación o de forma híbrida. Desde que se abrió cambiaron los principales:
`D-0072` define tres roles internos con alcance por empresa, cuentas de Google externas
invitadas y revocación inmediata; el portal de la north star v25 es de empresas (C12); el
servidor MCP de `D-0075` es el agente concreto; y `D-0063` y `D-0071` separan tres
contextos con base propia, integrados por API de aplicación.

El spike `T-0002` comparó los tres mecanismos sobre la misma matriz con un Postgres local
y datos sintéticos. Evidencia completa en `SPIKES/T-0002-enforcement-autorizacion.md` y
`ops/evidence/T-0002.md`. Los hechos que deciden:

1. Una consulta sin filtro con BYPASSRLS ve todas las pólizas; con RLS, sólo las de la
   persona. Es la clase de defecto más probable en código escrito con agentes.
2. La regla «quien escribe no aprueba», olvidada en la app, deja pasar la aprobación sin
   RLS y es frenada por un `WITH CHECK` de una línea con RLS.
3. Ocho mutaciones de las reglas en la base (permisos de más, regla de autor, baja,
   límite del intervalo, grants de worker y MCP, admisión entre contextos) las detecta la
   suite.
4. Resolver el principal en la base en cada request hace que la baja de una persona
   corte el acceso en el request siguiente, también con un token válido.
5. El costo de RLS con 20 000 pólizas sintéticas fue de 3,7 a 3,9 ms contra 2,6 a 2,7 ms
   del filtro en la app, en dos corridas: no decide a esta escala.
6. Todo lo usado es PostgreSQL estándar. La única pieza con forma de Supabase es una
   función que lee el `sub` de los claims.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, D-0022.

## Cómo se aplica

- **Filas, en Postgres.** Cada contexto hace cumplir con RLS qué empresas, qué contenido
  del portal y qué evaluaciones ve cada principal. Las políticas llaman a funciones de
  predicado `SECURITY DEFINER` con `search_path` fijo, envueltas en `(select …)`, que son
  la única fuente de esos predicados.
- **Acción, en la aplicación.** Rol × acción, la regla de autor y la explicación de quién
  puede viven en funciones puras de la app, que leen las mismas funciones de predicado.
- **Las reglas que protegen una decisión humana, en las dos.** Autor distinto de quien
  aprueba o acepta se repite como `WITH CHECK`, con grants de UPDATE por columna.
- **Principal por transacción.** La app fija el principal como configuración local a la
  transacción en un único helper; nunca a nivel de sesión, porque el pooler en modo
  transacción reutiliza la conexión.
- **Perfiles de conexión.** App, worker y servidor MCP con roles propios, sin
  `BYPASSRLS` ni superusuario, con grants mínimos. El MCP actúa en nombre de una persona
  y sólo lee. El service role queda para migraciones y operación del owner.
- **Entre contextos.** Broker OS reenvía la identidad de la persona al llamar a la API de
  Risk OS o de Communication OS; cada contexto resuelve admisión y alcance con sus
  propias tablas y su propio rol.

### Decisiones funcionales del owner

Tomadas con la aprobación, sobre los supuestos que el spike dejó abiertos:

- El Revisor profesional no accede por defecto a pólizas ni a notas internas.
- El portal de empresas (C12) no muestra pólizas completas al inicio.
- El predicado de aseguradora con vínculo de póliza vigente sale del alcance: la north
  star no tiene portal de aseguradoras.

### Condiciones de implementación y aceptación de C1 (`T-0035`)

El owner las fijó como criterios de C1, no como investigación pendiente:

1. **Autenticación real.** El principal que la app declara a la base sale de una sesión
   verificada; RLS no autentica (prueba 6 del spike).
2. **Propagación segura de la identidad.** Entre contextos viaja la identidad de la
   persona, y el contexto que la recibe la verifica y aplica su propia admisión y
   alcance.
3. **Uso del pooler.** El principal se fija sólo local a la transacción, en un único
   helper; nada de `SET` de sesión (prueba 7).
4. **Restricciones de ejecución sobre funciones privilegiadas.** Las funciones
   `SECURITY DEFINER` tienen `search_path` fijo, `EXECUTE` revocado a `PUBLIC` y
   concedido sólo a los roles que las necesitan.
5. **Cobertura de RLS.** Toda tabla de datos tiene RLS habilitado y sus políticas; un
   chequeo lo exige para cada migración nueva.
6. **Revocación inmediata.** La baja corta el acceso en el request siguiente, también
   con un token todavía vigente (prueba 2 y prueba 8).

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Sólo capa de aplicación | Una consulta que olvida el filtro expone todo, y la regla de autor depende de que ninguna ruta la omita. El spike lo mostró con la misma app y un defecto. |
| Sólo RLS | No produce la explicación de quién puede que muestra la v25, expresa mal reglas que dependen del flujo y deja a la app interpretando errores de Postgres. |
| RLS sobre `auth.uid()` de Supabase directamente | Ata las políticas a Supabase Auth, que `T-0035` todavía tiene que confirmar frente a `D-0013`. Una función propia que lee los claims da lo mismo y se reemplaza sola. |
| Una identidad de servicio de Broker OS para leer a Risk OS | Broker OS vería en Risk OS más de lo que la persona puede ver ahí, y las bajas de Risk OS no cortarían esa lectura. |

## Consecuencias

**Más fácil:** una consulta nueva no puede filtrar datos de otra empresa por omisión; el
portal y el MCP se construyen sobre las mismas políticas que la app; la baja vale en el
request siguiente; la matriz se prueba con una suite que corre en CI contra Postgres.

**Más difícil:**

- Los predicados viven en SQL y en la app: las funciones `authz.*` tienen que ser la
  única fuente, o divergen.
- RLS no protege contra una autenticación rota: si la app declara un principal falso,
  la base le cree. La verificación del token y de la admisión es de `T-0035`.
- Cada migración que agrega una tabla de datos tiene que agregar su política, o la tabla
  queda vacía para la app (deny-by-default) o, si se olvida habilitar RLS, abierta. Hace
  falta un chequeo que exija RLS habilitado en toda tabla de datos.
- Cada request con principal abre una transacción.

**Costo de revertir (estimado):** quitar RLS es un `drop policy` por tabla; lo caro es
agregar el filtro a cada consulta de lectura. Días por contexto, si los predicados siguen
en funciones únicas.

## Criterio de falsación

Señales para revisarla: que una política no pueda expresar un predicado de la matriz
fina de `T-0035` sin duplicar la lógica de la app; que el costo de RLS supere al de la
consulta con volumen real; que un pooler o un proveedor impida fijar el principal por
transacción; o que una revisión encuentre un camino de lectura que no pase por el rol con
RLS.
