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
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Cada entrada: [área, expresión sobre el path relativo a la raíz].
export const SENSITIVE = [
  ['migraciones', /^packages\/db\/migrations\//],
  ['migraciones', /^contexts\/[^/]+\/migrations\//],
  ['identidad y autorización', /^packages\/identidad\//],
  ['identidad y autorización', /^packages\/api\/src\/(session|acceso)\//],
  ['controles de acceso de las apps',
    /^apps\/[^/]+\/src\/lib\/(acceso|auth|entrada|entre-contextos|guard|identidad|modo|page-guard|permisos|sesion|handlers|server|jobs|criterios)(\.[^/]*)?\.ts$/],
  ['controles de acceso de las apps', /(^|\/)deny\.test\.ts$/],
  ['endpoints y webhook', /^apps\/[^/]+\/src\/app\/(api|webhook)\//],
  ['endpoints y webhook', /^packages\/api\/src\/(http\.ts|vs01\/)/],
  ['migraciones', /^packages\/db\/src\/migraciones\.ts$/],
  ['operaciones y persistencia', /^contexts\/[^/]+\/src\/(application|persistence)\//],
  ['operaciones y persistencia', /^packages\/db\/src\/import\//],
  ['integraciones externas', /^contexts\/[^/]+\/src\/integration\//],
  ['guardrails', /^\.(claude|codex|gemini|agents)\//],
  ['guardrails', /^\.github\/workflows\//],
  ['validadores', /^scripts\/check-[^/]+\.mjs$/],
  ['validadores', /^scripts\/guard-db-tests\.mjs$/],
  ['validadores', /^scripts\/tests\//],
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

// core.quotePath=false: sin esto git cita las rutas con acentos y ningún patrón coincide.
function git(args) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], { encoding: 'utf8' })
}

// El kind de una tarea en un ref, o null si no existe ahí.
function kindAt(ref, taskId) {
  const listing = git(['ls-tree', '-r', '--name-only', ref, '--', 'TASKS/'])
  const file = listing.split('\n').find((path) => path.startsWith(`TASKS/${taskId}-`))
  if (!file) return null
  return git(['show', `${ref}:${file}`]).match(/^kind:\s*(\w+)/m)?.[1] ?? null
}
const NEEDS_REVIEW = new Set(['FEATURE', 'MIGRATION'])

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

  // Las tareas en juego: la de la rama y toda tarea que el diff toque. Una FEATURE o
  // MIGRATION exige revisión por su kind en la base o en la rama, el mayor de los dos: ni
  // el nombre de rama ni una enmienda que baje el kind la eximen.
  const branchId = branchName.match(/\b(T-\d{4})\b/)?.[1] ?? null
  const touchedIds = changes.map(({ path }) => path.match(/^TASKS\/(T-\d{4})-/)?.[1]).filter(Boolean)
  const taskIds = [...new Set([branchId, ...touchedIds].filter(Boolean))]
  const reviewFor = (id) => changes.find(({ status, path }) =>
    status !== 'D' && path.startsWith('REVIEWS/') && path.includes(id))?.path ?? null

  const errors = []
  const reasons = []
  for (const id of taskIds) {
    const kinds = [kindAt(mergeBase, id), kindAt('HEAD', id)].filter(Boolean)
    const kind = kinds.find((k) => NEEDS_REVIEW.has(k))
    if (!kind) continue
    reasons.push(`${id} es ${kind} (D-0052)`)
    if (!reviewFor(id))
      errors.push(`${id} es ${kind} y la rama no agrega ni modifica un reporte en REVIEWS/ que la nombre (R-33)`)
  }

  const sensitive = []
  for (const { status, path } of changes) {
    const area = sensitiveArea(path, status)
    if (area) sensitive.push(`${path} (${area})`)
  }
  if (sensitive.length) {
    reasons.push(...sensitive)
    if (!taskIds.length)
      errors.push(`el diff toca rutas sensibles pero ni la rama "${branchName}" ni el diff nombran una tarea T-xxxx: ${sensitive.join('; ')}`)
    else if (!taskIds.some(reviewFor))
      errors.push(`el diff toca rutas sensibles y no agrega ni modifica un reporte en REVIEWS/ que nombre ${taskIds.join(' o ')} (R-33). Rutas: ${sensitive.join('; ')}`)
  }

  const review = taskIds.map(reviewFor).find(Boolean) ?? null
  return { ok: errors.length === 0, errors, reasons, review }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = run()
  for (const error of result.errors) console.error(`error  ${error}`)
  console.log(result.ok
    ? (result.reasons.length ? `✓ revisión ciega presente: ${result.review}` : '✓ el diff no exige revisión ciega')
    : `\n✗ ${result.errors.length} error(es)`)
  process.exit(result.ok ? 0 : 1)
}
