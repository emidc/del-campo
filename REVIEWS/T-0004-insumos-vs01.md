# T-0004 — Insumos reales de VS01

**Workstream: MIG · Cierre formal: 19/09/2026 · Recomendación: CLOSE · T-0004: DONE.**

El usuario aprobó explícitamente la curación de los 28 IDs huérfanos en scope y el cierre de discovery con conciliación asistida para Drive. La evidencia satisface los exit criteria actualizados de T-0004: scope cuantificado, curación trazable, limitaciones observadas en la muestra y estrategia documental definida. D-0031 y D-0032 registran las decisiones canónicas. La automatización completa Policy-documento y la ejecución de migración quedan fuera de este cierre.

En el cierre no se ejecutó profiling, migración, limpieza, implementación ni consultas a Drive. Se actualizan la tarea, el índice del proyecto, las decisiones de discovery y los informes. DOMAIN.md y las decisiones OPEN permanecen intactos; T-0015 no se crea ni se ejecuta. La superficie de VS01 continúa bajo D-0019.

## 1. Procedencia, hechos y límites

Contexto: PROJECT.md, DOMAIN.md, ENGINEERING_RULES.md y decisiones D-0005/D-0006/D-0009/D-0019/D-0020/D-0021. Fuente de reglas de negocio: instrucciones finales y aprobación humana explícita del cierre del 19/09/2026, registradas en D-0031/D-0032; las reglas anteriores no reemplazadas se conservan según el informe de scope del 18/09. Fuente de conteos: informes agregados existentes, reconciliación dirigida de lookups y muestra Drive de la pasada previa. El cierre formal solo incorpora la aprobación humana y revisa documentación.

Evidencia local bajo `data/zoho-export-2026-09-16/profile/`:

- `profile-20260918T212140075873Z.json`: manifiesto y hashes de los 18 ZIP/raw.
- `migration-scope-analysis-20260918T213258184429Z.json`: relaciones, semántica y escenarios medidos previamente.
- `migration-closure-analysis-20260919T154335353110Z.md`: scope final y mediciones A–E.
- `catalog-reconciliation-20260919.local.json`: observación original por ID/label, preservada.
- `catalog-curation-approved-20260919.local.json`: disposiciones humanas finales y tabla exacta de importación, con source IDs y destinos existentes.
- `insumos-vs01-pre-formal-close-20260919.md`: informe previo al cambio de exit criteria, conservado como historia local.
- `drive-validation-sample-20260919.local.json` y `drive-validation-observed-20260919.local.json`: selección y observaciones de Drive, con datos de cliente retenidos solo localmente.

**Assumption/limitación de completitud:** los módulos operativos fueron exportados el 16/09/2026 y Productos/Proveedores el 18/09/2026; no existe garantía de snapshot transaccional común. Se solicitó confirmar que ambas exportaciones contienen todos los registros disponibles sin filtros; no se recibió confirmación al redactar este informe. No se atribuyen los huérfanos a esa diferencia sin evidencia. Si el usuario confirma completitud, registrar esa confirmación y conservar la limitación temporal: **las fechas distintas no bloquean por sí solas T-0004**. La instrucción de cierre acepta documentar esta limitación; no se afirma que la completitud haya sido certificada. Su verificación operacional se difiere al importador/cutover.

El parser valida hashes y claves fuente en el lote; no certifica la configuración API, la completitud histórica ni el estado actual de Zoho. Los conteos son filas fuente, no identidades deduplicadas. Los porcentajes de Drive corresponden solo a la muestra seleccionada.

## 2. Scope final aprobado e inclusión

| Entidad fuente | Filas incluidas | Regla |
| --- | ---: | --- |
| Policy / Polizas | **1.965** | Estado exactamente `VIGENTE` OR Vigencia Fin entre 2026-01-01 y 2026-09-16 inclusive |
| Endorsement / Endosos | **1.930** | Padre Policy en scope; no crea otra Policy |
| Opportunity / Oportunidades | **676** | Todas |
| Task / Tareas | **2.218** | Hora de creación durante 2026, cualquiera sea su estado |
| Claim / Siniestros | **1.061** | Todos |
| Contactos | **1.406** | Closure aprobado |
| Cuentas | **380** | Closure aprobado |
| Notas de Contactos | 853 | Padre incluido |
| Notas de Cuentas | 441 | Padre incluido |
| Notas de Oportunidades | 291 | Todas |

