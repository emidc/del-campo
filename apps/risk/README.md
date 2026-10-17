# Risk OS — UI de las vistas (`apps/risk`)

App web de Risk OS v1 (`SLICES/RO01.md` §2), creada en T-0030. Muestra lo registrado y lo
calculado de cada organización con las reglas de presentación de RO01 §3. Es una app
aparte de `apps/web` y de `apps/communication` (D-0063), con el mismo stack (Next.js,
D-0058) y sin dependencias nuevas. Desde T-0031 también registra: novedades, acciones y su
estado, reevaluaciones, revisiones, cierres, coberturas, eventos, reordenamientos y el orden
previo, siempre con la persona de la sesión como autor y a través de los casos de uso de
`@del-campo/risk`.

**Importa del workspace sólo `@del-campo/risk`**, y sólo su raíz. No importa
`packages/*`, otra app, otro contexto, un archivo interno del suyo ni `postgres`. Lo hace
cumplir `pnpm lint` (R-25).

## Rutas

| Ruta | Qué es | Protección |
|---|---|---|
| `/login`, `POST /api/login`, `POST /api/logout` | Entrar y salir | Mismo origen (`Origin`). Sin configuración, se niegan. |
| `/` | Organizaciones, con cuántos objetos tiene cada una | Sesión de una persona |
| `/o/{org}` (`?unidad=`) | Lista: ranking D10, seguridad, no evaluables y cola de validación | Sesión; registra el acceso |
| `/o/{org}/escenarios` | Escenarios y sus miembros | Sesión; registra el acceso |
| `/o/{org}/plan` | Plan de acción | Sesión |
| `/o/{org}/transferencia` | Transferencia y feed de actividad | Sesión |
| `/r/{id}` | Detalle del riesgo con su historial | Sesión; registra el acceso |
| `/o/{org}/orden-previo` | Material ciego y orden previo del revisor: sin ranking, bandas ni `C_raw` | Sesión; **no** registra el acceso |
| `GET /api/organizaciones` | Datos de `/` | Sesión |
| `GET /api/o/{org}/{lista,escenarios,plan,transferencia,actividad}` | Datos de cada vista (`lista` acepta `?unidad=`) | Sesión; lista y escenarios registran el acceso |
| `GET /api/r/{id}` | Datos del detalle | Sesión; registra el acceso |
| `POST /api/r/{id}/actualizar` | Los formularios del riesgo (`op`: novedad, alta_accion, estado, eficacia, reevaluacion, revisar, cerrar, sin_cambio, alta_cobertura, evento) | Sesión y mismo origen |
| `POST /api/o/{org}/reordenar` | Un reordenamiento profesional | Sesión y mismo origen |
| `POST /api/o/{org}/orden-previo` | El orden previo del revisor | Sesión y mismo origen |

Sin sesión, una página manda a `/login` y un endpoint responde 401 con un cuerpo fijo.
Una organización, una unidad o un riesgo que no existen son 404 y no registran nada.

Cada formulario vuelve a su página (303) con `?ok=` o `?error=`, que la página muestra arriba.
Un error es el motivo de la regla que no se cumplió, o un mensaje fijo si falló otra cosa; en
los dos casos no se guardó nada. `volver` sólo acepta rutas propias (`/r/…`, `/o/…`). Los
formularios están cerrados por defecto (`<details>`) para que la lectura siga primero, y el
detalle termina con el historial de cambios del riesgo.

## Acceso por persona (D-0069)

- **Personas:** cada una tiene usuario y contraseña propios en `risk.usuario` y
  `risk.credencial` (hash scrypt). Las da de alta, les cambia la contraseña o las da de
  baja el owner con `pnpm --filter @del-campo/risk run persona` (ver
  `contexts/risk/README.md`). La app no tiene pantalla para esto ni roles (RO01 §8).
- **Al entrar:** scrypt en tiempo constante, aun con un usuario que no existe. Un login
  válido queda en `risk.registro_acceso` como `inicio_sesion`.
- **Sesión:** cookie `risk_session` = `v1.<persona>.<credencial>.<vencimiento>.<HMAC-SHA256>`.
  Dura 8 h y no lleva datos de Risk OS. `HttpOnly`, `SameSite=Strict` y, fuera de
  `localhost`, `Secure`. En cada request, el guard comprueba la firma y que esa credencial
  siga siendo la vigente de la persona: una contraseña nueva o la baja cierran sus
  sesiones.
- **Identidad:** la persona de la sesión es la única identidad que la app pasa al
  contexto. Ninguna pantalla pide un nombre.
