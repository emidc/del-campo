# VS01 en Vercel — ficha de importación

Para el owner. Todo lo de acá se configura **fuera de Git**: este archivo nombra las
variables y explica para qué sirve cada una, y **no contiene ni un solo valor** (R-18).

Estado al 2026-09-24: la app construye y el recorrido completo funciona contra datos
sintéticos. Lo que falta para el piloto son insumos humanos, listados al final.

---

## 1. Repositorio y rama

| | |
| --- | --- |
| Repositorio | `emidc/del-campo` |
| Rama construible | `task/T-0018-app-interna-y-aceptacion-vs01` |

Importá esa rama mientras el PR esté abierto. Una vez mergeado, cambiá la Production
Branch a `main`. **No hace falta esperar el merge para importar el proyecto.**

## 2. Configuración del proyecto

| Ajuste | Valor |
| --- | --- |
| Framework Preset | **Next.js** |
| Root Directory | **`apps/web`** |
| Include files outside root directory | **Sí** (activado) — el build necesita `packages/` |
| Node.js Version | **24.x** |
| Install Command | dejar el default (`pnpm install`) |
| Build Command | dejar el default (`pnpm build` → `next build`) |
| Output Directory | dejar el default |

**Por qué "include files outside root directory".** `apps/web` importa
`@del-campo/api`, que a su vez importa `@del-campo/db`. Son paquetes del mismo workspace
de pnpm, publicados como TypeScript sin compilar; sin esa opción, Vercel sube sólo
`apps/web` y el build falla al resolverlos.

**pnpm.** La versión está fijada en la raíz por `"packageManager": "pnpm@11.19.0"`, y
Vercel la respeta mediante Corepack sin configuración adicional. `pnpm-workspace.yaml`
ya incluye `apps/*`.

## 3. Variables de entorno

Todas son **de servidor**. Ninguna lleva el prefijo `NEXT_PUBLIC_`, que es lo único que
Next.js expone al navegador: la credencial de base y el secreto de sesión nunca llegan al
cliente.

| Variable | Para qué sirve | Entornos | Quién la provee |
| --- | --- | --- | --- |
| `DATABASE_URL` | Cadena de conexión al Postgres de Supabase (D-0013). Usar el **pooler** de Supabase, no la conexión directa. | Production, Preview, Development | Owner, desde el panel de Supabase |
| `VS01_SESSION_SECRET` | Cifra la cookie de sesión y la del handshake de OIDC. Cadena aleatoria de 32+ caracteres (`openssl rand -base64 48`). **Distinta por entorno.** | Production, Preview, Development | Owner, generada por él |
| `GOOGLE_OAUTH_CLIENT_ID` | Identificador del cliente OAuth web (D-0059). | Production, Preview, Development | Manuel → owner |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Secreto de ese cliente. | Production, Preview, Development | Manuel → owner |
| `VS01_GOOGLE_WORKSPACE_DOMAIN` | Dominio del Workspace de la correduría. La admisión compara contra el claim `hd` del ID token, no contra el sufijo del email. | Production, Preview, Development | Owner |
| `VS01_ADMITTED_ACCOUNTS` | Lista explícita de cuentas admitidas, separadas por coma o salto de línea. **Vive acá y no en Git** (D-0059). | Production, Preview, Development | Owner, antes del piloto |
| `VS01_BASE_URL` | URL pública de la app. De acá se deriva el `redirect_uri`; nunca se usa el header `Host`, que un cliente controla. | Production, Preview, Development | Owner, tras el primer deploy |

Notas de uso:

- **`VS01_ADMITTED_ACCOUNTS`** admite `persona@dominio` o, si querés fijar la identidad,
  `persona@dominio=<sub de Google>`. Sin el `sub`, si esa dirección se reasignara a otra
  persona, la nueva entraría. Con el `sub`, no. Empezá sin fijarlos y fijalos después del
  primer login, que es cuando los conocés.
- **`VS01_BASE_URL`** hay que cargarla después del primer despliegue, cuando Vercel te dé
  el dominio. Si cambiás a un dominio propio, actualizala junto con las URIs de Google.
