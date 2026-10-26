import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'mysql',
  connections: {
    mysql: {
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST || env.get('DB_HOST'),
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : env.get('DB_PORT'),
        user: process.env.DB_USER || env.get('DB_USER'),
        password: process.env.DB_PASSWORD || env.get('DB_PASSWORD'),
        database: process.env.DB_DATABASE || env.get('DB_DATABASE'),
        // mysql2 options that Lucid's type definition does not list
        ...({ enableKeepAlive: true, keepAliveInitialDelay: 10000, connectTimeout: 10000 } as object),
      },
      /*
       * Connection limits: one buggy loop must not be able to open hundreds of connections.
       * Keep (instances x DB_POOL_MAX) below the MySQL user's MAX_USER_CONNECTIONS.
       */
      pool: {
        min: Number(process.env.DB_POOL_MIN ?? env.get('DB_POOL_MIN') ?? 2),
        max: Number(process.env.DB_POOL_MAX ?? env.get('DB_POOL_MAX') ?? 10),
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 15000,
        createTimeoutMillis: 10000,
        // Cap how long any single SELECT may run on every new connection (MySQL 8).
        afterCreate: (conn: any, done: (err: Error | null, conn: any) => void) => {
          const ms = Number(process.env.DB_QUERY_TIMEOUT_MS ?? env.get('DB_QUERY_TIMEOUT_MS') ?? 60000)
          conn.query(`SET SESSION max_execution_time = ${Math.trunc(ms)}`, () => done(null, conn))
        },
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig