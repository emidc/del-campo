# Risk OS — preparación de datasets con agentes

Workstream BOS · T-0032 · D-0070. Protocolo reutilizable para H1–H5 y datasets futuros.
No contiene datos de empresas ni inicia una sesión de preparación. La política canónica
está en `decisions.yaml`; el despliegue y la importación en [vercel-risk.md](vercel-risk.md).

## Antes de recibir evidencia

1. Leer R-16, R-18 y R-19, D-0039/D-0067/D-0068/D-0070 y `SLICES/RO01.md`.
   Leer la metodología vigente (`SPIKES/T-0021/v1/metodologia-v1.md` y su
   congelamiento), `contexts/risk/README.md` y los contratos y reglas de
   `contexts/risk/contrato/`, contrastados con `SPIKES/T-0021/v0/fase-15/contrato/`.
2. Comprobar la aprobación explícita en `decisions.yaml` del proveedor y modelo
   exactos de la sesión para preparación de Risk OS. **Está pendiente al 2026-10-19:**
   Codex/OpenAI no identifica por sí solo el modelo. Sin esa aprobación, detenerse
   antes de recibir o leer evidencia real. Un cambio de modelo exige volver a comprobar.
3. Registrar privadamente la función autorizada, usuario/owner, código de dataset,
   recursos permitidos de lectura y escritura, proveedor, modelo, categorías y fecha.
   No basta ser el agente que desarrolla Risk OS. Trabajar en una carpeta privada
   fuera del repositorio y de los destinos públicos de logs, tests y evidencias.
4. El owner selecciona y minimiza el material antes de aportarlo: sólo las páginas,
   imágenes o fragmentos necesarios. Redactar nombres o identificadores personales
   innecesarios, salud, vida, información médica o bancaria personal. Separar los
   incidentes operacionales de los datos sensibles de personas. Nunca aportar
   credenciales, secretos, tokens, variables productivas ni backups. No abrir
   conectores externos ni Production; la evidencia la aporta el owner.

## Preparar e iterar

1. **Inventariar las fuentes:** asignar referencias privadas estables, tipo, fecha,
   versión y localización (página, sección o imagen), emisor y límites de alcance.
   Registrar ausencias, ilegibilidad, desactualización y posibles duplicados.
   No asumir que una fuente es correcta sólo por existir.
2. **Extraer hechos con procedencia:** por afirmación o dato material conservar su
   referencia y la distinción DOCUMENTADO / CONFIRMADO / INFERIDO / UNKNOWN de D-0070.
   Una confirmación lleva quién, cuándo y qué confirmó; una inferencia, fundamento
   y fuentes. Una fuente documentada no elimina las contradicciones con otras.
3. **Contradicciones y unknowns:** mantener una lista privada de cuestiones pendientes,
   impacto sobre riesgos/evaluación/transferencia y evidencia requerida. Entrevistar
   al owner **una pregunta concreta por vez** cuando falte información material.
   Esperar la respuesta o evidencia adicional; conservar el desconocido si no existe.
   No inventar valores, fechas, controles, acciones cumplidas ni evidencia para pasar
   el validador. No resolver contradicciones materiales silenciosamente.
4. **Proponer y estructurar:** aplicar la metodología vigente, con sus limitaciones.
   Distinguir el hecho extraído de la propuesta de riesgo o evaluación que deriva de él.
   El owner adjudica las acciones históricas y la cadena única por riesgo (RO01 §5).
5. **Generar candidatos:** exactamente `risks.csv`, `action-plan.csv` y
   `risk-transfer.csv`, con columnas y enums del contrato vigente. La trazabilidad
   privada acompaña al lote; no es un cuarto archivo de importación.

### Procedencia sin cambiar el contrato

Los cuatro rótulos de preparación describen evidencia, no reemplazan `base`
(`observed | reported | inferred | assumed`) ni `<f>_estado`
(`known | unknown | no_aplica`). No hay traducción automática DOCUMENTADO → observed:
una póliza puede documentar una declaración de un tercero. Elegir la base según la
naturaleza de la afirmación y las definiciones vigentes; una propuesta inferida
conserva `inferred`, aunque sus fuentes estén documentadas. `CONFIRMADO` conserva
la confirmación humana en evidencia/observación y la base que corresponda.

Usar los campos existentes de evidencia, observación, incertidumbre y necesidad de
validación. Si un factor carece de evidencia suficiente, `unknown` sin valor y con
nota de qué falta, según contrato. No usar `assumed`, cero o `no_aplica` para rellenar
un obligatorio desconocido. Si el contrato no representa un dato, conservarlo fuera
del CSV en la trazabilidad privada y señalarlo al owner; no cambiar columnas ni
perder la procedencia para lograr un lote válido. La revisión humana no convierte
una inferencia en observación ni reemplaza la evidencia original.

## Validar y entregar al owner

Validación local de archivos, sin base y sin importar (desde la raíz del repo):

```bash
node SPIKES/T-0021/v0/fase-15/validador/validar.ts /ruta/privada/dataset --corte AAAA-MM-DD
```

Es el validador de archivos del spike, base del contrato portado. Comprobar que sigue
alineado con el contrato vigente antes de usarlo. Imprime conteos por regla. Si se usa
`--salida`, el archivo de hallazgos puede contener valores: guardarlo sólo en la carpeta
privada y no publicarlo. Iterar sobre los rechazos y revisar también los avisos.

Este paso **no** prueba referencias contra la base hosteada, duplicados ya importados,
constraints de persistencia ni veracidad. No usar el comando `import` como un supuesto
«dry run», ni cargar datos reales en `_dev`/`_test`: esas bases son para sintéticos.
Las comprobaciones contra el estado hosteado ocurren al importar por el owner.

Antes de considerar el dataset listo, entregar privadamente:

- versión de metodología/contrato y fecha de corte; huella de los tres CSV candidatos;
- inventario y resumen de procedencia, inferencias/supuestos, confirmaciones humanas,
  contradicciones adjudicadas o abiertas, unknowns y datos no representables;
- resultado de validación, errores resueltos, avisos pendientes y límites del chequeo;
- resumen de minimización y alcance autorizado, sin copiar PII en logs;
- decisión humana explícita de aprobar ese lote o devolverlo para corrección, con fecha.

Un rechazo mecánico impide declararlo listo. Un faltante material sin resolver se
presenta al owner: se conserva como unknown donde el contrato lo permita; si impide
cumplir el contrato, se bloquea la importación, no se inventa. El agente nunca firma
la aprobación humana ni marca `accepted` en su nombre.

Tras aprobar, el **owner** hace backup y ejecuta la importación con `risk_app` según
[la guía, §6 y §8](vercel-risk.md). Conserva el informe sin valores de cada intento
para A6, también los rechazados. Si cambia cualquier CSV, volver a validar y aprobar
la nueva huella antes de importar. La revisión profesional posterior de A8 subsiste;
el owner prepara su material ciego sin ranking, bandas ni `C_raw` del sistema.

## Cierre y auditoría

Guardar privadamente el vínculo entre fuentes, preguntas/respuestas, candidatos,
validaciones, aprobación y lote importado. R-19 exige función, usuario, recurso,
proveedor, modelo, categoría y timestamp, sin prompts completos en logs ni duplicación
innecesaria de PII. No commitear documentos, CSV, hallazgos con valores ni este registro.
Al acta pública sólo vuelven los informes sin valores y las comprobaciones de A13.
A13 no equivale a «ningún agente vio datos reales»: verifica que el procesamiento
estuvo autorizado y que no hubo datos o secretos fuera de su lugar permitido.
