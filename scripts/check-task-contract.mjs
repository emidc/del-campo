#!/usr/bin/env node
// Congela el contrato de toda tarea existente que una rama modifique (## Why, ## Outcome,
// ## Non-scope, ## Verification, ## Data effects, y en el frontmatter id, kind, workstream,
// que riskClass no baje y que contextRefs no pierda referencias) contra su versión en el
// merge-base. T-0005, ampliado por T-0043: marcar una casilla está permitido; cambiar el
// contrato exige una rama amend/T-xxxx-… que sólo toque esa tarea.
//
// El nombre de rama NO se lee de una variable de entorno de GitHub Actions: en un
// evento pull_request, GITHUB_REF_NAME es "refs/pull/N/merge", no el nombre de la rama
// (el nombre está en github.head_ref). Este script exige que quien lo invoque se lo pase
// explícito por CHECK_BRANCH_NAME (el workflow lo cablea a github.head_ref); si no se
// pasa, cae a `git rev-parse --abbrev-ref HEAD` para uso local, nunca a GITHUB_REF_NAME.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

export const FROZEN_SECTIONS = ['## Why', '## Outcome', '## Non-scope', '## Verification',
  '## Data effects']
// Prefijos de rama admitidos sin task id. Ya no eximen del congelamiento: el control mira
// toda tarea existente que la rama modifique, se llame como se llame la rama (T-0043).
export const NO_TASK_PREFIXES = ['docs/', 'chore/', 'amend/']
const TASK_BRANCH = /^task\/(T-\d{4})-/
// Una enmienda aprobada vive en una rama propia que sólo toca el archivo de la tarea, para
// que el owner la vea y la mergee separada de cualquier implementación.
const AMEND_BRANCH = /^amend\/(T-\d{4})-/
const RISK_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 }

