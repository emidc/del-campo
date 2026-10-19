# ADR-0070 — Preparación asistida de datasets de Risk OS

- **Id en `decisions.yaml`:** D-0070
- **Fecha:** 2026-10-19
- **Relación:** refina parcialmente D-0039 y la preparación de D-0068; conserva R-16,
  R-18, la autorización por proveedor/modelo de R-19 y el aislamiento D-0063/D-0067.

## Problema y contexto

T-0032 debe llevar cinco empresas históricas a la aceptación de RO01. La distinción
original de D-0039 cubría desarrollo del software y ejecución de funciones de producto,
pero no la preparación de evidencia para el importador fuera de la app. R-19 y RO01
terminaban exigiendo preparación manual de material cuya extracción, estructuración
y detección de faltantes el owner quiere realizar con IA de forma estable, también
para datasets futuros. Eso no requiere convertir Production en un entorno de agentes.

La decisión y su estado viven sólo en `decisions.yaml`, D-0070. Este ADR explica
sus motivos y consecuencias; no cambia metodología, contratos CSV, schema ni UI.

## Alcance y fundamento

La nueva categoría se define por la función autorizada de preparación, no por usar
Codex u otra herramienta. Mantiene least privilege: permite trabajar sobre evidencia
aportada sin heredar credenciales ni permisos de ingeniería o de producto.

La autorización económica y aseguradora empresarial es necesaria para evaluar
transferencia: excluir sumas, límites, deducibles, valores expuestos y pérdidas
impediría construir el dataset útil. Fotografías, informes, controles, continuidad,
acciones y respuestas aportan contexto operacional. Que un accidente sea relevante
no hace necesarios el nombre ni la historia clínica de la persona: la separación y
redacción previa evitan divulgar categorías personales excluidas. Los secretos no
son evidencia de riesgo y siguen prohibidos sin excepción por esta decisión.

Minimizar exige seleccionar páginas, regiones de imágenes y hechos necesarios antes
de enviarlos. Un documento empresarial puede mezclar datos autorizados y excluidos;
la autorización del documento por su título no basta. El owner conserva los originales
privadamente y aporta versiones reducidas cuando corresponde.

## Procedencia, revisión y auditabilidad

La IA puede producir un CSV formalmente correcto y semánticamente falso. Por eso los
estados de evidencia de D-0070 deben mantenerse visibles y conectados a una fuente,
confirmación o razonamiento. Documentado significa respaldo directo, no certificación
de veracidad de la fuente; una contradicción exige adjudicación, no elegir en silencio.
La aprobación humana tampoco cambia retrospectivamente la procedencia.

El contrato vigente ya distingue `base`, evidencia, incertidumbre y revisión. Los
rótulos de preparación no son nuevos enums de importación. El protocolo explica cómo
conservar el detalle en un registro privado y representar lo admisible en los campos
actuales, sin inventar columnas ni completar obligatorios con valores plausibles.

La auditoría privada relaciona función, usuario autorizante, recursos, proveedor,
modelo, categorías, fechas, candidatos y aprobación del lote. Evita prompts completos
en logs y duplicación de PII. El informe público sólo acredita controles y conteos;
no publica la trazabilidad que contiene valores. Esta documentación es un control
operativo revisable, no enforcement automático nuevo.

## Relación con importación y aceptación

Preparación y validación local terminan con un candidato revisable. El backup y la
importación siguen a cargo del owner, con el rol de aplicación de D-0068; el agente
no opera la base hosteada. La revisión profesional posterior y el material ciego de
A8 siguen siendo independientes de la preparación asistida. A13 pasa a verificar el
alcance autorizado y la ausencia de divulgaciones prohibidas, sin fingir que ninguna
IA intervino. Las evidencias del 2026-10-17 se conservan como históricas.

## Proveedor/modelo autorizado

La primera versión de esta decisión dejaba pendiente la pareja: el owner había elegido
Codex de OpenAI para H1–H5, pero no se pudo acreditar el identificador exacto del modelo
efectivo de esas sesiones, y la preparación quedó bloqueada.

El 2026-10-19 el owner cambió la elección a Anthropic `claude-opus-5-5`. La sesión de
Claude Code que corrió el gate de H1 acreditó el modelo con sus metadatos: modelo
configurado `claude-opus-5-5[1m]` (la variante de contexto extendido del mismo modelo)
y modelo efectivamente servido `claude-opus-5-5`. Con eso se registra la aprobación
explícita en `decisions.yaml`, con alcance de lectura de la evidencia aportada y de
escritura sólo en la carpeta privada designada por el owner, fuera del repositorio.

La aprobación nombra un modelo, no una familia ni una herramienta. Las sesiones pueden
tener modelos de respaldo configurados que el runtime usa ante indisponibilidad; esos
modelos no quedan autorizados. Cada sesión de preparación comprueba el modelo servido
antes de recibir evidencia, y se detiene si cambia. Codex de OpenAI u otro proveedor
vuelve a requerir su propia aprobación previa.

## Alternativas consideradas

| Alternativa | Evaluación |
| --- | --- |
| A. Mantener todo manual | Conserva el cuello de botella de extracción y mantenimiento y contradice la forma de trabajo elegida por el owner. |
| B. Permitir datos reales a cualquier agente de desarrollo | Amplía privilegios de quienes sólo necesitan código y sintéticos; rompe la separación que motivó D-0039. |
| C. Excepción puntual por cada H | Repite la misma autorización de función cinco veces y deja sin respuesta el mantenimiento y los datasets futuros; no sustituye el control por proveedor/modelo. |
| D. Categoría estable y acotada de preparación | Elegida por el owner: separa función, datos y acceso; mantiene revisión humana y aprobación previa por proveedor/modelo. |

## Riesgos y consecuencias

- Una inferencia convincente puede parecer evidencia: procedencia visible, unknowns y
  revisión humana son necesarios incluso con validación mecánica sin rechazos.
- Fuentes contradictorias o desactualizadas pueden inducir evaluaciones erróneas:
  inventario, fecha y preguntas concretas permiten al owner adjudicar.
- La divulgación a un modelo no se revierte borrando el CSV: minimización y aprobación
  previa de proveedor/modelo ocurren antes de procesar datos, no al cerrar el lote.
- La revisión humana puede volverse ceremonial: el resumen de entrega identifica
  inferencias, faltantes, advertencias y límites de validación expresamente.
- No se relajan deny-by-default, R-16/R-18, aislamiento ni protección de Production.
  Una nueva necesidad de acceso o categoría excluida requiere otra decisión explícita.

## Historia de D-0039

Se mantiene ACCEPTED, con `superseded_in_part_by` para identificar la cláusula refinada
y una referencia a D-0070 en su statement. Se evita tanto dejar una afirmación universal
falsa como reemplazar toda la decisión y perder sus límites para desarrollo/producto.
El ADR original conserva su contexto fechado con una nota de vigencia.