Total core: **9.636 filas**; notas: **1.585**, sin IDs repetidos entre las notas seleccionadas. Catálogos resueltos requeridos por las dependencias: **26 Productos y 21 Proveedores**; no equivalen a aseguradoras curadas. El universo de catálogos exportados contiene 29 Productos y 37 Proveedores. La curación posterior aprueba disposiciones para los 28 IDs huérfanos, sin crear registros ni cambiar los totales físicos del export.

Escenario principal: `vigente_o_fin_2026_antes_corte_alternativa`. La versión anterior usaba `< corte`, mientras que la decisión final exige `<= corte`; ninguna Policy del lote finaliza el 16/09 y ambos conjuntos resultan idénticos. Se conservan contradicciones de Estado/fecha sin alterar inclusión. De las 13.281 Policies fuente quedan 11.316 fuera por la regla; fuera de scope no significa borradas ni todas vencidas. Hay 0 IDs fuente vacíos o repetidos en Polizas; esto no prueba ausencia de duplicados contractuales ni autoriza merge por número.

Closure: semillas de Policy, Opportunity, Claim, Endorsement y Task seleccionadas; incluir ambos campos Contacto/Cuenta y `Relacionado con.id` de Task cuando resuelve unívocamente a esas entidades. Expandir hasta punto fijo Contacto→Cuenta, Cuenta→todos los Contactos por `Nombre de Cuenta.id`, Cuenta→Cuenta principal y Cuenta→Encargado de seguros. Resultado comprobado previamente por dos recorridos: 1.406/380, sin huérfanos ni ambigüedades en esos joins. No ampliar Policy por referencias históricas de Claims/Tasks.

Emision se conserva como fuente auxiliar de reconciliación, no como entidad core a migrar. Productos representa ramo/tipo de seguro (D-0031); no se crean jerarquías por parecido semántico. Este scope de migración es más amplio que la superficie de VS01 establecida por D-0019 (Póliza + Documentos + Búsqueda). No implica implementar ahora oportunidades, siniestros, tareas o workflows de negocio en la UI.

## 3. Campos, significado y autoridad de interpretación

| Campo fuente | Uso y significado confirmado | Fuente / duda residual |
| --- | --- | --- |
| `Polizas.ID de registro` | Identidad fuente y trazabilidad de fila | Unicidad observada; no es el ID canónico Broker OS |
| `Estado` | Literal VIGENTE habilita inclusión | Usuario, 19/09; no sustituir por cálculo temporal |
| `Vigencia Inicio` / `Vigencia Fin` | Intervalo contractual fuente; Fin define la segunda rama del scope | Usuario; formatos e inconsistencias medidos; no reparar automáticamente |
| `Contacto.id` / `Cuenta.id` | Tomador/relación de entidad | Regla previa conservada: si ambos, Cuenta como tomador y Contacto relacionado; cada referencia presente resuelve en el lote |
| `Número de póliza` | Referencia contractual externa | D-0005/D-0006; no asumir unicidad global ni cadena de renovación solo por texto |
| `Compañía.id` + `Compañía` | Lookup y display de aseguradora | Semántica de negocio; ID distinto no se reconcilia solo por label |
| `Riesgo.id` + `Riesgo` | Referencia de tipo/ramo/producto | Regla de negocio previa; no decide estructura de InsuranceProduct/RiskObject |
| `CUIL` / `CUIT` | Identificador fiscal, no identidad técnica | Usuario: obligatorio para entidades validadas, no excluyente para legado |
| `Tareas.Hora de creación` | Filtro anual de inclusión | Encabezado y valores observados; confirmar correspondencia Created_Time/zona horaria antes de implementar |
| `Siniestros.Número de Poliza` | Referencia fuente al período asegurado | No es FK dedicada; matching exacto por número + compañía es candidato verificable |
| `Drive URL` / `Drive Folder ID` | Referencias documentales fuente | Presencia y acceso medidos por separado; naming y pertenencia requieren validación |

## 4. Identidad fiscal y excepciones

| Entidad | Válido técnicamente | Ausente | Inválido | Total |
| --- | ---: | ---: | ---: | ---: |
| Contactos | 288 | 1.110 | 8 | 1.406 |
| Cuentas | 285 | 88 | 7 | 380 |
| Combinado | 573 | **1.198** | **15** | 1.786 |

