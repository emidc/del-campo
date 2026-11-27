// T-0052 — Tareas. Como toda consulta de Broker OS, corren por `conDatos`: como
// `broker_app`, con el principal declarado y RLS decidiendo el alcance.

import type {
  NewTask,
  TaskAction,
  TaskCounts,
  TaskDetail,
  TaskEvent,
  TaskFilter,
  TaskFollowUp,
  TaskPriority,
  TaskStatus,
  TaskSummary,
  TeamMemberProfile,
} from '@del-campo/db'
import {
  PRIORIDADES_DE_TAREA,
  SEGUIMIENTOS_DE_TAREA,
  TASK_FOLLOW_UPS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  assignTask,
  changeTaskStatus,
  clearDoneWeeklyTasks,
  commentTask,
  completeTaskAction,
  countTasks,
  createTask,
  deleteTask,
  getTask,
  involveInTask,
  listTaskAssignees,
  listTasks,
  listTeamMembers,
  renameTask,
  setTaskDueDate,
  setTaskFollowUp,
  setTaskPriority,
  setTaskServiceCase,
  setTaskWeekly,
} from '@del-campo/db'

import type { Conexion } from '../acceso/base.ts'
import { conDatos } from '../acceso/datos.ts'
import { jobDenial } from '../comunicacion/entrada.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

export type { NewTask, TaskAction, TaskCounts, TaskDetail, TaskEvent, TaskFilter, TaskFollowUp, TaskPriority, TaskStatus, TaskSummary, TeamMemberProfile }
export { PRIORIDADES_DE_TAREA, SEGUIMIENTOS_DE_TAREA, TASK_FOLLOW_UPS, TASK_PRIORITIES, TASK_STATUSES }

export const ESTADOS_DE_TAREA: Readonly<Record<TaskStatus, string>> = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En curso',
  TRABADA: 'Bloqueada',
  EN_REVISION: 'En revisión',
  HECHA: 'Hecha',
}

export const esEstadoDeTarea = (valor: unknown): valor is TaskStatus =>
  typeof valor === 'string' && (TASK_STATUSES as readonly string[]).includes(valor)

export const esPrioridadDeTarea = (valor: unknown): valor is TaskPriority =>
  typeof valor === 'string' && (TASK_PRIORITIES as readonly string[]).includes(valor)

export const esSeguimientoDeTarea = (valor: unknown): valor is TaskFollowUp =>
  typeof valor === 'string' && (TASK_FOLLOW_UPS as readonly string[]).includes(valor)

export const tareas = async (principal: Principal, filtro: TaskFilter = {}): Promise<TaskSummary[]> =>
  conDatos(sql(), principal, (ejecutor) => listTasks(ejecutor, filtro))

/** Cuántas tareas muestra cada pestaña de la pantalla Tareas. */
export const conteoDeTareas = async (principal: Principal): Promise<TaskCounts> =>
  conDatos(sql(), principal, (ejecutor) => countTasks(ejecutor))

export const tarea = async (principal: Principal, id: string): Promise<TaskDetail | null> =>
  conDatos(sql(), principal, (ejecutor) => getTask(ejecutor, id))

export const crearTarea = async (principal: Principal, nueva: NewTask): Promise<string> =>
  conDatos(sql(), principal, (ejecutor) => createTask(ejecutor, nueva))

export const comentarTarea = async (principal: Principal, id: string, texto: string): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => commentTask(ejecutor, id, texto))

export const cambiarEstadoTarea = async (
  principal: Principal,
  id: string,
  estado: TaskStatus,
  comentario: string | null,
): Promise<void> => conDatos(sql(), principal, (ejecutor) => changeTaskStatus(ejecutor, id, estado, comentario))

export const pasarTarea = async (
  principal: Principal,
  id: string,
  usuario: string | null,
  comentario: string | null,
): Promise<void> => conDatos(sql(), principal, (ejecutor) => assignTask(ejecutor, id, usuario, comentario))

export const responsablesPosibles = async (principal: Principal, parte: string): Promise<TeamMemberProfile[]> =>
  conDatos(sql(), principal, (ejecutor) => listTaskAssignees(ejecutor, parte))

export const renombrarTarea = async (principal: Principal, id: string, nombre: string): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => renameTask(ejecutor, id, nombre))

export const cambiarVencimientoTarea = async (principal: Principal, id: string, fecha: string | null): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => setTaskDueDate(ejecutor, id, fecha))

export const cambiarPrioridadTarea = async (principal: Principal, id: string, prioridad: TaskPriority | null): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => setTaskPriority(ejecutor, id, prioridad))

export const cambiarSeguimientoTarea = async (
  principal: Principal,
  id: string,
  seguimiento: TaskFollowUp | null,
): Promise<void> => conDatos(sql(), principal, (ejecutor) => setTaskFollowUp(ejecutor, id, seguimiento))

export const involucrarEnTarea = async (principal: Principal, id: string, usuario: string, descripcion: string): Promise<string> =>
  conDatos(sql(), principal, (ejecutor) => involveInTask(ejecutor, id, usuario, descripcion))

export const completarAccionDeTarea = async (principal: Principal, accion: string): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => completeTaskAction(ejecutor, accion))

export const eliminarTarea = async (principal: Principal, id: string): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => deleteTask(ejecutor, id))

export const marcarTareaDeLaSemana = async (principal: Principal, id: string, semanal: boolean): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => setTaskWeekly(ejecutor, id, semanal))

/** Todo el equipo activo: cualquier integrante puede ser responsable de una tarea. */
export const integrantesDelEquipo = async (principal: Principal): Promise<TeamMemberProfile[]> =>
  conDatos(sql(), principal, (ejecutor) => listTeamMembers(ejecutor))

/**
 * Limpieza del tablero semanal. Vercel la llama los lunes a las 03:00 UTC, que son las
 * 00:00 de Mendoza: destilda «Tarea de la semana» en las Hechas. Exige `CRON_SECRET`.
 */
export const tareaDeLimpiezaSemanal = async (
  request: Request,
  env: Readonly<Record<string, string | undefined>> = process.env,
  conexion: () => Conexion = sql,
): Promise<Response> => {
  const denied = jobDenial(request, env)
  if (denied !== null) return denied
  const destildadas = await clearDoneWeeklyTasks(conexion())
  await conexion()`
    insert into audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
    values (null, 'worker', 'task.weekly_clear', null, ${String(destildadas)}, 'ok')`
  return new Response(JSON.stringify({ destildadas }), { headers: { 'content-type': 'application/json' } })
}

export const cambiarGestionTarea = async (principal: Principal, id: string, gestion: string | null): Promise<void> =>
  conDatos(sql(), principal, (ejecutor) => setTaskServiceCase(ejecutor, id, gestion))