// Un header sólo cuenta si no está dentro de un bloque de código. Se compara byte a
// byte el contenido entre headers, así que CRLF se conserva tal cual venga: no se
// normaliza nada acá, sólo se reconoce correctamente dónde empieza y termina cada línea.
export function splitSections(text) {
  const lines = text.split(/(?<=\n)/)
  let inFence = false
  const sections = []
  let current = null
  for (const line of lines) {
    const trimmed = line.replace(/\r?\n$/, '')
    if (/^\s*```/.test(trimmed)) {
      inFence = !inFence
      current?.content.push(line)
      continue
    }
    if (!inFence && /^## /.test(trimmed)) {
      current = { name: trimmed.trim(), content: [] }
      sections.push(current)
      continue
    }
    current?.content.push(line)
  }
  return sections.map((section) => ({ name: section.name, content: section.content.join('') }))
}

// null: la sección no existe. '': la sección existe pero está vacía. Las dos cosas son
// distintas y no deben compararse como iguales.
export function getSection(text, name) {
  const section = splitSections(text).find((candidate) => candidate.name === name)
  return section ? section.content : null
}

export function checkBranchName(branchName) {
  const match = branchName.match(TASK_BRANCH)
  if (match) return { ok: true, taskId: match[1] }
  const amend = branchName.match(AMEND_BRANCH)
  if (amend) return { ok: true, taskId: null, amendId: amend[1] }
  if (NO_TASK_PREFIXES.some((prefix) => branchName.startsWith(prefix)))
    return { ok: true, taskId: null }
  return {
    ok: false,
    taskId: null,
    error: `rama "${branchName}" no sigue task/T-xxxx-descripcion-corta (R-29) ni lleva un prefijo admitido (${NO_TASK_PREFIXES.join(', ')})`,
  }
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' })
}

function findTaskFileAtRef(taskId, ref) {
  let listing
  try {
    listing = git(['ls-tree', '-r', '--name-only', ref, '--', 'TASKS/'])
  } catch {
    return null
  }
  return listing.split('\n').find((file) => file.startsWith(`TASKS/${taskId}-`)) ?? null
}

function findTaskFileInWorkingTree(taskId) {
  if (!existsSync('TASKS')) return null
  const file = readdirSync('TASKS').find((name) => name.startsWith(`${taskId}-`))
  return file ? join('TASKS', file) : null
}

function readAtRef(ref, path) {
  return git(['show', `${ref}:${path}`])
}

// Marcar una casilla no cambia el contrato: `- [x] texto` se compara como `- [ ] texto`.
// Sólo fuera de bloques de código, para que un literal dentro de un comando no se
// normalice. El texto de la casilla sigue congelado.
export function normalizeChecks(text) {
  let inFence = false
  return text.split(/(?<=\n)/).map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      return line
    }
    return inFence ? line : line.replace(/^(\s*[-*] )\[[xX]\]( )/, '$1[ ]$2')
  }).join('')
}

export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!match) return null
  try {
    return parse(match[1]) ?? {}
  } catch {
    return null
  }
}

// Compara el contrato de una tarea entre la base y la rama. Devuelve los errores.
export function compareContract(baseText, headText, label) {
  const errors = []
  for (const section of FROZEN_SECTIONS) {
    const baseSection = getSection(baseText, section)
    const headSection = getSection(headText, section)
    if (baseSection === null && headSection === null) continue
    if (baseSection === null || headSection === null ||
        normalizeChecks(baseSection) !== normalizeChecks(headSection))
      errors.push(`${label}: la sección "${section}" difiere de su versión en la base`)
  }

  const base = parseFrontmatter(baseText)
  const head = parseFrontmatter(headText)
  if (!base || !head) {
    errors.push(`${label}: no se pudo leer el frontmatter para compararlo`)
    return errors
  }
  for (const field of ['id', 'kind', 'workstream']) {
    if (base[field] !== head[field])
      errors.push(`${label}: "${field}" cambió de ${base[field]} a ${head[field]}`)
  }
  if ((RISK_RANK[head.riskClass] ?? -1) < (RISK_RANK[base.riskClass] ?? -1))
    errors.push(`${label}: "riskClass" bajó de ${base.riskClass} a ${head.riskClass}; sólo puede subir`)
  const headRefs = new Set(Array.isArray(head.contextRefs) ? head.contextRefs : [])
  for (const ref of Array.isArray(base.contextRefs) ? base.contextRefs : []) {
    if (!headRefs.has(ref)) errors.push(`${label}: "contextRefs" quitó ${ref}; sólo se pueden agregar referencias`)
  }
  return errors
}

function changedTaskFiles(mergeBase) {
  // Renombres como borrado + alta, para mirar el origen y el destino.
  const out = git(['diff', '--name-status', '--no-renames', mergeBase, 'HEAD', '--', 'TASKS/'])
  return out.split('\n').filter(Boolean).map((line) => {
    const [status, path] = line.split('\t')
    return { status, path }
  }).filter(({ path }) => path.endsWith('.md') && !path.endsWith('_TEMPLATE.md'))
}

export function run({ branchName, baseRef } = {}) {
  const errors = []

  branchName ??= process.env.CHECK_BRANCH_NAME
  if (!branchName) {
    try {
      branchName = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim()
    } catch (error) {
      return { ok: false, errors: [`no se pudo determinar el nombre de la rama: ${error.message}`] }
    }
  }

  const branchCheck = checkBranchName(branchName)
  if (!branchCheck.ok) return { ok: false, errors: [branchCheck.error] }

  baseRef ??= process.env.CHECK_BASE_REF ?? 'origin/main'

  let mergeBase
  try {
    mergeBase = git(['merge-base', baseRef, 'HEAD']).trim()
  } catch (error) {
    errors.push(`no se pudo calcular el merge-base contra "${baseRef}": ${error.message.trim()} — ¿checkout shallow sin fetch-depth: 0?`)
    return { ok: false, errors }
  }

  if (branchCheck.taskId) {
    const baseFile = findTaskFileAtRef(branchCheck.taskId, mergeBase)
    if (!baseFile) {
      errors.push(`la rama declara ${branchCheck.taskId} pero TASKS/${branchCheck.taskId}-*.md no existe en el merge-base (${mergeBase}): la tarea debe estar en main antes de implementarla`)
      return { ok: false, errors }
    }
    if (!findTaskFileInWorkingTree(branchCheck.taskId)) {
      errors.push(`TASKS/${branchCheck.taskId}-*.md existe en el merge-base (${baseFile}) pero no en la rama`)
      return { ok: false, errors }
    }
  }

  const changes = changedTaskFiles(mergeBase)

  if (branchCheck.amendId) {
    const changed = git(['diff', '--name-only', '--no-renames', mergeBase, 'HEAD']).split('\n').filter(Boolean)
    const foreign = changed.filter((path) => !path.startsWith(`TASKS/${branchCheck.amendId}-`))
    if (foreign.length)
      errors.push(`una rama amend/ sólo puede tocar el archivo de ${branchCheck.amendId}; también toca: ${foreign.join(', ')}`)
    return { ok: errors.length === 0, errors }
  }

  for (const { status, path } of changes) {
    if (status === 'A') continue // una tarea nueva todavía no tiene contrato que congelar
    if (status === 'D') {
      errors.push(`${path}: una tarea existente no se borra ni se renombra desde una rama`)
      continue
    }
    errors.push(...compareContract(readAtRef(mergeBase, path), readFileSync(path, 'utf8'), path))
  }

  return { ok: errors.length === 0, errors }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = run()
  for (const error of result.errors) console.error(`error  ${error}`)
  console.log(result.ok ? '✓ contrato de tarea intacto' : `\n✗ ${result.errors.length} error(es)`)
  process.exit(result.ok ? 0 : 1)
}
