# RO01 · Dossier de la Fase 0

> 2026-10-14 · Plan de Risk OS v1, Fase 0. Base: `main` en `a8ccd07` (PR #78 de T-0027
> mergeada). Acompaña a `SLICES/RO01.md` y termina en "Para decidir". No escribe código,
> no cambia la metodología ni los contratos de T-0021 y no lee casos históricos (R-19).

## Resumen

1. RO01 es el contrato de Risk OS v1, con la forma de CO01: superficie por issue, reglas de presentación comprobables, límites con Broker por D-0067, datos, 13 criterios de aceptación y su protocolo, despliegue y non-scope.
2. El punto de partida da como dice el spike: `pnpm check` verde, 0 rechazos y 103 avisos en las sintéticas, 55 inválidos con su error y el arnés en 211 pass.
3. Las tareas T-0028 a T-0032 están en `DRAFT`. Las dos últimas dependen de tus respuestas y están escritas con la opción recomendada.
4. D-0068 (dónde viven los datos reales) queda como borrador con cuatro opciones y sin elegir.
5. El cierre de T-0021 está preparado en dos commits separados (evidencia y `status: DONE`), igual que el cambio de `PROJECT.md` §3. No se aplican sin tu sí.
6. Hay un hallazgo que conviene mirar antes de preparar las históricas: según tu lista de estructura, sus acciones no traen factor, mecanismo, estado ni evidencia, y el contrato rechaza acciones sin eso (H1).
7. EMI-25 pide comentarios e "introducir nueva información", y el modelo de la 15a no tiene dónde guardarlos. Propongo un registro de novedades (H2).
8. Recomiendo que entren en v1 las cuatro vistas que pide la metodología y el reordenamiento profesional, en forma mínima.
9. Son 11 decisiones, abajo, en el orden que pediste.

## 1. Punto de partida

Corrido el 2026-10-14 sobre `main` en `a8ccd07`, con Node 24.22 y Postgres 16 local
(la sesión no tenía Postgres 17; CI usa 17 y es el que da el veredicto).

| Comando | Resultado | Lo que dice el spike |
| --- | --- | --- |
| `pnpm check` | verde: 67 decisiones, 30 ADRs, 27 tareas, 0 avisos; 174 tests de scripts y 425 de `pnpm test`, 0 fallas | — |
| `node v0/fase-15/sinteticos/generar.ts --check` | 84, 10 y 33 filas; 209 ids; 73 en `no-cupo.csv`; byte por byte | igual |
| `node v0/fase-15/invalidos/generar.ts --check` | 55 casos | igual |
| `node v0/fase-15/validador/validar.ts v0/fase-15/sinteticos --corte 2026-10-14` | 0 rechazos, 103 avisos (RV-ACC-11: 20, RV-ECO-02: 26, RV-EVA-08: 57) | 0 rechazos, 103 avisos |
| `node --test v0/fase-15/*/*.test.ts` | 100 tests, 100 pass | — |
| `cd regresion-ejecutable && node --run test` | 213 tests, 211 pass, 0 fail, 2 todo | 211 pass, 0 fail, 2 todo |

No hubo nada que reportar. EMI-18 ya está en `main`: D-0067, su ADR y T-0027 en `DONE`.

## 2. Hallazgos

Lo que RO01 necesita y las fuentes no tienen, o un roce entre fuentes. No cambié
ningún contrato ni la metodología: cada uno espera tu respuesta en el punto 9.

**H1 · Las acciones de las históricas no pasan el contrato tal como están.** En
`lista-casos-historicos.md` respondiste "No" en los cinco casos a C3 (factor
objetivo), C4 (mecanismo causal), C5 (cambio esperado), C6 (estado con fecha) y C7
(evidencia de ejecución). El contrato rechaza una acción sin factor (RV-ACC-03), sin
mecanismo (RV-ACC-04), sin estado válido (RV-ARCH-05) o cumplida sin evidencia
(RV-ACC-06). Además, C8 dice que hay efectos observados con valoración nueva, y el
contrato sólo admite eficacia en una acción cumplida (RV-ACC-09). Y B3 dice que hay
valoraciones paralelas de dos personas: la decisión 8a importa una sola cadena por
riesgo. Tu confirmación final no lo menciona porque la pregunta E1 era sobre perder
datos, no sobre completarlos. Opciones: a) al preparar los CSV escribís factor,
mecanismo, estado y evidencia de cada acción y elegís la cadena de cada riesgo
(recomendada: es juicio profesional y queda con procedencia); b) importás sin plan de
acción y las acciones se cargan después desde la UI, con las mismas reglas; c) cambiar
el contrato, que la 15a no permite reabrir.

