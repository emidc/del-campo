# Notas de corrida · agente-8b-servicios-a-personas

- Corrida: `F8-AG-01` · fase 8 · familia Servicios a personas (S14, S26, S35, S36).
- Inicio: 2026-10-07T02:11:11Z.
- SHA-256 al empezar:
  - `v0/metodologia-v0.md`: `51de7a1fad089ab6f61c22ce948339d4fef76b83df28a75b6760483795575904`
  - `v0/protocolo.md`: `1067d355d7690f4a35c3de45361456a9923f284f2d6f65fdb049320897ba0c84`
- Cierre: 2026-10-07T06:57:27Z.
- SHA-256 al cerrar (sin cambios): 51de7a1fad089ab6f61c22ce948339d4fef76b83df28a75b6760483795575904 1067d355d7690f4a35c3de45361456a9923f284f2d6f65fdb049320897ba0c84 

## Qué se evaluó

- 27 fichas (S14: 7, S26: 7, S35: 6, S36: 7), todas `tipo_objeto = riesgo`, `actor = ai`, `review_status = pending`, `banda` vacía. La lista no trae padres, sub-riesgos ni escenarios; no creé escenarios por causa común (lista fija; ver las A7).
- 0 no evaluables. Un factor `unknown` (S36-R07, I-personas), evaluable por §9.3.
- 31 anomalías: A6 ×8, A11 ×5, A2 ×4, A8 ×4, A5 ×3, A3 ×2, A7 ×2, A10 ×1, A12 ×1, A4 ×1.
- `evaluacion_id` numerados EV-0001 a EV-0027 dentro de este archivo; si se juntan con otras familias pueden repetirse y hay que renumerarlos.
- Orden D10 fijado al terminar cada empresa en `ranking.md`; no se ajustó después.

## Qué impidió o condicionó la evaluación

- Nada impidió evaluar. Dos empresas (S26, S36) tienen RO negativo en los tres ejercicios: usé la opción 3 de §4.2 (S26: EBITDA 2025; S36: fondo de reserva) y lo registré como A6. Es la elección con más efecto potencial sobre I-económico de esas dos empresas.
- Sólo leí las fuentes permitidas: metodología, protocolo, plantillas, la lista de la familia y las carpetas `fichas/S14`, `S26`, `S35`, `S36`.
