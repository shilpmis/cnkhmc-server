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
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      },
      pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig