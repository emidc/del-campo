# Fase 1 de T-0035: checklist del cliente de Google External

**Qué es.** La lista de lo que hay que hacer, decidir y comprobar para crear los clientes
OAuth de audiencia External de la fase 1 del plan (`docs/migration/T-0035-identidad-comun.md`,
§3). La preparó el agente a pedido del owner el 2026-11-04.

**Qué no es.** No es una autorización. La fase 1 sigue sin autorizar, y nada de esta lista
se ejecuta hasta que el owner lo apruebe. Tampoco toca ninguna aplicación: crear los
clientes no cambia nada para nadie, porque ninguna app los usa hasta las fases 2 a 4.

**Lo que no entra en el repositorio.** Ni el secreto de ningún cliente, ni emails, ni nombres
de personas (R-18, R-19). Los ids de cliente tampoco se anotan acá: la evidencia registra
sólo que se crearon, cuándo y quién.

## 1. Responsables

| Paso | Quién |
|---|---|
| Aprobar la fase y esta checklist | Owner |
| Crear la pantalla de consentimiento y los clientes | Quien administre el proyecto de Google Cloud, coordinado por el owner |
| Guardar los secretos fuera del repositorio hasta su fase | Quien los crea, entregándolos al owner por un canal privado |
| Registrar la evidencia (sin ids, secretos ni nombres) | Agente, con lo que informe quien los creó |

Completar antes de empezar, fuera del repositorio:

- [ ] Quién ejecuta en Google Cloud. Se acuerda fuera del repositorio; la evidencia anota
      sólo su rol.
- [ ] El proyecto de Google Cloud **nuevo** donde se crean (ver §2).
- [ ] Dónde se guardan los secretos hasta las fases 2 a 4 (un gestor de contraseñas del
      owner, por ejemplo). No en Vercel todavía: cargarlos es parte de cada fase.

## 2. Decisiones que hay que cerrar antes

- [ ] **Un proyecto de Google Cloud aparte para los clientes External.** La audiencia de
      la pantalla de consentimiento (Internal o External) es una sola por proyecto. El
      cliente Internal de VS01 vive en un proyecto con audiencia Internal: pasar ese
      proyecto a External cambiaría el login actual de Broker OS en producción, y con la
      pantalla en modo de prueba dejaría afuera a quien no esté cargado como usuario de
      prueba. Por eso los clientes nuevos van en un proyecto nuevo y el del cliente
      Internal no se toca. Confirmarlo en la consola antes de crear nada: este punto se
      apoya en cómo Google modela la audiencia y no se probó contra la consola.
- [ ] **Un cliente por app.** El código ya los separa: Broker OS lee
      `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET`, Communication OS
      `COMMUNICATION_GOOGLE_CLIENT_ID`/`_SECRET` y Risk OS `RISK_GOOGLE_CLIENT_ID`/`_SECRET`.
      La recomendación es tres clientes en el proyecto nuevo: revocar o rotar uno no corta
      a los otros dos. El plan dejaba esta elección abierta; el owner la confirma acá.
      Broker OS usa las mismas dos variables en `legacy` y en `oidc`: cuando la fase 2
      cargue el cliente nuevo, reemplaza las credenciales del Internal. Las del Internal
      se guardan antes, fuera del repositorio, porque la vuelta atrás de la fase 2 las
      necesita.
- [ ] **Dominios de producción** de cada app, que fijan las URIs de redirección. Son los
      valores que van en `VS01_BASE_URL`, `COMMUNICATION_BASE_URL` y `RISK_BASE_URL`.
- [ ] **Estado de publicación de la pantalla de consentimiento.** Con una pantalla External
      en modo de prueba, sólo entran las cuentas cargadas como usuarios de prueba. Hay
      que decidir si se publica, o si se cargan como usuarios de prueba las cuentas
      externas al Workspace que entran (por ejemplo, la del Revisor profesional).
      Verificar en la consola qué exige Google hoy para publicar con los scopes
      `openid email profile`.

## 3. Configuración en Google Cloud

- [ ] En el proyecto nuevo, pantalla de consentimiento de audiencia **External**, con el
      nombre de la aplicación y un email de soporte del owner.
- [ ] Scopes: sólo `openid`, `email` y `profile` (`packages/identidad/src/oidc.ts`,
      `SCOPES`). Nada de Drive (D-0057).
- [ ] Un cliente OAuth de tipo aplicación web por app, con nombres que digan a qué app
      pertenecen.
- [ ] URI de redirección autorizada de cada cliente, exacta y sin barra final:
      `<dominio de la app>/api/auth/google/callback`. Es la ruta de las tres apps
      (`GOOGLE_REDIRECT_PATH` en Broker OS, `RUTA_CALLBACK` en las otras dos).
- [ ] Ninguna URI de `localhost` ni de previews en los clientes de producción. Si hace
      falta probar, se crea aparte un cliente de prueba.
- [ ] El cliente **Internal** de VS01 y su proyecto no se tocan: ni la audiencia ni el
      estado de publicación. Es la vuelta atrás de Broker OS durante toda la migración.

## 4. Comprobaciones al terminar

Sin tocar producción:

- [ ] Cada cliente tiene una sola URI de redirección y coincide con su dominio.
- [ ] La pantalla de consentimiento pide sólo los tres scopes.
- [ ] El proyecto del cliente Internal de VS01 sigue con audiencia Internal y el cliente
      igual: Broker OS sigue entrando como hoy.
- [ ] Ninguna variable de Vercel cambió: `AUTH_MODE` sigue en `legacy` en los tres
      contextos.
- [ ] Los secretos están guardados donde se decidió en §1, y en ningún archivo del
      repositorio ni en un mensaje.

La prueba de un login real con el cliente nuevo es la comprobación de la fase 2 (o de la
fase de cada app), no de esta.

## 5. Vuelta atrás

Borrar los clientes nuevos o el proyecto nuevo entero. Nadie los usa todavía, así que no
se corta a nadie. El proyecto y el cliente Internal no se tocaron.

## 6. Evidencia que queda

En `ops/evidence/T-0035.md`, una entrada con: fecha, el rol de quien creó los clientes,
cuántos, el estado de publicación elegido y el resultado de cada comprobación de §4. Sin
ids, sin secretos, sin nombres y sin emails.

## 7. Lo que sigue sin autorizar después de esta fase

Cargar las variables en Vercel, cambiar `AUTH_MODE`, cargar invitaciones reales y aplicar
migraciones en producción: son las fases 2 a 4, cada una con su aprobación.
