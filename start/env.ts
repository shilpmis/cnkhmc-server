/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | DigitalOcean Spaces (S3 compatible) Configuration
  |----------------------------------------------------------
  */
  DO_SPACES_KEY: Env.schema.string.optional(),
  DO_SPACES_SECRET: Env.schema.string.optional(),
  DO_SPACES_ENDPOINT: Env.schema.string.optional(),
  DO_SPACES_BUCKET: Env.schema.string.optional(),
  DO_SPACES_REGION: Env.schema.string.optional(),
  DO_SPACES_CDN_URL: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Kavacha file encryption (see app/services/kavacha_cipher.ts)
  |----------------------------------------------------------
  | KAVACHA_KEYRING is JSON: {"1":"<base64 of 32 random bytes>"}. Add a new version to rotate.
  */
  KAVACHA_KEYRING: Env.schema.string.optional(),
  KAVACHA_ACTIVE_VERSION: Env.schema.number.optional(),
  KAVACHA_INDEX_VERSION: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Database connection limits (one bug must not flood MySQL)
  |----------------------------------------------------------
  */
  DB_POOL_MIN: Env.schema.number.optional(),
  DB_POOL_MAX: Env.schema.number.optional(),
  DB_QUERY_TIMEOUT_MS: Env.schema.number.optional(),
  PUBLIC_API_URL: Env.schema.string.optional(),
})
