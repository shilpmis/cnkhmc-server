import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateAcademicSessionsTable extends BaseSchema {
  protected tableName = 'academic_sessions'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('school_id').unsigned().nullable()
      table.integer('start_year').unsigned().notNullable()
      table.integer('end_year').unsigned().notNullable()
      table.string('start_month', 16).notNullable()
      table.string('end_month', 16).notNullable()
      table.integer('created_by').unsigned().nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Sessions are shared system-wide; the start year is the session id used by the rest of the app.
      table.unique(['start_year'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
