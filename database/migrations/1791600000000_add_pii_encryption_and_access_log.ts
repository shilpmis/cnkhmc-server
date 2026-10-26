import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Prepares sensitive columns for field-level encryption (see app/services/kavacha_columns.ts):
 *  - widens each column so it can hold ciphertext (BIGINT -> VARCHAR(512), nullable)
 *  - drops the old single-column UNIQUE index (ciphertext is random, so it cannot be unique)
 *  - adds <column>_bidx (keyed hash) with a UNIQUE index that takes over duplicate protection
 * and creates the PII access log table.
 *
 * Existing values stay readable until `node ace kavacha:seal` encrypts them.
 */
const COLUMNS: { table: string; column: string }[] = [
  { table: 'staff', column: 'aadhar_no' },
  { table: 'staff', column: 'pan_card_no' },
  { table: 'staff', column: 'account_no' },
  { table: 'staff', column: 'epf_uan_no' },
  { table: 'students', column: 'aadhar_no' },
  { table: 'students_meta', column: 'aadhar_dise_no' },
  { table: 'students_meta', column: 'account_no' },
]

export default class extends BaseSchema {
  protected logTable = 'pii_access_logs'

  async up() {
    this.defer(async (db) => {
      for (const { table, column } of COLUMNS) {
        // 1. Drop single-column unique indexes on the plain column
        const [indexes] = await db.rawQuery(
          `SELECT INDEX_NAME AS name
             FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY'
            GROUP BY INDEX_NAME
           HAVING COUNT(*) = 1 AND MAX(COLUMN_NAME) = ?`,
          [table, column]
        )
        for (const idx of indexes as { name: string }[]) {
          await db.rawQuery(`ALTER TABLE \`${table}\` DROP INDEX \`${idx.name}\``)
        }

        // 2. Widen to hold ciphertext
        await db.rawQuery(`ALTER TABLE \`${table}\` MODIFY \`${column}\` VARCHAR(512) NULL`)

        // 3. Blind index + unique protection
        const [existing] = await db.rawQuery(
          `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [table, `${column}_bidx`]
        )
        if (!Number((existing as any[])[0].n)) {
          await db.rawQuery(
            `ALTER TABLE \`${table}\`
               ADD COLUMN \`${column}_bidx\` CHAR(64) NULL,
               ADD UNIQUE INDEX \`${table}_${column}_bidx_unique\` (\`${column}_bidx\`)`
          )
        }
      }
    })

    this.schema.createTable(this.logTable, (table) => {
      table.bigIncrements('id')
      table.integer('user_id').unsigned().nullable()
      table.integer('school_id').unsigned().nullable()
      table.integer('role_id').unsigned().nullable()
      table.string('entity', 30).notNullable()
      table.string('action', 20).notNullable()
      table.string('method', 10).notNullable()
      table.string('route', 190).notNullable()
      table.string('resource_id', 64).nullable()
      table.string('query_keys', 255).nullable()
      table.smallint('status').unsigned().nullable()
      table.string('ip_address', 64).nullable()
      table.string('user_agent', 255).nullable()
      table.timestamp('created_at').defaultTo(this.now())

      table.index(['entity', 'resource_id'])
      table.index(['user_id', 'created_at'])
      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.logTable)
    this.defer(async (db) => {
      for (const { table, column } of COLUMNS) {
        await db
          .rawQuery(`ALTER TABLE \`${table}\` DROP INDEX \`${table}_${column}_bidx_unique\`, DROP COLUMN \`${column}_bidx\``)
          .catch(() => {})
      }
    })
  }
}
