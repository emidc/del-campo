#!/usr/bin/env node
// Exige un reporte de revisión en REVIEWS/ cuando el diff toca permisos o seguridad
// (R-33, D-0089): identidad y autorización, controles de acceso de las apps, guardrails de
// los agentes y los propios validadores. El kind de la tarea ya no la exige: una FEATURE
// o una migración sin rutas de esta lista entra con tests en verde.
//
// Lo que comprueba es estructural: que la rama agregue o modifique un archivo de REVIEWS/
// cuyo path nombre la tarea. Qué dice el reporte lo lee una persona. La lista no exime: un
// cambio de seguridad fuera de ella lo puede escalar el revisor o el owner.

import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Cada entrada: [área, expresión sobre el path relativo a la raíz].
export const SENSITIVE = [
  ['identidad y autorización', /^packages\/identidad\//],
  ['identidad y autorización', /^packages\/api\/src\/(session|acceso)\//],
  ['controles de acceso de las apps',
    /^apps\/[^/]+\/src\/lib\/(acceso|auth|entrada|entre-contextos|guard|identidad|modo|page-guard|permisos|sesion|handlers|server|jobs|criterios)(\.[^/]*)?\.ts$/],
  ['controles de acceso de las apps', /(^|\/)deny\.test\.ts$/],
  ['guardrails', /^\.(claude|codex|gemini|agents)\//],
  ['guardrails', /^\.github\/workflows\//],
  ['validadores', /^scripts\/check-[^/]+\.mjs$/],
  ['validadores', /^scripts\/guard-db-tests\.mjs$/],
  ['validadores', /^scripts\/tests\//],
  ['validadores', /^eslint\.config\.js$/],
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

  // Las tareas en juego: la de la rama y toda tarea que el diff toque.
  const branchId = branchName.match(/\b(T-\d{4})\b/)?.[1] ?? null
  const touchedIds = changes.map(({ path }) => path.match(/^TASKS\/(T-\d{4})-/)?.[1]).filter(Boolean)
  const taskIds = [...new Set([branchId, ...touchedIds].filter(Boolean))]
  const reviewFor = (id) => changes.find(({ status, path }) =>
    status !== 'D' && path.startsWith('REVIEWS/') && path.includes(id))?.path ?? null

  const errors = []
  const reasons = []
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
    ? (result.review ? `✓ revisión presente: ${result.review}`
      : `✓ el diff no exige revisión${result.reasons.length ? ` (${result.reasons.join('; ')})` : ''}`)
    : `\n✗ ${result.errors.length} error(es)`)
  process.exit(result.ok ? 0 : 1)
}
