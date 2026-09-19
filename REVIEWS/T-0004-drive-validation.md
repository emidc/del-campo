# T-0004 — Validación estratificada de Drive

Workstream: MIG. Observación: 19/09/2026 UTC. **Cierre formal: estrategia aprobada en D-0032; se conserva la muestra sin nuevas consultas.** Plan y resultado de lectura, sin modificaciones de Drive. No se descargaron contenidos documentales ni se crearon carpetas. El acceso se realizó con el conector Google Drive de esta sesión; sus permisos no representan los de todos los usuarios del broker.

## Universo y selección

Se usa el closure aprobado, sin repetir profiling general. Universo con URL: 260 Contactos y 76 Cuentas; excluye del muestreo los 1.146 Contactos y 304 Cuentas sin URL. No se infiere que estos últimos carezcan de documentos.

Muestra exploratoria reproducible de 24 entidades: 12 Contactos y 12 Cuentas. Los módulos se usan como estratos operativos de particular/empresa; la clasificación jurídica individual sigue sujeta a las excepciones ya identificadas. Se incluyen obligatoriamente los cuatro registros con URL y Folder ID. Para los demás se ordena SHA-256 de `T-0004-drive-v1|módulo|source_id` y se toman los primeros cinco por estrato. No se selecciona por nombre, disponibilidad o resultado de acceso; no se reemplazan los fallidos.

| Módulo | Estrato | Universo | Muestra | URL accesible / muestra |
| --- | --- | ---: | ---: | ---: |
| Contactos | URL + Folder ID | 2 | 2 | 0 / 2 |
| Contactos | Solo URL, referido por Policy en scope | 242 | 5 | 5 / 5 |
| Contactos | Solo URL, sin referencia directa de Policy en scope | 16 | 5 | 0 / 5 |
| Cuentas | URL + Folder ID | 2 | 2 | 0 / 2 |
| Cuentas | Solo URL, referido por Policy en scope | 66 | 5 | 3 / 5 |
| Cuentas | Solo URL, sin referencia directa de Policy en scope | 8 | 5 | 1 / 5 |

Se sobremuestrean casos minoritarios para encontrar fallos. Los porcentajes siguientes describen exclusivamente la muestra; no estiman el universo ni la tasa de vinculación de pólizas. Una estimación posterior debe ponderar estratos por sus universos y declarar incertidumbre; no combinar 12/12 como si fuera una muestra proporcional.

## Protocolo de solo lectura

1. Abrir la URL fuente con la identidad autorizada. En esta ejecución se extrajo su ID literal y se usó `files.get` mediante el conector. Una llamada inicial con URL fue rechazada por el adaptador; se reintentó con el ID, sin cambiar el destino. Acceso aquí significa metadatos accesibles por API, no prueba de navegación en todos los browsers.
2. Verificar `mimeType == application/vnd.google-apps.folder`. Si es archivo, shortcut o destino desconocido, REQUIERE_CONCILIACION; no seguir destinos arbitrarios.
3. Comparar el nombre de carpeta con la entidad esperada del CSV local. Registrar evidencia de coincidencia y dudas. Nombre coincidente es señal, no prueba suficiente de titularidad. No asignar ni fusionar entidades.
4. Registrar naming observado y contrastarlo con la convención aprobada por el usuario. Esa convención no está documentada en las fuentes disponibles: queda PENDIENTE. No convertir el patrón mayoritario en norma.
5. Listar hasta 100 hijos directos, registrar tipos, cantidades y estructura observable. No abrir documentos ni inferir estructura recursiva o completitud por un listado acotado.
6. Clasificar: CONFORME solo si acceso, tipo, entidad esperada, naming y estructura cumplen la convención acordada; REQUIERE_CONCILIACION si es accesible pero existe discrepancia o evidencia pendiente; NO_ACCESIBLE si la identidad de esta sesión no obtiene metadatos. Un 404 no prueba borrado ni permite diagnosticar su causa.
7. En los cuatro casos obligatorios comparar Folder ID y URL. Si difieren, conservar ambos y revisar por separado; nunca reemplazar uno por el otro automáticamente.