Válido = formato de 11 dígitos y checksum del profiler anterior; no acredita identidad registral. Los **1.198 ausentes siguen en scope** con `NEEDS_IDENTITY_COMPLETION`. Los 15 inválidos también se conservan con `NEEDS_IDENTITY_COMPLETION`: **1.213 filas sin fiscal válido**, sin promoverlas a identidad validada (D-0031). Hay **7 grupos fiscales duplicados / 14 filas**, incluidos 5 grupos entre módulos: revisión humana, nunca merge automático. La duplicación es una dimensión superpuesta, no otro grupo a sumar a válido/ausente/inválido. La clasificación Contacto/persona y Cuenta/organización conserva las excepciones semánticas ya detectadas.

Tomador en Policy: 1.291 solo Contacto, 338 solo Cuenta, 331 ambos y **5 ninguno**. Conservar ambos vínculos y revisar los cinco incompletos; no crear tomador ficticio.

Excepciones de fecha en las Policies incluidas: **239 VIGENTE** cuyo intervalo no contiene el corte (incluye intervalos no comparables), **9 intervalos invertidos** y **20** con fecha ausente/no parseable. Pueden solaparse. Endosos incluidos: 19 con fechas ausentes/no parseables, 6 invertidos y 32 fuera del intervalo de su Policy entre 1.889 comparables. No sobrescribir historia ni excluir silenciosamente. Los **58 Endosos del universo sin padre** quedan preservados como pendientes de determinar scope; no calificarlos de históricos por falta de vínculo.

Tareas: conservar estado literal; no definir “abierta” para incluir. Hay 38 vínculos a Policies fuera de scope y 11 a Casos no incluidos: el importador futuro debe conservar referencias fuente y exponer falta de FK. Hay 307 Tasks sin `Relacionado con.id`.

Renovaciones: el análisis previo global detecta 153 componentes con ciclos y 110 nodos con múltiples sucesores; no extrapolar esos totales al scope final. Conservar referencias y someter cadenas ambiguas a revisión. Reconstruir historia cuando la evidencia lo permita según D-0006, sin resolver por similitud ni colapsar períodos por número compartido.

## 5. Claims sin Policy migrada

Los **1.061 Claims** siguen incluidos: **154** tienen candidato de Policy dentro del scope, **715** apuntan a Policy histórica fuera del scope y **192** no resuelven. Estos últimos comprenden 143 números sin coincidencia, 27 vacíos, 19 conflictos de compañía y 3 ambigüedades dentro de la misma compañía.

En los **907** sin candidato de Policy migrada, permitir ausencia de FK interna y conservar referencia fuente/número y motivo de no resolución. No inventar los 27 números ausentes ni incorporar las Policies históricas solo para satisfacer una FK. Los 154 candidatos internos también requieren respetar el período contractual; el matching no equivale a confirmación humana. La ausencia de FK histórica por sí sola no bloquea incluir Claim.

## 6. Curación humana aprobada de catálogos — D-0031

La observación original recuperó un label único consistente para cada uno de los **15 Productos** y **13 Proveedores** huérfanos en scope: 0 BLANK, 0 CONFLICT; 836 y 902 ocurrencias en scope, respectivamente. La disposición ya no está pendiente: el usuario aprobó explícitamente cada caso. La aprobación humana, no la igualdad de texto, fundamenta los cuatro SAME_ENTITY.

| Catálogo | NEW_ENTITY | SAME_ENTITY | ALIAS_OF | REVIEW |
| --- | ---: | ---: | ---: | ---: |
| Productos | **14** | **1** | **0** | **0** |
| Proveedores | **10** | **3** | **0** | **0** |

| Códigos del lote | Disposición humana |
| --- | --- |
| PROD-H01–H12, PROD-H14, PROD-H15 | NEW_ENTITY |
| PROD-H13 | SAME_ENTITY con el Producto ART existente |
| PROV-H01, H02, H04, H09, H10, H11, H13, H14, H15, H16 | NEW_ENTITY / ASEGURADORA |
| PROV-H03, H06, H12 | SAME_ENTITY con sus respectivos destinos existentes / ASEGURADORA |

Labels y source IDs completos: `REVIEWS/T-0004-catalog-reconciliation.md`, artefacto local no versionado e ignorado por Git. Tabla de importación aprobada: `data/zoho-export-2026-09-16/profile/catalog-curation-approved-20260919.local.json`. Conserva por cada caso código, source ID Zoho, display original, label aprobado, disposición y source ID destino para SAME_ENTITY. NEW_ENTITY usa una referencia documental de destino pendiente, no un ID inventado ni una entidad creada.

