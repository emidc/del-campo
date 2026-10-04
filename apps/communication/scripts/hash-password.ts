// Genera el valor de COMMUNICATION_UI_PASSWORD_HASH (D-0066). Lo corre el owner, que es
// quien genera y carga la credencial (R-16): la contraseña se lee de stdin, sin eco en
// una terminal, y no queda en el historial de la shell ni en un argumento del proceso.
//
//   node apps/communication/scripts/hash-password.ts
//   openssl rand -base64 24 | node apps/communication/scripts/hash-password.ts
//
// Rechaza contraseñas de menos de 20 caracteres. Imprime solo el hash.

import { createInterface } from 'node:readline'

import { hashPassword, MIN_PASSWORD_LENGTH } from '../src/lib/auth.ts'

const readPassword = async (): Promise<string> => {
  const interactive = process.stdin.isTTY
  if (interactive) process.stderr.write(`Contraseña (${String(MIN_PASSWORD_LENGTH)} caracteres o más, aleatoria): `)
  const rl = createInterface({ input: process.stdin, terminal: interactive, output: interactive ? process.stderr : undefined })
  if (interactive) {
    // Sin eco: no se escribe lo que se tipea.
    ;(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => undefined
  }
  for await (const line of rl) {
    rl.close()
    if (interactive) process.stderr.write('\n')
    return line.replace(/\r$/, '')
  }
  return ''
}

try {
  const password = await readPassword()
  process.stdout.write(`${await hashPassword(password)}\n`)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'error'}\n`)
  process.exitCode = 1
}