## Resultado observado

| Estrato principal | Muestra | Accesibles | Son carpeta | REQUIERE_CONCILIACION | NO_ACCESIBLE | CONFORME confirmado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Contactos | 12 | 5 (41,67%) | 5 | 5 | 7 (58,33%) | 0 |
| Cuentas | 12 | 4 (33,33%) | 4 | 4 | 8 (66,67%) | 0 |
| Total exploratorio | 24 | 9 | 9 | 9 | 15 | 0 |

**Conformidad: pendiente, no 0% demostrado. Vinculación automática de Policy a documentos: no medida.** Las 9 carpetas accesibles quedan REQUIERE_CONCILIACION porque falta la regla de naming/estructura y la confirmación de entidad. Las 15 restantes devolvieron NOT_FOUND/404; no se solicitó compartir ni ampliar permisos.

En las accesibles, 3 nombres coinciden con una variante del nombre fuente tras normalizar mayúsculas, tildes, espacios y puntuación (1 Contacto, 2 Cuentas); en otro Contacto están todos los tokens del nombre, con texto adicional. En 5 casos esa comparación no alcanza: requieren lectura humana del nombre observado frente al CSV. No se hizo fuzzy matching ni se asumió entidad incorrecta por ausencia de coincidencia exacta. Ocho nombres están en mayúsculas y uno usa otra capitalización; esto es observación, no convención aprobada.

Los listados muestran exclusivamente subcarpetas directas: Contactos, 4/5/3/6/8 hijos; Cuentas, 7/5/2/2 hijos. **42 hijos observados, todos carpetas**, sin acceder a su contenido. No hay un hijo denominado únicamente como año de cuatro dígitos. Los nombres y el detalle por fila quedan en el artefacto local, sin nombres de clientes en este reporte.

Los cuatro registros con Folder ID devolvieron 404 al consultar el ID de la URL. Tres IDs coinciden entre ambos campos. En una Cuenta difieren; la consulta del valor Folder ID alternativo devolvió INVALID_ARGUMENT. No se concluye que los dos destinos sean equivalentes o que uno sea correcto.

## Evidencia local y siguiente paso concreto

- Muestra seleccionada y campos para revisión: `data/zoho-export-2026-09-16/profile/drive-validation-sample-20260919.local.json`.
- Metadatos relevantes, nombres esperados/observados y estructura por fila: `data/zoho-export-2026-09-16/profile/drive-validation-observed-20260919.local.json`.
- Hoja legible de revisión: `data/zoho-export-2026-09-16/profile/drive-validation-worksheet-20260919.local.md`.
- Selección reproducible: `data/zoho-export-2026-09-16/profile/reconcile-catalogs-drive-20260919.py`; no requiere nuevas consultas a Drive para auditar la muestra guardada.

Estos archivos están ignorados por Git y no deben copiarse a prompts/logs ni adjuntarse al informe agregado. Las observaciones de Drive son temporales: una nueva revisión debe tener fecha e identidad autorizada y conservar la anterior.

Trabajo diferido, no blocker de T-0004: confirmar convención de naming/estructura, revisar las 9 carpetas accesibles contra sus entidades y los 15 fallos con una identidad autorizada, incluido el Folder ID discrepante. Si continúa sin acceso, mantener NO_ACCESIBLE. Conservar las referencias; no invalidarlas por un 404. No ampliar permisos ni modificar archivos para este cierre.

El usuario aprobó modificar el exit criterion de T-0004 según D-0032: estrategia de migración documental definida, limitaciones observadas mediante muestra y tratamiento explícito de conciliación asistida. Esta evidencia lo satisface; no se exige porcentaje de vínculo automático Policy-documento. La automatización completa, permisos, normalización, estructura canónica, creación de carpetas, navegación por LLM y navegación/creación/guardado desde `/ingresar` quedan para tarea posterior específica. La posibilidad futura de crear estructura canónica no implica escrituras ahora ni una carpeta histórica inválida por el solo hecho de devolver 404. La interpretación del resultado observado se mantiene sin cambios.
