# Especificación funcional y handoff al desarrollo del sistema real

Base: prototipo Broker OS v25 congelado el 02/11/2026 (referencia `broker-os-prototipo-v25-final`). Es la north star de experiencia y reglas, no un diseño técnico ni código para reutilizar: el código del prototipo es un único HTML con estado en el navegador.

## 1. Cómo usar el prototipo durante el desarrollo

- **No se modifica.** Cualquier cambio de producto va a una rama o documento nuevo; la referencia congelada sirve para comparar.
- Abrir `prototipo/index.html` (o el artifact publicado) y usar Demo › Recorrido integral.
- Las pruebas (`pruebas/*.js`, Playwright) describen el comportamiento esperado con aserciones legibles; sirven como criterios de aceptación de alto nivel.

## 2. Alcance funcional a construir (por contexto)

### Broker OS (VS01 extendido)
1. Clientes: personas, empresas, prospectos, membresías vigentes, notas internas, historial.
2. Pólizas: datos, documento en tres estados, versiones y endosos, objetos asegurados, riesgos que la citan, **comparación contra lo pedido**.
3. Gestiones: siniestros por etapas, cotizaciones, renovaciones, facturación, gestiones manuales, **reclamos a la compañía** originados en una comparación.
4. Inicio por rol: tareas, a atender, gestiones en curso, evaluaciones por aceptar, indicadores con definición y acción, sin ranking entre personas.
5. Importación: relevamientos, lotes con vista previa y escritura atómica, borradores recibidos por MCP.
6. Portal de empresas: resumen, riesgos, solicitudes, evidencias, preguntas del relevamiento, informe anual compartido.
7. Auditoría: cada acción con actor, origen, entrada, salida y efecto.

### Risk OS
1. Metodología P × I × V por tipo de daño, bandas y banderas; valores `≥n` cuando falta información; riesgos sin evaluar al final.
2. Evaluaciones append-only con autor y revisor distinto; reordenamiento profesional con causa y fundamento.
3. Relevamiento en seis pasos con candidatos, inspección, cuestionario, evaluación y registro.
4. Plan de acción, transferencia en cuatro estados, **brechas de cobertura** con revisión humana.
5. **Informe anual** con datos propios y texto externo, aprobación y congelamiento.

### Communication OS (CO01)
Sin cambios en esta iteración: atención vigente, guardia, «Sin asignar», delegación, ventana de 24 h, sin datos bancarios.

## 3. Reglas de negocio que no se negocian

| Regla | Dónde se comprueba en el prototipo |
|---|---|
| La IA no decide: no acepta, confirma, verifica, aprueba, comparte ni valida | `cierre-v25.js` (V25-6, V25-8, V25-9, V25-11) |
| Quien importa no acepta; quien registra el borrador del informe no lo aprueba | V25-6.propia, V25-11.propio |
| Lo informado por la empresa no cambia evaluaciones hasta validarse | V25-4.resp, V25-4.valida |
| Cobertura ausente ≠ brecha confirmada; riesgo retenido con constancia | V25-8.* |
| Transferencia verificada solo con todas las diferencias cerradas | V25-9.ia, V25-9.abierta, V25-9.verifica |
| Sin puntajes ni índices frente a la empresa; el puntaje del panel es solo del equipo | V25-X.panel, V25-X.panel-equipo, V12-portal-sin-puntaje, V25-11.borrador, R1.adv-x01 |
| Aislamiento entre empresas en el portal y para el revisor externo | `aislamiento.js`, V25-4.aisl, V25-12.aisl |
| Sin datos bancarios en registros, eventos, MCP ni CSV | `bancarios.js` |
| Escritura atómica de lotes y conflictos con avances posteriores | `r-imp.js`, `importar-v19.js` |

## 4. Orden sugerido de construcción

1. Identidad, permisos por rol y auditoría en el servidor (bloqueante para todo lo demás).
2. Aceptación de Risk OS (T-0032) con evaluaciones append-only y revisor distinto.
3. Importador CSV de evaluaciones (contrato A1) con vista previa, conflictos y atomicidad.
4. Relevamiento en seis pasos y cuestionario (sin portal: el equipo carga las respuestas en nombre de la empresa).
5. Brechas y comparación de pólizas (importadores A2 y A3).
6. Informe anual (A4) con PDF; portal después de D-0022.
7. Servidor MCP con herramientas de lectura; luego las de borrador.

## 5. Decisiones pendientes del owner (siguen abiertas)

AD-11 (reimportación con IDs reusados), AD-12 (umbrales de alertas), AD-13, AD-14, AD-15, AD-16 (quién reordena y quién acepta), AD-17 (sin sub-riesgos), R-19 (autorización formal de envío a LLM externos), D-0022 (cuentas de portal). El puntaje del panel quedó solo para el equipo (Emiliano, 02/11); falta confirmarlo con la metodología de Risk OS.

## 6. Validaciones humanas

La aprobación automática (pruebas y árbitro) no reemplaza las validaciones humanas. Estado al 02/11/2026: la validación con Manuel y la sesión con el equipo de Del Campo (`fase-5/kit-sesion-validacion.html`) se hicieron y se aceptaron; los ajustes de la v25 salen de ellas (informado por Emiliano). Emiliano aceptó esta versión concreta, publicada en el artifact del prototipo, el 02/11/2026.
