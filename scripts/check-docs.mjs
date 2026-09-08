#!/usr/bin/env node
// Valida decisions.yaml, ADRs y las tareas de TASKS/.
// Usa un parser YAML estándar; la semántica de Project OS vive en este checker.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

const errors = []
const warnings = []
const fail = (message) => errors.push(message)
const warn = (message) => warnings.push(message)

const DECISION_STATUS = ['ACCEPTED', 'PROVISIONAL', 'OPEN', 'SUPERSEDED', 'REJECTED']
const TASK_KIND = ['FEATURE', 'SPIKE', 'POC', 'CHORE', 'MIGRATION', 'REVIEW']
const TASK_STATUS = ['DRAFT', 'READY', 'ACTIVE', 'BLOCKED', 'DONE', 'DROPPED']
const RISK = ['LOW', 'MEDIUM', 'HIGH']
const WORKSTREAM = ['POS', 'BOS', 'MIG']
const REQUIRED_SECTIONS = ['## Why', '## Outcome', '## Non-scope', '## Verification']
const DECISION_ID = /^D-\d{4}$/

let doc = {}
try {
  doc = parse(readFileSync('decisions.yaml', 'utf8')) ?? {}
} catch (error) {
  fail(`decisions.yaml: YAML inválido: ${error.message}`)
}

const decisions = Array.isArray(doc.decisions) ? doc.decisions : []
if (!Array.isArray(doc.decisions)) fail('decisions.yaml: "decisions" debe ser una lista')

const decisionIds = new Set()
const decisionsById = new Map()

for (const decision of decisions) {
  const at = `decisions.yaml/${decision?.id ?? '(sin id)'}`
  for (const field of ['id', 'title', 'status', 'date', 'statement', 'source']) {
    if (!decision?.[field]) fail(`${at}: falta el campo obligatorio "${field}"`)
  }
  if (decision?.id && !DECISION_ID.test(decision.id))
    fail(`${at}: el id debe tener formato estable D-0000; el estado vive solo en "status"`)
  if (decision?.id && decisionIds.has(decision.id)) fail(`${at}: id duplicado`)
  if (decision?.id) {
    decisionIds.add(decision.id)
    decisionsById.set(decision.id, decision)
  }
  if (decision?.status && !DECISION_STATUS.includes(decision.status))
    fail(`${at}: status inválido "${decision.status}"`)
  if (decision?.status === 'PROVISIONAL' && !decision.falsified_by)
    fail(`${at}: PROVISIONAL exige "falsified_by"`)
  if (decision?.status === 'OPEN' && !decision.unblocked_by)
    fail(`${at}: OPEN exige "unblocked_by"`)
  if (decision?.adr && !existsSync(decision.adr))
    fail(`${at}: el ADR referenciado no existe: ${decision.adr}`)
  for (const supersededId of decision?.supersedes ?? []) {
    if (!decisions.some((candidate) => candidate.id === supersededId))
      fail(`${at}: supersede un id inexistente: ${supersededId}`)
  }
}

// Relación bidireccional: decision.adr → archivo y ADR → decision.
const adrFiles = existsSync('DECISIONS')
  ? readdirSync('DECISIONS').filter((file) => file.endsWith('.md') && file !== '0000-template.md')
  : []

for (const file of adrFiles) {
  const path = join('DECISIONS', file)
  const text = readFileSync(path, 'utf8')
  const ids = [...text.matchAll(/\*\*Id en `decisions\.yaml`:\*\*\s+(D-\d{4})/g)].map((match) => match[1])
  if (ids.length !== 1) {
    fail(`${path}: debe declarar exactamente un "Id en decisions.yaml"`)
    continue
  }
  const decision = decisionsById.get(ids[0])
  if (!decision) fail(`${path}: referencia una decisión inexistente: ${ids[0]}`)
  else if (decision.adr !== path)
    fail(`${path}: ${ids[0]} debe declarar adr: ${path} en decisions.yaml`)
}

const taskFiles = existsSync('TASKS')
  ? readdirSync('TASKS').filter((file) => file.endsWith('.md') && file !== '_TEMPLATE.md')
  : []
const taskIds = new Set()
const tasks = []

