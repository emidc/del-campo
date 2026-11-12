# Riesgos de Risk OS en la ficha de empresa — diseño

Diseño de `T-0036`, `C4-03a` y `C4-03b`. Es lo que se implementa; no es una decisión nueva:
aplica D-0067, D-0071, D-0072 y D-0077. Todo en local, con datos sintéticos.

Tres PR, en este orden. `C4-03a` y `C4-03b` todavía no tienen archivo en `TASKS/`: cada PR
crea el suyo (la rama necesita un `T-xxxx`).

| PR | Qué | Dónde |
|---|---|---|
| 1 · `T-0036` | Organización evaluada, unidades y vínculo con la empresa | `contexts/risk` |
| 2 · `C4-03a` | Lectura `riesgosDeEmpresa` y su endpoint con token | `contexts/risk`, `apps/risk` |
| 3 · `C4-03b` | Cliente con token y sección «Riesgos» en la ficha | `packages/api`, `apps/web` |

Supuesto (recomendación de D-0071, la confirma el owner): **una empresa tiene como mucho una
organización evaluada**, y las sedes son zonas de esa organización. Si cambia, se quita un
control de `vincular` (§1.2) y `riesgosDeEmpresa` pasa a devolver una lista.

---

## 1. T-0036 — modelo y migración

Vale el borrador de la rama `task/T-0036-organizacion-evaluada`
(`0011_organizacion_evaluada.sql`), con dos agregados (§1.3). Resumen de lo que queda:

### 1.1 Tablas

Las tres en el esquema `risk`, de sólo inserción, con RLS y `legado_risk_app`.
`risk_persona` sólo lee, por `authz_ve_organizacion(organizacion_id)`.

| Tabla | Columnas | Regla |
|---|---|---|
| `organizacion_ficha` | `organizacion_id`, `sector`, `tamano`, `zonas text[]` (≤ 50), autor, fecha | La vigente es la última fila. Las zonas son las unidades o sedes. |
| `vinculo_empresa` | `organizacion_id`, `empresa_id` (uuid de la `Party`, opaco, sin clave foránea; `null` quita el vínculo), autor, fecha | La vigente es la última fila por organización. |
| `vinculo_verificado` | `vinculo_id` (pk → `vinculo_empresa`), autor, fecha | Sin esta fila, el vínculo está pendiente. |

No hay tabla maestra de organizaciones: una organización existe si tiene riesgos, y
`organizacion_id` sigue siendo su identidad (D-0067). No hace falta carga inicial ni tocar
el importador. `riesgo.unidad_id` sigue siendo texto libre; no se ata a `zonas` todavía.

### 1.2 Escritura y autorización

- Sólo escribe un Administrador activo, por `operar()` de `accesos.ts`, que comprueba el
  actor en la base y audita con `tipoObjeto: 'organizacion'`, también los rechazos.
- Se carga por CLI de Risk OS (`organizacion listar|ficha|vincular|verificar|desvincular`),
  con el id copiado de Broker OS. Sin pantalla y sin emparejar por nombre ni CUIT.
- «Una empresa, una organización» lo controla `vincular` bajo el lock de accesos. Alcanza
  mientras la CLI sea la única escritura; si aparece otra, pasa a un trigger.
- La misma persona puede vincular y verificar (operador único, D-0083): son dos actos.

### 1.3 Agregados al borrador

1. **Lectura para C4-03a.** `organizacionDeEmpresa` hoy devuelve sólo lo verificado, y la
   ficha tiene que distinguir «pendiente» de «sin vínculo». Agregar:

   ```ts
   vinculoDeEmpresa(db, empresaId): Promise<{ organizacionId: string; estado: 'pendiente' | 'verificado' } | null>
   ```

   Corre con la transacción de la persona, así que RLS oculta lo no asignado.
2. **Test de concurrencia**: dos `vincular` a la vez de la misma empresa en dos
   organizaciones; uno se rechaza.

### 1.4 Tests clave

- Vincular → pendiente; verificar → vigente; verificar sin vínculo se rechaza; la misma
  empresa en dos organizaciones se rechaza; desvincular la libera.
- Un Operador o un Revisor no escriben; un Operador sin la organización asignada no lee su
  ficha ni su vínculo (RLS).
