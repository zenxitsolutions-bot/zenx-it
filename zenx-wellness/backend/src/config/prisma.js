import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import env from './env.js'

const url = new URL(env.databaseUrl)

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ''),
  connectionLimit: 10,
  // MySQL 8 defaults to the caching_sha2_password auth plugin. Over a plain
  // connection the driver must fetch the server's RSA public key to complete
  // the handshake, which it refuses to do unless asked. Behind TLS, or against
  // a server using mysql_native_password, this flag is unnecessary.
  allowPublicKeyRetrieval: true,
})

export const prisma = new PrismaClient({
  adapter,
  log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
})

export default prisma