La tabla tiene **28 correspondencias exactas**, preserva todos los source IDs y no hace fuzzy matching. Un mapping de importación no implica disposición ALIAS_OF: el resultado humano sigue siendo 0 ALIAS_OF. Se conservan los labels originales aunque la grafía aprobada difiera.

No se crean jerarquías ni se fusionan productos por similitud. Las separaciones entre proveedores ART/retiro/vida y otras entidades del mismo grupo están registradas explícitamente en el artefacto local; no se ejecuta ningún merge. Los **37 Proveedores existentes** conservan su clasificación derivada o pendiente: 23 con evidencia estructural de Compañía y 14 con tipo vacío. Esta curación se limita a los 13 huérfanos en scope; no afirma que los 37 hayan sido reclasificados por el usuario.

Los conteos físicos del export permanecen: en Policy, Producto 1.372 resueltos / 591 huérfanos / 2 vacíos y Compañía 1.770 / 193 / 2; en Claim, Producto 940 / 103 / 18 y Compañía 997 / 56 / 8. **Los huérfanos en scope tienen ahora tratamiento aprobado, no FK materializada.** Los 3 IDs de Proveedores exclusivamente históricos, en 10 Policies excluidas, siguen fuera del alcance de esta curación.

D-0021 continúa vigente: el importador futuro debe consumir catálogo/mapeos aprobados, nunca crear aseguradoras desde strings desconocidos. La curación en scope y los pendientes fuera de ella están explícitos y satisfacen el criterio de discovery, sin exigir implementar el catálogo destino.

## 7. Drive: estrategia y resultado real

Plan, estratos, protocolo y observaciones: [T-0004-drive-validation.md](T-0004-drive-validation.md). Universo elegible: 260 Contactos y 76 Cuentas con URL. Se tomaron 12 por módulo, incluyendo los 4 con Folder ID y estratos con/sin referencia directa de Policy incluida. La selección está congelada; no se reemplazaron fallos por casos cómodos.

| Módulo | Muestra | URL accesible | Carpeta confirmada | Requiere conciliación | No accesible |
| --- | ---: | ---: | ---: | ---: | ---: |
| Contactos | 12 | 5 (41,67%) | 5 | 5 | 7 (58,33%) |
| Cuentas | 12 | 4 (33,33%) | 4 | 4 | 8 (66,67%) |

Las 9 accesibles son carpetas; se observaron 42 hijos directos, todos subcarpetas, sin leer documentos. Hay 3 coincidencias normalizadas de nombre esperado, 1 coincidencia de todos sus tokens y 5 que requieren comparación humana. Ninguna queda declarada CONFORME porque falta convención aprobada de naming/estructura y validación de entidad. **Tasa de conformidad: pendiente. Tasa de vinculación automática de Policy: no medida.** Cero confirmadas no significa 0% de conformidad demostrado.

Las 15 URLs no accesibles devolvieron 404 con esta identidad; no se sabe si faltan permisos o el destino no existe. Los 4 casos con Folder ID están entre esos 15; en 3 coinciden los IDs, en 1 difieren y el valor alternativo fue rechazado como INVALID_ARGUMENT. No se corrigió el dato ni se solicitaron permisos externos.

Los 1.450 registros del closure sin URL/Folder ID no se excluyen. Quedan fuera de esta muestra y no se infiere conformidad ni ausencia de documentos. La presencia local y la legibilidad de una carpeta no demuestran vinculación de una póliza a sus documentos. La tarea actual pidió validar únicamente carpeta/entidad/naming/estructura: se respetó ese límite.

## 8. Estrategia documental aprobada — D-0032

La aprobación humana reemplaza la propuesta anterior de automatización general por **conciliación asistida**. Se conservan las referencias existentes, aun cuando el acceso de discovery haya devuelto 404; la muestra no prueba inexistencia. Cuando haya evidencia suficiente se podrán vincular mediante revisión asistida, conservando estado pendiente si esa evidencia no alcanza. La aplicación futura debe hacer visibles esas excepciones.

