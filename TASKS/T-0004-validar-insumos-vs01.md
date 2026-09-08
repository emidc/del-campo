---
id: T-0004
title: Medir los insumos reales de VS01
kind: REVIEW
status: READY
workstream: MIG
riskClass: MEDIUM
size: M
created: 2026-09-08
blockedBy: []
contextRefs: [PROJECT.md, DOMAIN.md, ENGINEERING_RULES.md]
decisionRefs: [D-0005, D-0009, D-0019, D-0020, D-0021]
---

## Why

VS01 supone que se pueden identificar las pólizas vigentes en Zoho y vincularlas con
sus documentos en Drive, pero el repositorio no contiene evidencia sobre la semántica
real de los campos ni sobre cuánto se cumple la convención de carpetas. Construir el
importador o fijar la superficie de VS01 antes de medir ambos supuestos convertiría
datos desconocidos en diseño; esta revisión determina qué rebanada es realmente
entregable.

## Outcome

Existe un informe agregado y reproducible en `REVIEWS/T-0004-insumos-vs01.md` que:

- identifica el origen real de las pólizas en Zoho y los campos necesarios para
  distinguir vigentes, históricas y no clasificables;
- registra, para cada campo usado por VS01, su significado validado, fuente de esa
  interpretación y dudas pendientes;
- mide sobre una muestra declarada qué porcentaje de empresas y particulares cumple
  la convención de carpetas de Drive y qué porcentaje permite vincular una póliza sin
  intervención manual;
- clasifica los fallos de vinculación observados; y
- recomienda, con umbrales y evidencia, si VS01 puede vincular documentos
  automáticamente, necesita conciliación asistida o debe reducir su alcance.

El informe contiene únicamente métricas agregadas, ejemplos redactados y referencias
internas sin PII.

## Non-scope

- No se implementa el importador, el schema, la búsqueda ni la UI de VS01.
- No se limpian ni corrigen datos de Zoho o Drive.
- No se mueven, renombran, crean ni eliminan archivos o carpetas.
- No se copian exports, nombres, documentos ni identificadores de clientes al
  repositorio, prompts o logs.
- No se decide autenticación, autorización, hosting ni el alcance del portal.
- No se escribe el contrato final de VS01; esta revisión produce la evidencia que lo
  condiciona.

## Verification

```bash
pnpm check
```

Comprobaciones humanas:

- [ ] El universo o método de muestreo, los denominadores y la fecha de observación
      están declarados de forma que otra persona pueda repetir la medición.
- [ ] El inventario de Zoho separa hechos observados, interpretación confirmada por
      usuarios y campos cuya semántica continúa desconocida.
- [ ] Los conteos de pólizas distinguen vigentes, históricas, duplicadas y no
      clasificables sin incluir datos identificatorios en el informe.
- [ ] La medición de Drive informa por separado empresas y particulares, porcentaje
      de conformidad, porcentaje de vinculación automática y principales clases de
      fallo.
- [ ] La recomendación para VS01 declara el umbral utilizado y qué resultado cambiaría
      esa recomendación.
- [ ] Una revisión del diff confirma que no ingresaron PII, exports ni referencias a
      archivos concretos de clientes.

## Data effects

Solo lectura de fuentes reales mediante acceso humano autorizado o muestras
sanitizadas. El repositorio recibe exclusivamente el informe agregado y redactado. No
se modifica Zoho, Drive ni ningún dato de clientes; si no puede garantizarse esa
separación, la revisión se detiene y registra la limitación.

## Risks

- Una muestra cómoda puede exagerar la conformidad de Drive. Debe cubrir empresas y
  particulares y declarar cómo fue elegida.
- Los nombres técnicos de campos no prueban su significado operativo. La semántica se
  confirma con usuarios y los desacuerdos quedan visibles.
- El acceso a datos reales puede demorarse. La falta de acceso es un resultado que se
  registra; no se reemplaza con estimaciones presentadas como medición.
