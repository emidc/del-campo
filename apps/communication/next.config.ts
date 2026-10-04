import type { NextConfig } from 'next'

const config: NextConfig = {
  // @del-campo/communication se publica como TypeScript sin compilar.
  transpilePackages: ['@del-campo/communication'],

  // `postgres` usa sockets de Node: queda fuera del bundler, y así la base solo se toca
  // del lado del servidor.
  serverExternalPackages: ['postgres'],

  typescript: { ignoreBuildErrors: false },
}

export default config