- **Accesos:** la lista, los escenarios y el detalle (las vistas con ranking, bandas o
  `C_raw`) registran persona, organización y vista antes de devolver datos, para A8.
- **Sin configuración, se niega todo:** sin `RISK_UI_SESSION_SECRET` (32 caracteres o
  más) o sin `RISK_DATABASE_URL`, las páginas mandan a `/login`, que lo dice, y los
  endpoints responden 503.
- **Límite de intentos:** 10 logins fallidos de un mismo usuario en 15 minutos lo dejan
  sin entrar durante 15 minutos, con la contraseña correcta o no (T-0032). Se guarda sólo
  la huella sha256 del usuario, nunca el usuario ni la IP, y la pantalla dice la regla.

## Variables de entorno

Ninguna está en el repositorio (R-16, R-18). Los valores locales van en un `.env.local`
de esta carpeta, que está gitignored.

| Variable | Qué es |
|---|---|
| `RISK_DATABASE_URL` | La base de Risk OS. En local, `postgres://localhost:5432/delcampo_risk_dev`. |
| `RISK_UI_SESSION_SECRET` | Secreto de la firma de la cookie, al azar (`openssl rand -base64 36`). Cambiarlo cierra todas las sesiones. |

En Vercel van sólo en Production, con el rol `risk_app` en `RISK_DATABASE_URL`; las previews
quedan sin base. El despliegue está en `docs/despliegue/vercel-risk.md`.

## Reglas de presentación (RO01 §3)

1. **`C_raw` nunca solo:** sólo aparece en el detalle, en la fila de criticidad de cada
   evaluación, con el vector completo y las dos banderas (H6). La lista muestra banda,
   vector y banderas.
2. **Sin agregados de `C_raw`:** ninguna vista lo suma, promedia, resta, divide ni lo
   compara entre riesgos u organizaciones. El movimiento por dimensión muestra niveles
   antes y después, sin restar.
3. **El techo plausible no entra al ranking:** sólo en la cola de validación y en el
   detalle, en su propia columna o línea, rotulado.
4. **Una organización por vista:** nada se ordena entre organizaciones. El filtro por
   unidad oculta filas y conserva el número de posición de la organización. Un padre
   aparece en su unidad y en la de cualquiera de sus hijos.
5. **`unknown` es `unknown`:** con su rango si lo tiene, nunca completado con un valor.
6. **Qué evaluación usa cada fila:** id corto, fecha y `aceptada` o `pendiente de
   revisión` (la vigente de 8a: la última aceptada o, si no hay, la última no rechazada).
7. **Versión de lo calculado:** cada vista con algo calculado dice `calculado con las
   funciones de metodologia v1`. El plan y la actividad no calculan nada y lo dicen.

Además: la transferencia no muestra un riesgo neto ni descuenta la cobertura del riesgo;
los eventos de póliza son observaciones locales (D-0067); el cambio esperado de una acción
es una hipótesis rotulada, nunca el valor de un factor (D16).

## Correr en local

```bash
pnpm --filter @del-campo/risk run db:create                # delcampo_risk_dev con su esquema
pnpm --filter @del-campo/risk run import SPIKES/T-0021/v0/fase-15/sinteticos \
  --corte 2026-10-14 --por "Nombre"                        # las 8 sintéticas
openssl rand -base64 24 | tee /dev/tty | \
  pnpm --filter @del-campo/risk run persona alta --nombre "Nombre" --usuario nombre
pnpm --filter ./apps/risk run dev                         # http://localhost:3200
```

Con `.env.local` en esta carpeta:
`RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_dev` y un
`RISK_UI_SESSION_SECRET` al azar.

## Lista de recorrido (A11)

Lo que cada vista tiene que mostrar con las 8 sintéticas importadas y nada más. Las
organizaciones se reconocen por el prefijo de sus riesgos.

**Organizaciones (`/`).** Ocho: S05, S06, S07, S15, S28 (con `15B`), S29, S32 y S36, cada
una con su conteo de riesgos, padres, sub-riesgos y escenarios, y sin ningún número
calculado.

**Lista (`/o/{org}`).** Ranking en el orden de D10, cada fila con posición, banda, I
efectivo, determinante, los 7 factores, las dos banderas y la evaluación usada. Ninguna
fila muestra `C_raw`.

