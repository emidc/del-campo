import type { NextConfig } from 'next'

const config: NextConfig = {
  // Los paquetes del workspace se publican como TypeScript sin compilar (`exports`
  // apunta a `./src/index.ts`), así que el build de la app los transpila.
  transpilePackages: ['@del-campo/api', '@del-campo/db'],

  // `postgres` usa sockets de Node: no puede pasar por el bundler ni correr en el edge
  // runtime. Dejarlo externo es también la garantía de que la base sólo se toca del lado
  // del servidor.
  serverExternalPackages: ['postgres'],

  // El build sí falla ante un error de tipos. El lint autoritativo, en cambio, es
  // `pnpm lint` en la raíz, que es donde viven los límites de módulo de R-25; Next 16 ya
  // no corre ESLint durante el build, así que no hay una segunda opinión que conciliar.
  typescript: { ignoreBuildErrors: false },
}

export default config