for (const file of taskFiles) {
  const at = `TASKS/${file}`
  const raw = readFileSync(join('TASKS', file), 'utf8')
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    fail(`${at}: sin frontmatter YAML delimitado por ---`)
    continue
  }

  let frontmatter
  try {
    frontmatter = parse(match[1])
  } catch (error) {
    fail(`${at}: frontmatter YAML inválido: ${error.message}`)
    continue
  }
  const body = match[2]
  tasks.push({ file, fm: frontmatter })

  for (const field of ['id', 'title', 'kind', 'status', 'workstream', 'riskClass', 'contextRefs']) {
    if (frontmatter?.[field] === undefined || frontmatter?.[field] === null)
      fail(`${at}: falta el campo obligatorio "${field}"`)
  }
  if (!Array.isArray(frontmatter?.contextRefs))
    fail(`${at}: "contextRefs" debe ser una lista; puede quedar vacía solo cuando no existe contexto externo`)
  if (frontmatter?.id && taskIds.has(frontmatter.id))
    fail(`${at}: id de tarea duplicado: ${frontmatter.id}`)
  if (frontmatter?.id) taskIds.add(frontmatter.id)
  if (frontmatter?.id && !file.startsWith(frontmatter.id))
    fail(`${at}: el nombre del archivo no empieza con ${frontmatter.id}`)
  if (frontmatter?.kind && !TASK_KIND.includes(frontmatter.kind))
    fail(`${at}: kind inválido "${frontmatter.kind}"`)
  if (frontmatter?.status && !TASK_STATUS.includes(frontmatter.status))
    fail(`${at}: status inválido "${frontmatter.status}"`)
  if (frontmatter?.riskClass && !RISK.includes(frontmatter.riskClass))
    fail(`${at}: riskClass inválido "${frontmatter.riskClass}"`)
  if (frontmatter?.workstream && !WORKSTREAM.includes(frontmatter.workstream))
    fail(`${at}: workstream inválido "${frontmatter.workstream}"`)

  for (const section of REQUIRED_SECTIONS) {
    if (!body.includes(`\n${section}`)) fail(`${at}: falta la sección obligatoria "${section}"`)
  }

  const verification = body.split('\n## Verification')[1]?.split('\n## ')[0] ?? ''
  const hasCommand = /```(?:bash|sh)\n[\s\S]*?\S[\s\S]*?```/.test(verification)
  const hasHumanCheck = /- \[[ xX]\] \S/.test(verification)
  if (!hasCommand && !hasHumanCheck)
    fail(`${at}: "## Verification" exige al menos un comando o una comprobación humana explícita (R-06)`)

  const nonScope = (body.split('\n## Non-scope')[1]?.split('\n## ')[0] ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()
  if (nonScope.length < 10) fail(`${at}: "## Non-scope" vacío (R-08)`)

  if (['SPIKE', 'POC'].includes(frontmatter?.kind) && !body.includes('\n## Decision unlocked'))
    fail(`${at}: un ${frontmatter.kind} exige la sección "## Decision unlocked"`)
  for (const id of frontmatter?.decisionRefs ?? []) {
    if (!decisionIds.has(id)) fail(`${at}: decisionRefs apunta a un id inexistente: ${id}`)
  }
  if (frontmatter?.riskClass === 'HIGH' && !body.includes('\n## Data effects'))
    warn(`${at}: riskClass HIGH sin sección "## Data effects"`)
}

for (const { file, fm } of tasks) {
  for (const id of fm?.blockedBy ?? []) {
    if (!taskIds.has(id)) fail(`TASKS/${file}: blockedBy apunta a una tarea inexistente: ${id}`)
  }
}

const active = tasks.filter((task) => task.fm?.status === 'ACTIVE')
if (active.length > 2)
  fail(`WIP limit superado: ${active.length} tareas ACTIVE (máximo 2). ${active.map((task) => task.fm.id).join(', ')}`)
const activeSpikes = active.filter((task) => task.fm?.kind === 'SPIKE')
if (activeSpikes.length > 1) fail(`WIP limit superado: ${activeSpikes.length} spikes ACTIVE (máximo 1)`)

for (const file of ['PROJECT.md', 'DOMAIN.md', 'AGENTS.md', 'CLAUDE.md', 'ENGINEERING_RULES.md']) {
  if (!existsSync(file)) continue
  const text = readFileSync(file, 'utf8')
  for (const ref of text.match(/\bD-\d{4}\b/g) ?? []) {
    if (!decisionIds.has(ref)) fail(`${file}: referencia a una decisión inexistente: ${ref}`)
  }
  if (/\bOPEN-\d{3}\b/.test(text))
    fail(`${file}: contiene un id que codifica estado (OPEN-xxx); usar D-xxxx + status: OPEN`)
}

for (const warning of warnings) console.warn(`aviso  ${warning}`)
for (const error of errors) console.error(`error  ${error}`)
console.log(
  errors.length
    ? `\n✗ ${errors.length} error(es), ${warnings.length} aviso(s)`
    : `\n✓ ${decisions.length} decisiones, ${adrFiles.length} ADRs, ${tasks.length} tareas, ${warnings.length} aviso(s)`,
)
process.exit(errors.length ? 1 : 0)
