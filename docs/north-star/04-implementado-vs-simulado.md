# Qué está implementado y qué está simulado · prototipo v25

«Funciona en el prototipo» quiere decir que la lógica corre de verdad en el navegador, con datos ficticios y guardado local. Nada sale a servicios externos. Los rótulos en pantalla son: En producción, Implementado (sin aceptar), Simulado, Futuro.

| Capacidad | Estado en el prototipo | Estado real fuera del prototipo |
|---|---|---|
| Ficha de persona, empresa y póliza | Funciona (datos ficticios) | En producción (VS01) |
| WhatsApp y correo, atención, delegación | Simulado (panel «Simulaciones») | CO01 en producción con aceptación acotada |
| Risk OS: evaluación P × I × V, bandas, banderas, append-only, reevaluación con revisor | Funciona en el prototipo | Implementado, sin aceptar (T-0032) |
| Relevamiento en seis pasos | Funciona: estados, cuestionario, validación, registro | No existe: a construir |
| Pasos 1 y 3 (LLM externo) | Simulado: resultados precargados | Ocurren en ChatGPT, Claude o Gemini |
| Cuestionario respondido por la empresa en el portal | Funciona en el prototipo | Futuro (portal fuera de Q4, D-0022) |
| Puente A · CSV de riesgos | **Funciona**: lectura del archivo, vista previa, reglas RV-*, conflictos, escritura atómica, evaluaciones pendientes | Importador de Risk OS sin aceptar |
| Puente A · CSV de brechas, comparación e informe | Contrato definido; **sin importador** | Futuro |
| Puente B · MCP + skills | **Demostración**: borradores de Cerro Liso precargados; `buscar_persona` simulado | Futuro (preferido) |
| Brechas de cobertura | Funciona la revisión (confirmar, descartar, pedir información, riesgo aceptado) | Futuro |
| Verificación de póliza | Funciona la decisión por diferencia, la gestión de reclamo y el bloqueo de «verificada» | Futuro (lectura de PDF en LLM externo) |
| Informe anual | Funciona: datos en vivo, revisión del texto, aprobación por otra persona, congelamiento, portal | Futuro (PDF y portal) |
| Portal de empresas | Simulado con selector de perfil; aislamiento en la interfaz | Futuro (cuentas por contacto, aislamiento en el servidor) |
| Prospectos, altas, gestiones manuales, equipo, configuración | Funcionan en el prototipo | A construir |
| Agentes de renovaciones y facturación | Simulado / Futuro | Futuro |
| Google Drive | Enlaces de demostración | Futuro |
| Permisos | Selector de perfiles; comprobación solo en la interfaz | Identidad y autorización en el servidor |
| Registro de eventos | En el navegador | Auditoría por contexto en el servidor |
| Puntaje del panel | Solo para el equipo; el portal ve conteos por banda | Confirmar con la metodología de Risk OS |
| Persistencia | `localStorage` (clave `brokeros-demo-v5`) | Bases de cada contexto |

## Datos de la demostración

Todo es ficticio: empresas, personas, pólizas, fuentes de probabilidad, incisos, fotos («FICTICIO») e historia trimestral de bandas. Los retratos del equipo son reales y su uso en el link público fue aprobado por Emiliano el 31/10.
