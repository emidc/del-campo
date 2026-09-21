# Postgres local

Procedimiento reproducible para una máquina limpia. La versión mayor está fijada en
`.postgres-version` y la valida `pnpm db:version`; CI corre la misma mayor dentro de un
contenedor. → `D-0046`

## Por qué nativo acá y contenedor en CI

Postgres es un proceso, no un stack: instalarlo nativo cuesta un comando y evita la capa
de virtualización en el bucle de desarrollo, que es donde se paga cien veces por día. En
CI la reproducibilidad manda sobre la latencia, y ahí el contenedor es el que sabe
arrancar desde cero.

La diferencia es deliberada y no es gratis: una deriva de configuración entre la máquina
local y CI puede hacer pasar algo localmente y fallar en el pipeline. Eso es exactamente
lo que R-17 declara —los hooks y la máquina local protegen, CI es autoritativo— y por eso
el veredicto de una tarea lo da CI y no el verde local. `D-0046` registra la decisión y
qué la falsificaría.

## Instalar (macOS, Homebrew)

```bash
brew install postgresql@17
brew services start postgresql@17

# Homebrew no pone postgresql@17 en el PATH: es una fórmula "keg-only".
echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
exec $SHELL -l

psql --version   # tiene que decir 17.x
```

En un Mac Intel el prefijo es `/usr/local` en vez de `/opt/homebrew`.

Si ya hay otra mayor instalada y corriendo, las dos compiten por el puerto 5432. Parar la
otra (`brew services stop postgresql@16`) es suficiente: no hace falta desinstalarla, y
`pnpm db:version` avisa con nombre y apellido cuando la que responde no es la fijada.

## Configurar el repositorio

```bash
cp .env.example .env     # DATABASE_URL apunta a la base local; no contiene secretos (R-18)
pnpm db:version          # comprueba que la mayor local coincide con .postgres-version
pnpm db:create           # crea delcampo_dev y aplica las migraciones pendientes
```

`pnpm db:reset` borra la base y la vuelve a crear desde cero. Sólo opera sobre `localhost`
y sobre bases terminadas en `_dev` o `_test`: un drop no tiene deshacer, y la protección
vive en el código y no en la memoria de quien lo corre.

## `btree_gist`

Las constraints de T-0012 —intervalos de `PolicyVersion` no solapados con
`EXCLUDE USING gist`— necesitan la extensión `btree_gist`, que viene en el paquete
`postgresql@17` de Homebrew y **no** requiere `contrib` aparte. Comprobarlo antes de
T-0012:

```bash
psql "$DATABASE_URL" -c 'create extension if not exists btree_gist'
psql "$DATABASE_URL" -tAc "select extname from pg_extension where extname = 'btree_gist'"
```

La extensión no se crea en una migración de T-0010: la primera migración es la de T-0012
y la crea ahí, junto a las constraints que la usan.

## Cambiar de versión mayor

Cambiar `.postgres-version` es cambiar el entorno de todo el equipo y de CI. Lleva ADR
por R-05 —cambio de proveedor de infraestructura— y el orden es: ADR, después el archivo,
después el servicio de Postgres del workflow de CI, que requiere aprobación humana por
R-13.