- Cambiar cualquiera de estas variables **exige un redespliegue** para que tome efecto.
  Sacar una cuenta de la lista corta su acceso en el siguiente request tras ese
  redespliegue; una sesión ya emitida vence sola a las 8 horas.

## 4. Cliente OAuth — qué pasarle a Manuel

- Tipo: **aplicación web**, audiencia **Internal** (sólo el Workspace).
- Scopes: **`openid`, `email`, `profile`** y nada más. **Sin ningún scope de Drive**:
  D-0057 y D-0059 los excluyen, y la app no llama a la API de Drive.
- **URI de redirección autorizada — exacta, con esta ruta literal:**

  ```
  https://<dominio-de-vercel>/api/auth/google/callback
  http://localhost:3000/api/auth/google/callback
  ```

  La ruta es `/api/auth/google/callback`. Un carácter distinto y Google rechaza el
  intercambio con `redirect_uri_mismatch`.
- Orígenes JavaScript autorizados: no hacen falta (el intercambio ocurre en el servidor).
- **Manuel no necesita crear una cuenta de servicio, ni delegación de dominio, ni tocar
  permisos de Drive.** Si algo de eso aparece en la conversación, está fuera de D-0057.

## 5. Supabase

- Sólo **Postgres** (D-0013). **No se habilita Supabase Auth**, ni Storage, ni Realtime.
- Aplicá las migraciones de `packages/db/migrations/` en orden contra la base del
  proyecto antes del primer deploy con datos.
- Para el despliegue inicial autorizado, sembrá el lote sintético:

  ```bash
  DATABASE_URL='<cadena de Supabase>' node scripts/vs01/seed-sintetico.mjs
  ```

  El script se niega a correr contra la base de T-0013 y contra cualquier base cuyo
  nombre no se declare sintética. La app muestra en pantalla
  «LOTE SINTÉTICO — sin datos de clientes», de modo que nadie pueda confundir ese
  despliegue con datos de la correduría.
- **La carga de datos reales es una acción aparte y la autorizás vos** (R-13). No está
  incluida en la autorización de preparar Vercel.

## 6. Qué se puede desplegar hoy y qué no

| | Estado |
| --- | --- |
| Importar el proyecto y que el build pase | **Ahora**, sin ninguna variable |
| Ver el recorrido completo con datos sintéticos | Ahora, con `DATABASE_URL` + seed |
| Iniciar sesión | Necesita las cuatro variables de Google y `VS01_BASE_URL` |
| Medir los 20 casos | Necesita además los casos congelados y los datos reales cargados |

Sin las variables de autenticación, la app **no** queda abierta: las páginas y las
consultas de datos fallan al leer la configuración en vez de admitir a cualquiera. La
ausencia de configuración es un error visible, nunca un bypass.

## 7. Volver a la versión anterior

1. En Vercel, **Deployments** → el despliegue anterior que estaba sano → **Promote to
   Production** (o «Instant Rollback»). Tarda segundos y no reconstruye.
2. Comprobá que `/login` responde y que `/api/vs01/search` sin sesión devuelve `401`.
   Comprobá también que una página con datos no se cachea río arriba — el HTML de
   `/poliza/<id>` lleva número de póliza y nombre del tomador:

   ```bash
   curl -sI -H "Cookie: vs01_session=<la tuya>" https://<dominio>/poliza/<id> | grep -i 'cache-control\|x-vercel-cache'
   ```

   Tiene que decir `private`/`no-store` y no un `HIT` de caché.
3. Si el problema fue una **variable**, corregila y redesplegá: un rollback de código no
   revierte variables, que viven fuera del despliegue.
4. Las migraciones de base **no se revierten solas**. Cada una tiene su `down` en
   `packages/db/migrations/down/`, y aplicarla es una acción con tu aprobación explícita.
   VS01 es de solo lectura sobre la base, así que un rollback de la app no deja datos a
   medias.

## 8. Cuenta y costos

Proyecto en la cuenta del owner. **No se contrató ningún plan ni se habilitó ningún cargo
adicional**: la configuración de arriba entra en los planes gratuitos de Vercel y
Supabase para un piloto interno de una sola persona. Si algo pidiera un plan pago, es una
decisión del owner y no una consecuencia de esta tarea.