El exit criterion es ahora **estrategia de migración documental definida, limitaciones observadas mediante muestra y tratamiento explícito de conciliación asistida**. Se cumple con la aprobación del usuario y la muestra existente de 24 entidades, 9 carpetas accesibles y 15 no accesibles bajo la identidad utilizada. No se requieren nuevas consultas, acceso a todas las carpetas, naming canónico ni porcentaje de vínculo automático Policy-documento para cerrar T-0004.

Broker OS podrá incorporar la creación de estructura canónica para Contactos/Cuentas sin carpeta histórica validada en trabajo posterior. No se habilitan esas escrituras ahora. Automatización, normalización, permisos, creación de carpetas, navegación por LLM, navegación/creación/guardado desde `/ingresar` y vínculo automático Policy-documento se difieren a una tarea específica. Los umbrales de 95% propuestos en el informe anterior no fueron aprobados como criterio de cierre y se retiran de este contrato; el trabajo futuro definirá sus propias métricas.

## 9. Riesgos residuales y trabajo diferido

Los riesgos observados permanecen: completitud de export no certificada, catálogos de fechas distintas sin snapshot común, semántica técnica de lookups/Created_Time y zona horaria por verificar, fechas y cadenas ambiguas, identidades incompletas y referencias documentales no conciliadas. Se documentan como insumos para implementar y operar con seguridad, **no como blockers de discovery**. Cerrar T-0004 no afirma que los datos estén saneados ni autoriza migración.

| Follow-up diferido | Insumo / ubicación futura |
| --- | --- |
| Automatización de Google Drive, permisos operativos y acceso a todas las carpetas | Muestra y excepciones de este informe; tarea específica posterior, sin ampliar permisos ahora |
| Estructura canónica de Drive y normalización | D-0032; alinear autoridad y diseño antes de crear carpetas |
| Navegación/creación/guardado desde `/ingresar` y navegación por LLM | Trabajo de producto posterior; no implementado |
| Vinculación automática Policy-documento | Definir evidencia, permisos, métricas y verificación propias en tarea posterior |
| Importador, staging y exception queue | T-0013 existente y posterior refinamiento; mapeos aprobados y trazabilidad fuente |
| Resolución operativa de identidades fiscales incompletas | 1.213 filas marcadas para completado; duplicados siempre con revisión humana |
| Architecture Alignment Review / T-0015 | Inputs y conflictos enumerados abajo; no existe todavía archivo de T-0015 y no se crea aquí |

No se generan automáticamente tareas por cada follow-up ni se activan tareas existentes. T-0011 puede usar el discovery cerrado para refinar VS01; el alineamiento de dominio debe preceder schema/importador.

**Inputs explícitos de Architecture Alignment Review / T-0015:**

- Fiscal obligatorio para entidades validadas y legado incompleto permitido; tensión con CUIT/CUIL opcionales de DOMAIN.md §10–11. Revisar lifecycle e invariantes sin descartar legado.
- Renovación genera nueva Policy/número según discovery; DOMAIN.md §27 admite conservar número. D-0006 ya distingue períodos, pero no resuelve esta diferencia de numeración. Conservarla como conflicto a alinear, sin reescribir historia ni alterar DOMAIN.md en este cierre.
- Claim puede carecer de FK interna a Policy migrada; preservar número/source reference y motivos de no resolución. Diseñar su representación futura.
- Cuenta prevalece como holder si hay Cuenta + Contacto; Contacto queda asociado. Alinear relación canónica y excepciones.
- Separación **InsuranceProduct vs EnterpriseRisk** como input del review, sin crear jerarquías ni resolver D-0026/D-0029 por el camino.
- Posible creación de carpetas por Broker OS frente a D-0009 (no plano de control), D-0019 y T-0014 (solo lectura). **No se supersede D-0009 en este cierre**: la recomendación es resolver esa tensión explícitamente en T-0015 y en el contrato de la tarea futura antes de cualquier escritura; Drive mantiene autoridad sobre contenido y ACLs.

Los cinco tomadores ausentes, fechas inválidas y duplicados fiscales requieren tratamiento operativo antes de promover entidades validadas. La curación documental de catálogos no materializa sus destinos. Estos límites no impiden conservar los insumos ni cerrar discovery.

## 10. Exit criteria finales y cierre

El cambio de criterio está aprobado por el usuario y registrado en D-0032 y en el contrato de T-0004; no se reinterpretó silenciosamente el criterio anterior. La conclusión previa KEEP ACTIVE queda como historia en el informe local pre-cierre.