| Org. | Ranking | Seguridad | No evaluables | Cola |
|---|---|---|---|---|
| S05 | 1 S05-P01 (padre, Crítica, con sus tres hijos debajo; S01 y S03 prioritarios), 2 R04, 3 R05, 4 R06, 5 R08, 6 R07 | P01-S01, P01-S02, R04, R05 y R09 con alerta; P01-S03 con su acción en curso | R09 (§9.3) | R09, con techo 80 |
| S06 | 1 R03, 2 R05, 3 R01 (Crítica), 4 R04, 5 R06, 6 R02 | R03 y R04 con alerta | — | R05 (uncertainty high), techo 100 |
| S07 | 1 R04, 2 R06, 3 R02, 4 R03 … 8 R05 | E01, R01, R02, R03 y R04 con alerta | — | R04 y E01 |
| S15 | 1 R01, 2 R03, 3 R02, 4 R06, 5 R05 | R04 con alerta | R04 (§9.3) | R04, techo 80 |
| S28 | 1 R04 (Crítica) … 7 R06 (Baja) | R01, R02 y R04 con alerta | 15B-S28-N01 (P unknown) | N01 (techo 125) y R07 |
| S29 | 1 R06 … 5 S29-P01 (padre; S02 prioritario) | — | P01-S01 (P unknown) | R07 y P01-S01 |
| S32 | 1 R03, 2 R05, 3 R01, 4 R02, 5 R04 | R01 con alerta; R05 | R06 (P unknown) | R06, techo 40 |
| S36 | 1 R07 y 1 R03, empatados y provisionales; 3 R06 … 7 R02 | R02, R03 y R07 con alerta | — | R07, techo 100 |

Todas las evaluaciones vigentes están `pendiente de revisión` salvo una `aceptada`
(punto abierto 5 de T-0029). El filtro de unidad no aparece: las sintéticas no tienen
`unidad_id`.

**Escenarios (`/o/{org}/escenarios`).** Sólo S07 tiene uno: S07-E01, con sus miembros
S07-R01 y S07-R04, cada uno con su banda, vector, banderas y evaluación. Las demás
organizaciones dicen que no tienen escenarios.

**Plan de acción (`/o/{org}/plan`).** Las acciones y decisiones de cada riesgo con
estado, factor objetivo, mecanismo, cambio esperado (con el rótulo de hipótesis),
eficacia observada e historial de estados. S28, S36 y S07 tienen una acción con eficacia
observada en una reevaluación.

**Transferencia y actividad (`/o/{org}/transferencia`).** Coberturas por riesgo con
póliza, vigencia, límite, sublímite, deducible, exclusiones, suficiencia (`no evaluada`
donde lo está), exposición retenida (`sin estimar` donde falta) y límite disponible con
su regla. S05 no tiene coberturas. S36 tiene el único evento de póliza, y su límite
disponible baja de 500000 a 499000. Debajo, el feed de la organización, de lo más nuevo a
lo más viejo.

**Detalle (`/r/{id}`).** Posición en su organización (o que no compite), evaluación usada,
padre, hijos, miembros y escenarios; el historial de evaluaciones de la última a la
inicial, cada una con su criticidad (`C_raw`, banda, I efectivo, determinante, vector y
banderas en una misma fila), el techo plausible en una línea aparte y el movimiento por
dimensión contra la anterior aceptada (o la anterior de la cadena, rotulada). Por
ejemplo, S32-R01 tiene tres evaluaciones; en la última, I cont. vuelve de 1 a 4. El
detalle de un padre (S05-P01, S29-P01) no tiene historial propio: dice por qué hijo
prioritario se lee y qué evaluación de ese hijo usa su posición.

## Tests

| Archivo | Qué cubre |
|---|---|
| `src/lib/deny.test.ts` | R-28: cada endpoint de datos sin cookie, con una inválida, de otro secreto, adulterada o vencida responde 401 sin tocar la base; sin configuración, 503; login y logout de otro origen, 403; toda página llama primero a `requireSession()` y todo endpoint pasa por `withSesion`. Los tres POST de T-0031 sin sesión, 401; de otro origen o sin origen, 403 aun con sesión. |
| `src/vistas/paginas.integration.test.ts` | El HTML de cada página con las 8 sintéticas: `C_raw` sólo en la fila de criticidad del detalle, con los 7 factores y las 2 banderas; toda fila con factores los muestra completos; el techo sólo en la cola y el detalle; sólo riesgos de la organización; `unknown`; evaluación usada; versión; sin riesgo neto. Y cada endpoint con una sesión válida, y la baja que lo corta. Los formularios de T-0031: el material ciego sin resultados y el orden previo una sola vez; una novedad que abre una revisión y su cierre sin cambio; un pedido incompleto que no escribe nada; `volver` a otro sitio que se ignora; el reordenamiento al lado del orden calculado; el estado de una acción nueva; el historial en la página. |
