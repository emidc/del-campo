# Revisión ciega R-33 · T-0037 I1c (C3-01c)

**Revisado:** rama `task/T-0037-cobertura-u8` en `b72504a` contra `main` en `35afe09`.
**Revisor:** subagente aislado de Claude Code, sin el transcript ni la justificación de la
sesión que implementó. Recibió la tarea, la fila C3-01c del plan y el §4 del diseño; buscó
`DOMAIN.md` y `decisions.yaml` por su cuenta y corrió la verificación antes de leer la
evidencia. No podía escribir en el repo: este reporte es su salida, resumida por la
sesión que implementó. La sección «Cierre» es de esa sesión.

**Veredicto del revisor:** cumple lo mecánico del criterio (una vez por póliza, cuatro
niveles, salida sin datos de clientes), con un Act on.

## 1. Qué corrió

- Las 5 pruebas de `cobertura.integration.test.ts` contra `delcampo_dev`: pasan.
  `pnpm typecheck` y `pnpm lint`: sin errores (aviso de Node 22 contra `>=24`).
- Una base propia `revision_i1c_demo`, creada y borrada, con datos sintéticos. El CLI no
  corre ahí porque `conectar()` sólo acepta `delcampo_t0013_dev`; llamó a
  `medirCoberturaDocumental` dentro de `sql.begin('read only', …)` como el CLI. Un
  `INSERT` en esa transacción falla: la medición es de sólo lectura.

## 2. Hallazgos

### Act on

1. **La ambigüedad de la carpeta del cliente sube a la póliza a Pendiente**
   (`cobertura.ts:40-42`, origen en `query.ts:150`). La consulta de VS01 llena `pending`
   con AMBIGUOUS cuando el tomador tiene dos carpetas `HUMAN`, y `nivelU8` lo contaba como
   Pendiente. Reproducido: póliza sin documento ni pendiente, tomador con dos carpetas,
   sale «Pendiente 1 (100 %)». Puede darse con datos reales: `projectClientFolder`
   (`load.ts:247-271`) no deduplica carpetas por cliente. Contradice el código («no sube
   a nadie de nivel») y el diseño («la carpeta del cliente no cuenta»). Sugerencia:
   Pendiente sólo por el documento, con una prueba de dos carpetas y sin documento.

### Consider

2. **Todas las pólizas del dominio en lugar de «las del lote vigente»** (`cobertura.ts:75`).
   Defendible, pero cambia el diseño y, después del primer refresco, mezcla pólizas que
   Zoho ya no informa y que no reciben enlaces nuevos. Hoy da igual: un solo lote.
   Sugerencia: aceptación explícita del owner, o una fila de ausentes del lote vigente.
3. **Pólizas sintéticas que hayan quedado en la base entran en U8.** Sugerencia: que la
   evidencia compare el total con el conteo del lote.
4. **Qué base mide el CLI.** `coverage` sólo corre contra `delcampo_t0013_dev`, pero I4
   dice que el owner refresca producción y registra U8. Sugerencia: decir en el diseño
   dónde se mide y por qué equivale a producción.
5. **Faltan pruebas:** ambigüedad de carpeta, carpeta sólo de Zoho, el error de filas
   distintas y la medición en sólo lectura.

### Noted

6. Un enlace de Zoho prevalece sobre un pendiente que dejó el cargador de T-0017 al
   convertir dos verificados en AMBIGUOUS. Coherente con el orden del §4 y con D-0064;
   anterior a este cambio.
7. Las proporciones redondeadas pueden no sumar 100 (3 × 33,3).
8. El conteo es global y no respeta `client_assignment`: correcto para una métrica.

### Dismissed

- Doble conteo o póliza sin nivel: `nivelU8` es total y excluyente, la consulta da una
  fila por id, hay `Set` y control de cantidad.
- Precedencia: coincide con D-0064, D-0057 y `describirAcceso`.
- Filtración: la tabla sólo recibe conteos.
- Escritura: `begin read only`, comprobado con un `INSERT`.
- Rendimiento de `unnest` con unos 2.000 uuid.

---

## Cierre (sesión que implementó, 2026-11-10)

| Hallazgo | Qué se hizo |
|---|---|
| A1 | Pendiente sale sólo del documento: una referencia documental sin resolver o más de un vínculo humano (`pendientesDelDocumento`), las mismas fuentes que `query.ts` menos la carpeta. `query.ts` y la pantalla no cambian. Pruebas: dos carpetas humanas sin documento da Sin documento; dos carpetas con pendiente del documento da Pendiente |
| C2 | Se lleva al owner como decisión. Mientras tanto queda «todas las pólizas del dominio», documentado en el §4 del diseño |
| C3 | La evidencia de I4 compara el total con las pólizas importadas del lote; anotado para C3-06 |
| C4 | El §4 del diseño dice que U8 se mide en la base local del owner, después de importar el lote con que refresca producción, y por qué hoy equivale |
| C5 | Pruebas nuevas: dos carpetas, carpeta sólo de Zoho y medición dentro de `begin read only`. El error de filas distintas no se puede provocar sin romper la consulta; queda sin prueba |
| N7 | El §4 aclara que las proporciones van redondeadas y que los conteos sí suman el total |
| N6, N8 | Sin cambio |