**H2 · EMI-25 pide comentarios y "nueva información", y el modelo no tiene dónde
guardarlos.** El dossier 15a §4 no tiene comentarios, y §5 dice que la información
nueva y el cambio de contexto abren una revisión, pero no qué registro los lleva.
Propuesta: un registro de novedad sobre un riesgo, una acción o una cobertura, con
tipo (`comentario`, `informacion_nueva`, `cambio_contexto`), texto, referencias de
evidencia, autor y fecha. Los dos últimos tipos abren la revisión pendiente del riesgo;
el comentario no abre nada. El progreso de una acción son sus cambios de estado más sus
novedades. Es la entidad más chica que cubre EMI-25 sin columnas nuevas en los CSV.

**H3 · "Reimportación idempotente" frente a RV-ID-02.** El contrato rechaza un id que
"ya existe en Risk OS", así que importar dos veces el mismo lote daría 209 rechazos en
la segunda pasada. El efecto es el mismo (nada se escribe), pero el informe diría que
el lote es inválido cuando no lo es. Propuesta: el importador reconoce un lote idéntico
a uno ya importado (por la huella de los tres archivos) antes de validar, y responde
"ya importado" sin escribir. Cualquier otro lote con ids existentes sigue siendo
RV-ID-02. No cambia ninguna regla; es lo que escribe A3.

**H4 · No existe `DECISIONS/0062`.** D-0062 sólo está en `decisions.yaml`. El borrador
de D-0068 sigue la forma de esa entrada (alcance, quién carga, qué no se carga, riesgos
aceptados) y las secciones de los ADR recientes (0063, 0066, 0067).

**H5 · D-0067 pide que una proyección no se presente como registro canónico.** Para
cumplirlo, la vista de transferencia rotula los eventos de póliza como observación
local, con su procedencia (RO01 §3, regla 7). No es un conflicto; lo dejo escrito para
que T-0030 no lo olvide.

**H6 · `C_raw` "interno" o "visible".** La metodología §6.4 lo pone entre lo interno
(D12) y la sección "Uso de `C_raw`" dice que se muestra siempre con el vector. Leo las
dos juntas: puede aparecer en una salida, pero nunca solo. RO01 lo escribe así y deja
que la lista muestre la banda, el vector y las banderas, con `C_raw` en el detalle. Si
preferís que no aparezca nunca en pantalla, es una línea de RO01.

**H7 · Parser de CSV.** D-0055 acota `csv-parse` a `packages/db`. El validador de la
15b tiene su propio lector (`validador/csv.ts`), y sus errores de estructura (RV-ARCH-01,
con número de línea) son parte del contrato que prueban los 55 inválidos. T-0029 porta
ese lector al contexto. Usar `csv-parse` en `contexts/risk` pediría un ADR (R-05).

**H8 · "Diez ciclos" o "diez casos".** T-0021 dice "al menos diez ciclos" y el hito de
Linear dice "diez casos con ciclos posteriores". Con 8 sintéticas y 5 históricas hay 13
empresas, así que las dos lecturas son posibles y piden cosas distintas. Va al punto 7.

## 3. Cierre de T-0021 y `PROJECT.md`

- `ops/evidence/T-0021.md` tiene la salida literal de su `## Verification` (`pnpm
  check`) y de los comandos de reproducción del spike, y referencia tus aprobaciones de
  las seis comprobaciones humanas (`decisiones-15a.md`, `decisiones-15b.md` y
  `lista-casos-historicos.md`). Está en su propio commit.
- `status: DONE` de T-0021 está en otro commit. El checker sólo exige para `DONE` el
  archivo de evidencia con sus tres secciones (R-09b), y las tiene. No exige nada más.
- `PROJECT.md` §3, "Qué sigue", punto 3: el cambio mínimo dice que T-0021 cerró y que el
  contrato de Risk OS es RO01, con sus tareas. Está en un tercer commit. No reescribe
  nada más; tampoco toca el mapa de §6, que hoy no nombra RO01 (si lo querés ahí, es una
  fila).

