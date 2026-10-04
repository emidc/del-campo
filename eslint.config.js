// Límites de módulo de R-25, hechos cumplir por herramienta y no por convención.
//
// Dos mecanismos, a propósito:
//
//   - `no-restricted-imports` para los límites entre paquetes, donde el especificador
//     prohibido tiene nombre. Un nombre literal no depende de cómo el motor de globs
//     interprete `*`, que es exactamente el tipo de ambigüedad que un guardrail no
//     puede tener.
//   - `no-restricted-syntax` sobre el AST para "domain no importa nada", que no es una
//     lista de paquetes sino una propiedad: ningún especificador que no empiece con `.`.
//     Cubre import, export-from e import() dinámico; un solo selector por forma.
//
// Los tres límites están escritos aunque `api` y `web` todavía no existan. No es
// andamiaje especulativo: es la transcripción de una regla ya vigente, y el costo de
// escribirla hoy es una línea. → R-25

import { dirname, relative, resolve } from 'node:path'

import js from '@eslint/js'
import tseslint from 'typescript-eslint'

/** `domain` no importa nada: ni paquetes del workspace, ni npm, ni builtins de Node. */
const noBareImports = (paquete) =>
  ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration']
    .map((tipo) => ({
      selector: `${tipo}[source.value=/^[^.]/]`,
      message: `${paquete} no importa nada: sólo módulos relativos dentro del paquete (R-25).`,
    }))
    .concat({
      selector: 'ImportExpression[source.value=/^[^.]/]',
      message: `${paquete} no importa nada, tampoco de forma dinámica (R-25).`,
    })

/**
 * Prohíbe todo especificador que cumpla `regex`, en las cuatro formas de importar. La
 * regex va dentro de un selector de esquery: la barra se escribe `\x2F` para no depender
 * de cómo esquery trata una `/` escapada dentro de la regex.
 */
const prohibirImports = (regex, mensaje) =>
  ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression']
    .map((tipo) => ({ selector: `${tipo}[source.value=${regex}]`, message: mensaje }))

// ── D-0063 · Contextos ───────────────────────────────────────────────────────
// Cada contexto es un paquete bajo `contexts/`. Broker (`packages/*`, `apps/*`) no
// importa ningún contexto, ni por nombre ni por ruta relativa.
const CONTEXTOS = ['communication']

const brokerNoImportaContextos = [
  ...prohibirImports(
    `/^@del-campo\\x2F(${CONTEXTOS.join('|')})(\\x2F|$)/`,
    'Broker no importa un contexto (R-25, D-0063).',
  ),
  ...prohibirImports('/(^|\\x2F)contexts\\x2F/', 'Broker no importa un contexto por ruta (R-25, D-0063).'),
  // Ni la app de un contexto (T-0025): por nombre de paquete o por su carpeta.
  ...prohibirImports(
    `/^@del-campo\\x2F(${CONTEXTOS.join('|')})-web(\\x2F|$)/`,
    'Broker no importa la app de un contexto (R-25, D-0063).',
  ),
  ...prohibirImports(
    `/(^|\\x2F)(${CONTEXTOS.join('|')})\\x2Fsrc\\x2F/`,
    'Broker no importa la app de un contexto por ruta (R-25, D-0063).',
  ),
]

/**
 * La app de un contexto (D-0063, T-0025) importa del workspace solo la raíz de su
 * contexto. Lo demás se prohíbe por especificador: otro `@del-campo/*` —Broker, otro
 * contexto o un archivo interno del suyo—, el driver de la base, y rutas que nombren
 * `packages/`, `apps/` o `contexts/`. Que un relativo no salga de la carpeta de la app
 * lo cubre la regla local `sin-salir-de`, porque la profundidad de las rutas de Next
 * hace imposible contarlo con una regex.
 */
const appDeContexto = (contexto) => [
  ...prohibirImports(
    `/^@del-campo\\x2F(?!${contexto}$)/`,
    `apps/${contexto} importa del workspace solo @del-campo/${contexto} (R-25, D-0063).`,
  ),
  ...prohibirImports('/^postgres(\\x2F|$)/', `apps/${contexto} no toca la base: pasa por @del-campo/${contexto} (R-25, D-0063).`),
  ...prohibirImports('/(^|\\x2F)(packages|apps|contexts)\\x2F/', `apps/${contexto} no importa por ruta otro paquete (R-25, D-0063).`),
  ...prohibirImports('/^\\x2F/', `apps/${contexto} no importa por ruta absoluta (R-25, D-0063).`),
]

