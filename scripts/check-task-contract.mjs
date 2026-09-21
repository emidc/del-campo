#!/usr/bin/env node
// Congela el contrato de una tarea (## Why, ## Outcome, ## Non-scope, ## Verification)
// contra su versión en el merge-base. T-0005.
//
// El nombre de rama NO se lee de una variable de entorno de GitHub Actions: en un
// evento pull_request, GITHUB_REF_NAME es "refs/pull/N/merge", no el nombre de la rama
// (el nombre está en github.head_ref). Este script exige que quien lo invoque se lo pase
// explícito por CHECK_BRANCH_NAME (el workflow lo cablea a github.head_ref); si no se
// pasa, cae a `git rev-parse --abbrev-ref HEAD` para uso local, nunca a GITHUB_REF_NAME.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const FROZEN_SECTIONS = ['## Why', '## Outcome', '## Non-scope', '## Verification']
export const EXEMPT_PREFIXES = ['docs/', 'chore/']
const TASK_BRANCH = /^task\/(T-\d{4})-/

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
  if (EXEMPT_PREFIXES.some((prefix) => branchName.startsWith(prefix)))
    return { ok: true, taskId: null }
  return {
    ok: false,
    taskId: null,
    error: `rama "${branchName}" no sigue task/T-xxxx-descripcion-corta (R-29) ni lleva un prefijo exento (${EXEMPT_PREFIXES.join(', ')})`,
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
  if (!branchCheck.taskId) return { ok: true, errors: [] }

  const taskId = branchCheck.taskId
  baseRef ??= process.env.CHECK_BASE_REF ?? 'origin/main'

  let mergeBase
  try {
    mergeBase = git(['merge-base', baseRef, 'HEAD']).trim()
  } catch (error) {
    errors.push(`no se pudo calcular el merge-base contra "${baseRef}": ${error.message.trim()} — ¿checkout shallow sin fetch-depth: 0?`)
    return { ok: false, errors }
  }

  const baseFile = findTaskFileAtRef(taskId, mergeBase)
  if (!baseFile) {
    errors.push(`la rama declara ${taskId} pero TASKS/${taskId}-*.md no existe en el merge-base (${mergeBase}): la tarea debe estar en main antes de implementarla`)
    return { ok: false, errors }
  }

  const headFile = findTaskFileInWorkingTree(taskId)
  if (!headFile) {
    errors.push(`TASKS/${taskId}-*.md existe en el merge-base (${baseFile}) pero no en la rama`)
    return { ok: false, errors }
  }

  const baseText = readAtRef(mergeBase, baseFile)
  const headText = readFileSync(headFile, 'utf8')

  for (const section of FROZEN_SECTIONS) {
    const baseSection = getSection(baseText, section)
    const headSection = getSection(headText, section)
    if (baseSection !== headSection)
      errors.push(`${headFile}: la sección "${section}" difiere de su versión en el merge-base (${mergeBase})`)
  }

  return { ok: errors.length === 0, errors }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = run()
  for (const error of result.errors) console.error(`error  ${error}`)
  console.log(result.ok ? '✓ contrato de tarea intacto' : `\n✗ ${result.errors.length} error(es)`)
  process.exit(result.ok ? 0 : 1)
}