Si no aprobás alguno, saco su commit.

## Para decidir

Respondé con el número y la letra, o escribí el cambio.

**1. Dónde viven los datos reales de las cinco históricas** (D-0068, borrador en
`DECISIONS/0068-datos-reales-risk-os.md`).
- a. Postgres hosteado nuevo y dedicado a Risk OS, plan gratuito en São Paulo, servido
  por un proyecto de Vercel Hobby, como D-0062. Lo cargás vos; las previews sólo ven
  sintéticos. Implica aceptar de nuevo los riesgos del plan gratuito: pausa por
  inactividad, sin backups automáticos (copia manual tuya), uso comercial fuera de las
  condiciones de Vercel Hobby y transferencia internacional de datos de terceros.
- b. Lo mismo, en planes pagos. Backups y sin pausa; tiene costo mensual y lo
  contratás vos (R-14).
- c. Sólo en tu máquina: Postgres local con la app corriendo ahí, sin nada hosteado.
  Ningún dato real sale de tu equipo ni hay transferencia internacional. El revisor
  profesional trabaja en tu equipo o con vos; el despliegue de §7 queda sólo para las
  sintéticas, o no se hace.
- d. En el proyecto de Supabase de VS01, en otro esquema. Menos infraestructura, pero
  mezcla con producción de Broker datos de otra clase, que es lo que D-0063 evita.

**Recomiendo a**, con la condición de que el revisor no necesite cuenta en Supabase.
Es el precedente que ya aceptaste para VS01 y deja trabajar al revisor por la UI. Si no
querés datos de terceros en un plan gratuito, c es la alternativa barata.

**2. Acceso a la UI.**
- a. Una credencial compartida, como D-0066. Sin dependencias. El autor de cada cambio
  es un nombre que escribe quien opera: no se puede verificar, y EMI-25 pide "conocer
  autor".
- b. Una credencial por persona (usuario y hash de contraseña como variables del
  despliegue, para dos o tres personas). Sin dependencias ni proveedor; el autor sale de
  la credencial. Necesita un ADR propio (R-05).
- c. Login de Google como D-0059. Identidad verificada; hay que duplicar el OIDC en el
  contexto (D-0063 no deja importar `apps/web`), un cliente OAuth nuevo y extender
  D-0060 a otra app.
- (Con 1c, no hace falta acceso: la app corre en `localhost`.)

**Recomiendo b.** El revisor profesional y vos van a escribir y aceptar cosas, y
`accepted` "sólo por una persona" vale lo que valga saber quién fue.

**3. Unidad de despliegue.**
- a. Un proyecto de Vercel y una base propios de Risk OS, como CO01.
- b. Compartir el proyecto de Vercel y la base de Communication OS, cada uno con su
  esquema y su rol. Menos piezas, pero una falla o una rotación de credenciales de uno
  toca al otro, y la base de Communication no está autorizada para datos de Risk.
- c. Sin despliegue: todo local (va con 1c).

**Recomiendo a** (con 1a o 1b). No hay worker en ninguna opción: nada de v1 corre fuera
de un request.

**4. Qué vistas entran en v1, además de las tres de EMI-24.** Las cuatro son reglas de
la metodología, no extras:

| Vista | Regla | Si no entra, la aceptación pierde |
| --- | --- | --- |
| Seguridad | §8.2: un `safety_critical` "aparece siempre en una vista de seguridad propia", con su acción o decisión y alerta si no la tiene | La obligación de tratamiento de §8.2 y el disparador 4 de la Fase 13 (un `safety_critical` en el top-3 del profesional que Risk OS deja abajo) |
| No evaluables y cola de validación | §9.4, §9.5: lista aparte del ranking y prioridad de qué averiguar | Los riesgos sin evaluar de las históricas (respuesta A6) desaparecen de la vista principal sin otro lugar donde verlos |
| Escenarios agregados | §10.4: "se ve en una vista de escenarios agregados" | Los escenarios importados (respuesta A5) no se ven en ningún lado |
| Detalle con historial | §13 (historial, movimiento por dimensión) y EMI-25 | A12: reconstruir qué cambió necesita un lugar donde leerlo |