/**
 * Regla local, sin dependencias: un import relativo no puede resolver fuera de `raiz`
 * (relativa a este archivo). Cubre import, export-from e import() con literal.
 */
const sinSalirDe = {
  meta: { type: 'problem', schema: [{ type: 'string' }] },
  create(context) {
    const raiz = resolve(import.meta.dirname, context.options[0])
    const revisar = (node) => {
      const fuente = node.source
      if (fuente?.type !== 'Literal' || typeof fuente.value !== 'string' || !fuente.value.startsWith('.')) return
      const destino = relative(raiz, resolve(dirname(context.filename), fuente.value))
      if (destino.startsWith('..') || resolve(destino) === destino) {
        context.report({ node: fuente, message: `Un import relativo no sale de ${context.options[0]} (R-25, D-0063).` })
      }
    }
    return {
      ImportDeclaration: revisar,
      ExportNamedDeclaration: revisar,
      ExportAllDeclaration: revisar,
      ImportExpression: revisar,
    }
  },
}

/**
 * Un contexto no importa nada del workspace: ni `@del-campo/*` (Broker u otro contexto)
 * ni una ruta relativa que salga de su `src/`. Dentro de `src/` las capas están a un
 * nivel (`src/domain`, `src/persistence`, `src/application`), así que un especificador
 * con dos segmentos `..` en cualquier posición —no solo al principio: `./../../x` o
 * `../domain/../../x` también salen— ya no está en `src/`. Además se prohíbe por
 * segmento llegar a `packages/`, `apps/` o `contexts/`, como en la regla de Broker.
 * (Hallazgo A2 de la revisión ciega de T-0024.)
 */
const contextoAislado = (contexto) => [
  ...prohibirImports('/^@del-campo\\x2F/', `${contexto} no importa otros paquetes del workspace (R-25, D-0063).`),
  ...prohibirImports('/(^|\\x2F)\\.\\.\\x2F(.*\\x2F)?\\.\\.(\\x2F|$)/', `${contexto} no importa fuera de su src/ (R-25, D-0063).`),
  ...prohibirImports('/(^|\\x2F)(packages|apps|contexts)\\x2F/', `${contexto} no importa Broker ni otro contexto por ruta (R-25, D-0063).`),
  ...prohibirImports('/^\\x2F/', `${contexto} no importa por ruta absoluta (R-25, D-0063).`),
]

