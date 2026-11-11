// T-0052 — Tareas. Como toda consulta de Broker OS, corren por `conDatos`: como
// `broker_app`, con el principal declarado y RLS decidiendo el alcance.

import type { NewTask, TaskDetail, TaskEvent, TaskFilter, TaskStatus, TaskSummary } from '@del-campo/db'
import {
  TASK_STATUSES,
  assignTask,
  changeTaskStatus,
  commentTask,
  createTask,
  getTask,
  listTaskAssignees,
  listTasks,
} from '@del-campo/db'

import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'

export type { NewTask, TaskDetail, TaskEvent, TaskFilter, TaskStatus, TaskSummary }
export { TASK_STATUSES }

export const ESTADOS_DE_TAREA: Readonly<Record<TaskStatus, string>> = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En curso',
  TRABADA: 'Trabada',
  EN_REVISION: 'En revisión',
  HECHA: 'Hecha',
}

export const esEstadoDeTarea = (valor: unknown): valor is TaskStatus =>
  typeof valor === 'string' && (TASK_STATUSES as readonly string[]).includes(valor)

export const tareas = async (principal: Principal, filtro: TaskFilter = {}): Promise<TaskSummary[]> =>
  conDatos(sql(), principal, (ejecutor) => listTasks(ejecutor, filtro))

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

export const responsablesPosibles = async (principal: Principal, parte: string): Promise<{ userId: string; email: string }[]> =>
  conDatos(sql(), principal, (ejecutor) => listTaskAssignees(ejecutor, parte))