| Exit criterion final de T-0004 | Evidencia / cumplimiento |
| --- | --- |
| Informe agregado con universo, fechas, denominadores y método reproducible | Cumplido; fuentes, hashes y muestra declarados |
| Origen de Policy, scope y campos necesarios | Cumplido; 1.965 Policies, reglas finales y clasificación previa preservadas |
| Separar hechos, significado confirmado y dudas pendientes | Cumplido; tabla de autoridad; dudas técnicas registradas para implementación, no presentadas como resueltas |
| Entidades, cantidades, identidad fiscal y tratamiento de excepciones | Cumplido; 9.636 filas core, 1.585 notas y excepciones explícitas |
| Curación de catálogos en scope y trazabilidad de importación | Cumplido por aprobación humana: 14/1 Productos y 10/3 Proveedores, 0 ALIAS_OF/REVIEW; clasificación restante conservada |
| Estrategia documental, muestra y conciliación asistida | Cumplido por D-0032: 24 / 9 / 15; 404 no prueba inexistencia |
| Clases de fallo y límites observados | Cumplido; falta de acceso, inconsistencia de IDs, dudas de pertenencia/naming sin inventar validaciones |
| Trabajo diferido explícito | Cumplido; Drive, implementación MIG y Architecture Alignment Review / T-0015 enumerados |
| Checks, privacidad e integridad | Verificación final ejecutada y resumida al pie |

**Recomendación final: CLOSE. T-0004 queda DONE con fecha 2026-09-19.** Se cierra discovery bajo sus exit criteria actualizados; permanecen las limitaciones documentadas y el trabajo posterior. No se certifica automatización ni readiness de migración. No hay commit, migración, implementación ni nueva consulta a Drive.

## Verificación reproducible y privacidad

```bash
pnpm check
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/tests -p 'test_*zoho*.py'
git check-ignore data/zoho-export-2026-09-16/original-zips/
git check-ignore REVIEWS/T-0004-catalog-reconciliation.md
test -z "$(git ls-files -- data/)"
git diff --check
```

La reconciliación dirigida y selección se generan mediante `data/zoho-export-2026-09-16/profile/reconcile-catalogs-drive-20260919.py`: consume el manifiesto verificado y los hechos guardados, sin llamar al analizador general. Conserva outputs existentes y falla antes de sobrescribirlos; una reproducción se realiza en una copia local aislada con los mismos insumos. La observación externa de Drive tiene fecha propia y no se reproduce idénticamente si cambian datos/permisos.

Los nombres de productos/proveedores solicitados quedan solo en el artefacto local de catálogos, protegido por una regla específica en `.gitignore`. Muestra, nombres de clientes esperados/observados y URLs de Drive permanecen en `data/`, ya ignorado. No se incorporaron a este informe ni a logs/prompts. Los scripts solo imprimieron conteos, códigos de muestra y estados técnicos; no se publicaron ni enviaron los artefactos.

Resultado del cierre: `pnpm check` OK (documentos y AgentRun); **10 tests existentes OK**; `git diff --check` OK. Se verificaron disposiciones 14/1 y 10/3, 28 mappings con source IDs preservados y 4 destinos existentes, igualdad de los 37 proveedores anteriores, integridad de ZIP/CSV y muestra Drive sin cambios, privacidad de artefactos versionables e ignorados. DOMAIN.md y las decisiones OPEN sin cambios. Diff revisado; sin commit ni publicación.

Huellas SHA-256 de evidencia local:

| Archivo | SHA-256 |
| --- | --- |
| `catalog-curation-approved-20260919.local.json` | `d2ef313005f202f88b77b025bc2e1b523821ab9cc5032497da4e10a931706489` |
| `catalog-reconciliation-20260919.local.json` | `476b5225be2002a23895f20e856d8d5de16e6a2b4d3a7c4a865bd090654fafce` |
| `drive-validation-sample-20260919.local.json` | `a06507fb4a57a9d856433e185f039b44e62fb5caa1c54277ad282be4e95ed529` |
| `drive-validation-observed-20260919.local.json` | `573c75a62e1d38ba1ce99d575019d9d2abbd659a1f136c68aa18a4263d7b17da` |
| `reconcile-catalogs-drive-20260919.py` | `8594aa197b8a2a3136726b3406ff233ef633e85f14c456391e1d0013e5dfaec4` |
