import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_certificate_logs'

  async up() {
    const hasTable = await this.schema.hasTable(this.tableName)
    if (!hasTable) {
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')
        table.integer('student_id').unsigned().notNullable()
        table.string('certificate_type', 100).notNullable()
        table.string('reference_no', 255).nullable()
        table.string('certificate_date', 50).nullable()
        table.string('file_name', 255).notNullable()
        table.text('file_url').notNullable()
        table.string('file_type', 20).defaultTo('doc')
        table.integer('generation_number').unsigned().defaultTo(1)
        table.integer('generated_by').unsigned().nullable()
        table.json('metadata').nullable()

        table.timestamp('created_at', { useTz: true }).notNullable()
        table.timestamp('updated_at', { useTz: true }).notNullable()

        table.index(['student_id', 'certificate_type'])
      })
    }
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
