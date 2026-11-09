#!/usr/bin/env node
// Exige un reporte de revisión ciega en REVIEWS/ cuando el diff lo pide (R-33, T-0043).
//
// Dispara la exigencia:
//   - una tarea FEATURE o MIGRATION en una rama task/T-xxxx-… (D-0052), o
//   - un diff que toca una ruta sensible (SENSITIVE), sea cual sea el kind o el riesgo
//     declarado: la etiqueta la escribe quien implementa, el diff no.
//
// Lo que comprueba es estructural: que la rama agregue o modifique un archivo de REVIEWS/
// cuyo path nombre la tarea. Que el revisor haya estado aislado no se puede observar desde
// acá; eso sigue siendo del procedimiento de R-33. La lista no exime: un cambio sensible
// fuera de ella lo puede escalar el revisor o el owner.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Cada entrada: [área, expresión sobre el path relativo a la raíz].
export const SENSITIVE = [
  ['migraciones', /^packages\/db\/migrations\//],
  ['migraciones', /^contexts\/[^/]+\/migrations\//],
  ['identidad y autorización', /^packages\/identidad\//],
  ['identidad y autorización', /^packages\/api\/src\/(session|acceso)\//],
  ['controles de acceso de las apps',
    /^apps\/[^/]+\/src\/lib\/(acceso|auth|entrada|entre-contextos|guard|identidad|modo|page-guard|permisos|sesion)(\.[^/]*)?\.ts$/],
  ['endpoints y webhook', /^apps\/[^/]+\/src\/app\/(api|webhook)\//],
  ['operaciones y persistencia', /^contexts\/[^/]+\/src\/(application|persistence)\//],
  ['operaciones y persistencia', /^packages\/db\/src\/import\//],
  ['integraciones externas', /^contexts\/[^/]+\/src\/integration\//],
  ['guardrails', /^\.(claude|codex|gemini|agents)\//],
  ['guardrails', /^\.github\/workflows\//],
  ['validadores', /^scripts\/check-[^/]+\.mjs$/],
  ['validadores', /^scripts\/guard-db-tests\.mjs$/],
  ['validadores', /^eslint\.config\.js$/],
  ['validadores', /^(package\.json|tsconfig\.json|apps\/[^/]+\/tsconfig\.json)$/],
]

// Un archivo nuevo en un directorio de controles de acceso también cuenta, aunque su
// nombre todavía no figure arriba.
const NEW_FILE_AREAS = [['controles de acceso de las apps', /^apps\/[^/]+\/src\/lib\/[^/]+\.ts$/]]

export function sensitiveArea(path, status = 'M') {
  for (const [area, pattern] of SENSITIVE) if (pattern.test(path)) return area
  if (status === 'A') for (const [area, pattern] of NEW_FILE_AREAS) if (pattern.test(path)) return area
  return null
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' })
}

function taskKind(taskId) {
  const listing = git(['ls-files', 'TASKS/'])
  const file = listing.split('\n').find((path) => path.startsWith(`TASKS/${taskId}-`))
  if (!file) return null
  return readFileSync(file, 'utf8').match(/^kind:\s*(\w+)/m)?.[1] ?? null
}

export function run({ branchName, baseRef } = {}) {
  branchName ??= process.env.CHECK_BRANCH_NAME ?? git(['rev-parse', '--abbrev-ref', 'HEAD']).trim()
  baseRef ??= process.env.CHECK_BASE_REF ?? 'origin/main'

  let mergeBase
  try {
    mergeBase = git(['merge-base', baseRef, 'HEAD']).trim()
  } catch (error) {
    return { ok: false, errors: [`no se pudo calcular el merge-base contra "${baseRef}": ${error.message.trim()}`] }
  }

  const changes = git(['diff', '--name-status', '--no-renames', mergeBase, 'HEAD'])
    .split('\n').filter(Boolean).map((line) => {
      const [status, path] = line.split('\t')
      return { status, path }
    })

  const taskId = branchName.match(/\b(T-\d{4})\b/)?.[1] ?? null
  const reasons = []
  for (const { status, path } of changes) {
    const area = sensitiveArea(path, status)
    if (area) reasons.push(`${path} (${area})`)
  }
  const kind = taskId ? taskKind(taskId) : null
  if (kind === 'FEATURE' || kind === 'MIGRATION') reasons.unshift(`${taskId} es ${kind} (D-0052)`)

  if (!reasons.length) return { ok: true, errors: [], reasons }

  if (!taskId)
    return {
      ok: false,
      reasons,
      errors: [`el diff exige revisión ciega pero la rama "${branchName}" no nombra una tarea T-xxxx: ${reasons.join('; ')}`],
    }

  const review = changes.find(({ status, path }) =>
    status !== 'D' && path.startsWith('REVIEWS/') && path.includes(taskId))
  if (review) return { ok: true, errors: [], reasons, review: review.path }

  return {
    ok: false,
    reasons,
    errors: [`el diff exige revisión ciega (R-33) y no agrega ni modifica un reporte en REVIEWS/ que nombre ${taskId}. Motivos: ${reasons.join('; ')}`],
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = run()
  for (const error of result.errors) console.error(`error  ${error}`)
  console.log(result.ok
    ? (result.reasons.length ? `✓ revisión ciega presente: ${result.review}` : '✓ el diff no exige revisión ciega')
    : `\n✗ ${result.errors.length} error(es)`)
  process.exit(result.ok ? 0 : 1)
}