- Las listas de `index.test.ts` (exports) e `historial.integration.test.ts` (tablas),
  actualizadas.

---

## 2. C4-03a — lectura y endpoint

### 2.1 Operación de lectura

`riesgosDeEmpresa(db, sesion, version, empresaId)` en `contexts/risk`, exportada desde
`index.ts`. Corre como la persona (`risk_persona`), así que RLS decide qué ve:

1. `exigirPermiso(sesion.rol, 'riesgo.ver_resultados')`.
2. `vinculoDeEmpresa(db, empresaId)` (§1.3). `null` → `sin_vinculo`. Una organización no
   asignada es invisible por RLS y responde lo mismo que una empresa sin vínculo: no se
   filtra que existe.
3. `pendiente` → `pendiente`.
4. `verificado` → arma la proyección a partir de `vistaLista` (mismas reglas: orden previo
   del Revisor, registro de acceso a resultados) y de la ficha vigente.

### 2.2 Endpoint

`GET /api/entre-contextos/empresas/[empresa]/riesgos`, en `apps/risk`.

- Pedido: `Authorization: Bearer <token>`. No lee cookies ni acepta parámetros.
- Token (D-0077, ya implementado): ES256, 60 s, `iss = broker-os`, `aud = risk-os`, con
  `proveedor` y `sujeto` de la persona y `jti` de un solo uso.
- Pasa por un wrapper nuevo, `withLlamada` (`lib/llamada.ts`), que llama a `admitirLlamada`
  con `registroJtiPostgres` y el JWKS de Broker OS. Sólo existe con `AUTH_MODE=oidc`.
- Configuración: `RISK_JWKS_BROKER`, el JWKS público de Broker OS como JSON en una variable
  de entorno. No se descarga de una URL.

Un `[empresa]` que no es un uuid responde `sin_vinculo`, sin consultar.

| Caso | Respuesta |
|---|---|
| `AUTH_MODE=legacy` | 404 |
| Falta `RISK_JWKS_BROKER` o la conexión `oidc` | 503 `{ "error": "la UI no está configurada" }` |
| Sin token, token rechazado (firma, `iss`, `aud`, vencido, `jti` repetido) o persona no admitida en Risk OS | 401 `{ "error": "sin credencial válida" }` |
| La matriz lo niega (por ejemplo, Revisor sin orden previo) | 403 `{ "error": "<explicación>" }` |
| Todo lo demás | 200 con el cuerpo de abajo |

Siempre `cache-control: no-store`. El motivo del rechazo nunca va en la respuesta.
`withLlamada` verifica primero firma, `iss`, `aud` y vencimiento sin tocar la base: un
token que falla ahí se niega sin auditar, igual que una cookie inválida. Un `jti` repetido
y una persona no admitida sí quedan en `evento_auditoria`.

```jsonc
// 200 — una de tres formas
{ "estado": "sin_vinculo" }
{ "estado": "pendiente" }
{
  "estado": "vinculada",
  "organizacion": { "id": "ORG-…", "sector": null, "tamano": null, "zonas": [] },
  "version": "…",                       // versión de las funciones que calcularon
  "generadoEn": "2026-11-11T21:00:00Z", // reloj de Risk OS al responder
  "riesgos": [                          // en el orden del ranking
    {
      "riskId": "RSK-…", "titulo": "…", "tipoObjeto": "riesgo",
      "unidad": "…",                             // el `unidad_id` del riesgo, o null
      "posicion": 1, "empate": false, "provisional": false,
      "banda": "…"                               // o null
    }
  ],
  "noEvaluables": 2,                    // cantidades, sin detalle
  "enCola": 3
}
```

No salen `C_raw`, el vector de factores ni evaluaciones: eso sólo se ve en el detalle de
Risk OS (H6). La ficha enlaza a Risk OS para lo demás.

### 2.3 `deny.test.ts`

El bloque «el token entre contextos no tiene endpoint todavía» se reemplaza por:

- sólo `lib/llamada.ts` importa `entre-contextos.ts`, y sólo las rutas bajo
  `api/entre-contextos/` usan `withLlamada`;
- toda ruta bajo `api/entre-contextos/` pasa por `withLlamada` y ninguna por `withSesion`;
  el resto sigue como hoy;
- esas rutas sólo exportan `GET`.

### 2.4 Tests clave

