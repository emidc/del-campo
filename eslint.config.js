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
      'Claude outputs/**',
      'data/**',
      'scripts/**', // arnés de Project OS, anterior a este workspace y fuera de R-25
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
  },

  // ── R-25 · packages/domain no importa nada ────────────────────────────────
  {
    files: ['packages/domain/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...noBareImports('packages/domain')],
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

  // El config de ESLint es JS y no está en el programa de TypeScript.
  {
    files: ['eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
)