/** Un límite dirigido: `desde` no puede importar ninguno de `prohibidos`. */
const limite = (desde, prohibidos, motivo) => ({
  'no-restricted-imports': [
    'error',
    {
      paths: prohibidos.map((nombre) => ({
        name: nombre,
        message: `${desde} no importa ${nombre}: ${motivo} (R-25).`,
      })),
      patterns: prohibidos.map((nombre) => ({
        group: [`${nombre}/*`],
        message: `${desde} no importa ${nombre}: ${motivo} (R-25).`,
      })),
    },
  ],
})

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.worktrees/**',
      // Artefactos de build de Next.js: código generado, no código del repositorio.
      // Lintearlos haría fallar `pnpm lint` según si alguien construyó antes o no,
      // que es la peor propiedad posible para un guardrail.
      '**/.next/**',
      'Claude outputs/**',
      'data/**',
      // Código descartable de spikes, fuera del workspace y del tsconfig raíz: no es
      // código del producto y R-25 no lo alcanza. Se chequea con `tsc -p SPIKES/<id>`.
      'SPIKES/**',
      // El arnés de Project OS y sus copias en REVIEWS son .mjs anteriores a este
      // workspace: no están en el programa de TypeScript y R-25 no los alcanza.
      '**/*.mjs',
      // …salvo dentro de la app y del contexto de communication, que no tienen .mjs
      // propios: uno nuevo ahí se lintea con sus límites, y como no está en ningún
      // tsconfig, falla. Sin esto, un .mjs saltaba R-25 (hallazgo C3 de T-0025).
      '!apps/communication/**/*.mjs',
      '!contexts/communication/**/*.mjs',
    ],
  },

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // `describe` e `it` del runner nativo devuelven una promesa que el propio runner
      // espera. Marcarlas con `void` en cada línea sería ruido que entrena a ignorar la
      // regla; declararlas seguras deja la regla intacta para las promesas de verdad.
      // El tsconfig ya trata el guión bajo inicial como "a propósito sin usar"
      // (`noUnusedParameters`). Sin esta línea, ESLint y TypeScript discrepan según la
      // posición del parámetro: en `vs01/queries.ts` el `_principal` inicial no se
      // reporta porque hay parámetros usados después, y en `vs01/batch.ts`, donde es el
      // único, sí. La marca de R-25 —que un caso de uso no corre sin `Principal`— tiene
      // que poder escribirse igual en los dos.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all' },
      ],

      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            { from: 'package', package: 'node:test', name: ['describe', 'it', 'test'] },
          ],
        },
      ],
    },
  },

  // ── R-25, D-0063 · Broker no importa contextos ────────────────────────────
  // Va antes del bloque de packages/domain: ese bloque redefine no-restricted-syntax y,
  // en flat config, el último gana. Por eso domain repite esta lista en el suyo.
  // La app de un contexto (apps/communication) tiene su propio bloque, más abajo: D-0063
  // le permite importar su contexto. Toda otra app, presente o futura, queda acá.
  {
    files: ['packages/**/*.ts', 'apps/**/*.{ts,tsx}'],
    ignores: ['apps/communication/**'],
    rules: {
      'no-restricted-syntax': ['error', ...brokerNoImportaContextos],
    },
  },

  // ── R-25 · packages/domain no importa nada ────────────────────────────────
  {
    files: ['packages/domain/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...noBareImports('packages/domain'), ...brokerNoImportaContextos],
    },
  },

  // ── R-25 · packages/db no importa api ─────────────────────────────────────
  {
    files: ['packages/db/src/**/*.ts'],
    rules: limite('packages/db', ['@del-campo/api', '@del-campo/web'],
      'la persistencia no conoce a quien la consume'),
  },

  // ── R-25 · apps/web no importa db directamente ────────────────────────────
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: limite('apps/web', ['@del-campo/db'],
      'la web pasa por api, no por la base'),
  },

  // ── R-25, D-0063 · contexts/communication ─────────────────────────────────
  // Tres bloques en orden de especificidad; cada uno repite la lista del anterior porque
  // redefine la misma regla. domain no importa nada fuera de domain; persistence no
  // importa application; application es lo único que el paquete exporta (package.json).
  {
    files: ['contexts/communication/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...contextoAislado('contexts/communication')],
    },
  },
  {
    files: ['contexts/communication/src/persistence/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...contextoAislado('contexts/communication'),
        ...prohibirImports('/(^|\\x2F)application\\x2F/', 'persistence no importa application (D-0063).'),
      ],
    },
  },
  {
    files: ['contexts/communication/src/domain/**/*.{ts,tsx}'],
    // Los tests de domain importan node:test y node:assert. No son código de dominio:
    // quedan bajo el bloque general del contexto, que igual les prohíbe salir de él.
    ignores: ['contexts/communication/src/domain/**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...contextoAislado('contexts/communication'),
        ...noBareImports('contexts/communication/src/domain'),
        ...prohibirImports('/(^|\\x2F)(persistence|application)\\x2F/', 'domain no importa nada fuera de domain (D-0063).'),
      ],
    },
  },

  // ── R-25, D-0063 · apps/communication (T-0025) ──────────────────────────
  // Puede importar: @del-campo/communication (solo la raíz), next, react, react-dom,
  // node:* y relativos dentro de apps/communication. Nada más del workspace.
  {
    files: ['apps/communication/**/*.{ts,tsx,js,mjs}'],
    plugins: { local: { rules: { 'sin-salir-de': sinSalirDe } } },
    rules: {
      'no-restricted-syntax': ['error', ...appDeContexto('communication')],
      'local/sin-salir-de': ['error', 'apps/communication'],
    },
  },

  // El config de ESLint es JS y no está en el programa de TypeScript.
  {
    files: ['eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
)