- Sin token, con firma de otra clave, `iss` o `aud` equivocados, y vencido: 401 con el
  cuerpo fijo y sin tocar la base (misma técnica de la base inexistente).
- Integración contra la base: token válido → 200; **el mismo token otra vez → 401**;
  persona sin credencial en Risk OS o dada de baja → 401.
- **Empresa ajena**: un Operador sin la organización asignada recibe `sin_vinculo`, igual
  que con una empresa inexistente.
- Vínculo sin verificar → `pendiente`; verificado → concilia fila por fila con
  `vistaLista`; el cuerpo no contiene `C_raw` ni `vector`.
- `legacy` → 404; sin `RISK_JWKS_BROKER` → 503.

---

## 3. C4-03b — la ficha

### 3.1 Cliente en `packages/api`

`riesgosDeEmpresa(principal, partyId)` en `packages/api/src/riesgos/`. No importa
`@del-campo/risk`: declara su propio tipo del contrato de §2.2 y valida el JSON a mano, así
las reglas de lint de R-25 no cambian. (D-0071 permite importar la lectura; no hace falta
todavía.)

1. Sólo para una `Party` de tipo organización que la persona ya ve en Broker OS (la ficha
   ya la leyó con `party()`).
2. Emite el token con `emitirToken`: `emisor: 'broker-os'`, `audiencia: 'risk-os'`,
   `proveedor: 'google'`, `sujeto: principal.sub`. Un token por llamada, sin reintento.
3. `fetch` con `cache: 'no-store'` y `AbortSignal.timeout(3000)`.

Devuelve una unión:

| Resultado | Cuándo |
|---|---|
| `vinculada` · `pendiente` · `sin_vinculo` | 200 con ese `estado` y el cuerpo válido |
| `sin_acceso` | 401 o 403 |
| `no_disponible` | error de red, timeout, 5xx, 404 o un cuerpo que no cumple el contrato |
| `no_configurado` | falta `RISK_API_URL` o `BROKER_TOKEN_CLAVE_PRIVADA` |

Configuración: `RISK_API_URL`, `BROKER_TOKEN_CLAVE_PRIVADA` (JWK privada, sólo en el
entorno) y `RISK_BASE_URL` para los enlaces. En local, el par de claves se genera con
`generarParDeClaves` y la pública va a `RISK_JWKS_BROKER`. Ninguna clave entra a Git.

### 3.2 Sección «Riesgos» en `apps/web/src/app/parte/[id]/page.tsx`

Sólo en fichas de organización, debajo de «Pólizas», en un componente de servidor dentro de
`<Suspense>`: la ficha no espera a Risk OS.

| Resultado | Qué se ve |
|---|---|
| `vinculada` | Tabla con posición, riesgo, unidad y banda; «N no evaluables · N en cola de validación»; «Consultado en Risk OS a las HH:MM»; enlace «Abrir en Risk OS». |
| `pendiente` | «La vinculación con Risk OS está pendiente de verificación.» |
| `sin_vinculo` | «Esta empresa no tiene una organización evaluada vinculada, o no la tenés asignada.» |
| `sin_acceso` | «No tenés acceso a Risk OS.» |
| `no_disponible` | «Risk OS no responde. No se muestran riesgos.» |
| `no_configurado` | «Riesgos no está configurado en este entorno.» |

Broker OS no guarda ni cachea riesgos: si Risk OS cae, la sección lo dice y no muestra
nada anterior.

### 3.3 Tests clave

- Cliente, con `fetch` simulado: cada fila de la tabla de §3.1, incluido un 200 con cuerpo
  inválido → `no_disponible`; el token sale con `iss`, `aud` y el `sujeto` de la persona, y
  dos llamadas usan dos `jti` distintos.
- Ficha: una persona no muestra la sección; cada resultado muestra su texto; con
  `no_disponible` no aparece ninguna fila de riesgo.
- Un ejemplo del cuerpo `vinculada` de §2.2, copiado igual en el test del endpoint y en el
  del cliente: si el contrato cambia de un lado, falla el otro al actualizarlo.

---

## 4. Fuera de alcance

Producción (espera `T-0032`), pantalla para vincular, zonas e inspección (C7), escrituras
desde Broker OS, copia de riesgos en Broker OS y vincular una empresa real (queda como
casilla de `T-0036`).
