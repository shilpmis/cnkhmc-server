import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'akshaya_patras'
  protected logTableName = 'akshaya_patra_access_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('uuid', 36).notNullable().unique()
      table.integer('school_id').unsigned().notNullable()
      table.string('category', 40).notNullable()
      table.string('owner_type', 20).nullable()
      table.integer('owner_id').unsigned().nullable()
      table.string('object_key', 500).notNullable()
      table.string('original_name', 255).nullable()
      table.string('content_type', 120).nullable()
      table.bigInteger('size_bytes').unsigned().notNullable().defaultTo(0)
      table.string('plaintext_sha256', 64).notNullable()
      table.string('wrapped_key', 255).notNullable()
      table.string('iv', 64).notNullable()
      table.string('tag', 64).notNullable()
      table.string('salt', 96).notNullable()
      table.integer('key_version').unsigned().notNullable()
      table.boolean('is_cloud').notNullable().defaultTo(true)
      table.integer('uploaded_by').unsigned().nullable()
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['school_id', 'category'])
      table.index(['owner_type', 'owner_id'])
    })

    this.schema.createTable(this.logTableName, (table) => {
      table.increments('id')
      table.integer('file_id').unsigned().notNullable()
      table.integer('school_id').unsigned().nullable()
      table.integer('user_id').unsigned().nullable()
      table.string('action', 30).notNullable()
      table.string('via', 20).notNullable()
      table.string('ip_address', 64).nullable()
      table.timestamp('created_at')

      table.index(['file_id'])
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.logTableName)
    this.schema.dropTable(this.tableName)
  }
}
