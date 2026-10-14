# Anexo · filas propuestas para el changelog · Fase 14

> 2026-10-14 · Cierre de EMI-41. **Propuesto, no aprobado** (punto 6 del "Para aprobar" de `dossier-cierre-emi41.md`).
> Releído hoy: el último id de `v0/changelog-metodologia.md` es **CH-110**. Los ids son provisorios desde CH-111.
> **El changelog está en la tabla de `v1/congelamiento.md`** y no se puede editar mientras la v1 candidate esté congelada (reglas 1 y 2). Si Emiliano aprueba estas filas, quedan acá con su aprobación y pasan al changelog cuando se abra la versión siguiente, con los ids libres en ese momento. Ninguna cambia una regla.

| id | fecha | versión | elemento | antes | después | motivo | fuente |
|---|---|---|---|---|---|---|---|
| CH-111 (prov.) | — | v1 candidate (sin cambio de regla) | Dataset de EMI-41 · identificador de evaluación | Se trataba `evaluacion_id` como identificador de una ficha de evaluación | Limitación registrada: en la Fase 8, `EV-0001` a `EV-0027` existen en agro y alimentos y en servicios a personas; la clave de una evaluación de EMI-41 es (`evaluacion_id`, `risk_id`). No se renombra ninguna ficha | Inventario del cierre de EMI-41; para EMI-17 sería un error referencial que rechaza la importación | `fase-14/inventario.md` §3; `fase-14/dataset/manifiesto.md` |
| CH-112 (prov.) | — | v1 candidate (sin cambio de regla) | Dataset de EMI-41 · cobertura efectiva | Cobertura de la Fase 6: 35 contrastes con al menos una empresa | Limitación registrada: 30 contrastes tensionaron la metodología; C04, C26, C28 y C30 se cubrieron sin hallazgo propio; C34 tiene cobertura insuficiente; S01, S25 y S30 no aportaron nada que otra empresa no aportara. Se conservan todas | Cierre de EMI-41 (plan, Fase 14) | `fase-14/cobertura-efectiva.csv`; `fase-14/criterios-cierre-emi41.csv` P2 y P8 |
