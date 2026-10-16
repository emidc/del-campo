// Las organizaciones (la página de entrada) y el login, que no muestra datos.

import type { ReactElement } from 'react'

import type { Organizacion } from '@del-campo/risk'

import { h, marco, tabla, th, vacio } from './comun.ts'

const OBJETOS: Readonly<Record<string, string>> = { riesgo: 'riesgos', sub_riesgo: 'sub-riesgos', padre: 'padres', escenario: 'escenarios' }

export const PaginaOrganizaciones = (os: readonly Organizacion[], persona: string): ReactElement =>
  marco('Organizaciones', { activa: 'organizaciones', persona },
    h('p', { className: 'muted' }, 'Cada vista es de una sola organización: nada se ordena ni se compara entre organizaciones.'),
    os.length === 0 ? vacio('No hay organizaciones con riesgos registrados.') :
      tabla([th('Organización'), th('Objetos'), th('Referencias'), th('Orden previo')], os.map((o) =>
        h('tr', { 'data-organizacion': o.organizacionId },
          h('td', null, h('a', { href: `/o/${encodeURIComponent(o.organizacionId)}` }, o.organizacionId)),
          h('td', null, Object.entries(o.objetos).filter(([, n]) => n > 0).map(([t, n]) => `${String(n)} ${OBJETOS[t] ?? t}`).join(', ')),
          h('td', null, o.referencias.join(', ') || '—'),
          h('td', null, h('a', { href: `/o/${encodeURIComponent(o.organizacionId)}/orden-previo` }, 'registrar sin ver resultados'))))))

export const PaginaLogin = (configurada: boolean, error: boolean): ReactElement =>
  h('main', null,
    configurada
      ? h('form', { className: 'login', method: 'post', action: '/api/login' },
        h('h1', null, 'Risk OS'),
        error ? h('p', { className: 'aviso' }, 'Usuario o contraseña incorrectos.') : null,
        h('label', null, 'Usuario', h('input', { name: 'usuario', autoComplete: 'username', required: true })),
        h('label', null, 'Contraseña', h('input', { name: 'contrasena', type: 'password', autoComplete: 'current-password', required: true })),
        h('button', { type: 'submit' }, 'Entrar'))
      : h('p', { className: 'aviso' }, 'La UI no está configurada: falta el secreto de sesión o la base.'))