- a. Las cuatro, en forma mínima: la seguridad y los no evaluables como secciones de la
  lista, los escenarios como lista con sus miembros y el detalle como página del riesgo.
- b. Sólo seguridad y detalle (lo que la metodología obliga con más fuerza y lo que
  EMI-25 necesita).
- c. Sólo las tres de EMI-24.

**Recomiendo a.** Los datos ya existen y casi todo es filtrar la misma lista.

**5. Reordenamiento profesional en v1.** Decidido como registro de Risk OS (5a), sin
issue que lo pida. Ninguna histórica trae un orden profesional escrito (B7), así que
sólo aparecería durante la revisión profesional.
- a. Entra en T-0031: el registro con los campos del dossier 15a §6, el orden
  profesional visible junto al calculado y el conteo en la aceptación.
- b. Fuera de la app: el revisor anota los reordenamientos en un CSV con los mismos
  campos, que se versiona sin valores. Más barato; el orden calculado del momento hay
  que copiarlo a mano.
- c. No entra.

**Recomiendo a.** La revisión profesional de las históricas es justamente donde se
reordena, y los disparadores 1, 2 y 4 de la Fase 13 se alimentan de esos registros.
Con c, D14 no recibe evidencia durante Q4. Si el calendario aprieta, b.

**6. Quién hace la revisión profesional y qué deja escrito.**
- a. Vos, en las cinco empresas. Es lo que pasó en la Fase 12 (revisor = evaluador) y
  queda declarado como limitación.
- b. Un profesional que no evaluó esos casos: vos lo nombrás, accede por la UI y se le
  da acceso según el punto 2. Sus datos de acceso no van al repositorio.
- c. b en dos empresas y a en las otras tres.

Lo que deja escrito, en cualquier opción: la revisión de cada evaluación vigente en
la app (`accepted`, `needs_revision` o `rejected`, con fecha); los reordenamientos con
su causa, si entra el 5; y por empresa una nota corta con lo que no aceptaría como
orden o banda. El informe versionable lleva sólo conteos.

**Recomiendo b**, y a si no hay un segundo profesional disponible antes del
2026-11-18, con la limitación escrita en el acta.

**7. Cómo se cuentan los diez ciclos.**
- a. Al menos 10 revisiones cerradas en Risk OS después de la importación, en
  cualquier empresa.
- b. Como a, con al menos una en cada una de las cinco históricas, y al menos tres
  tipos de disparador distintos (acción cumplida, información nueva, cambio de
  contexto).
- c. "Diez casos": al menos 10 empresas (de las 13) con al menos un ciclo cerrado
  después de la importación.

En las tres, un ciclo que ya viene cerrado en los CSV no cuenta, una revisión abierta
no cuenta y cada ciclo tiene que tener disparador y cierre trazables (dossier 15a §5).

**Recomiendo b**: es la lectura de T-0021, pone a prueba los datos reales y no obliga a
operar empresas sintéticas sólo para llegar al número.

**8. `no-cupo.csv`, la suficiencia y la exposición retenida.**
- a. Siguen fuera, como aprobaste en la 15b. La vista de transferencia muestra
  "no evaluada" y "sin estimar" donde corresponde; las tareas prueban suficiencia y
  exposición con fixtures propias del contexto y con las históricas, que sí las tienen
  (D5, D6). Los CSV aprobados no cambian.
- b. Completar suficiencia y exposición en las sintéticas. Hay que inventarlas: la 15b
  lo prohibió para lo que la ficha no dice.
- c. Reabrir el contrato para `vigencia_texto` y "sin cobertura". Es un cambio de
  contrato, fuera de esta fase.

**Recomiendo a.**

**9. ¿Aprobás RO01 con estas decisiones?** Incluye los hallazgos H1 a H8 con mis
propuestas: H1 a, H2 (registro de novedades), H3 (lote idéntico = "ya importado"), H6
(`C_raw` sólo en el detalle) y H7 (portar el lector del spike).

**10. ¿Creo T-0028 a T-0032?** Entran a `main` en `DRAFT` con esta PR. Ajusto las que
dependen de tus respuestas antes del merge.

**11. ¿Cierro T-0021?** Evidencia y `status: DONE` en sus dos commits, más el cambio de
`PROJECT.md` §3.
