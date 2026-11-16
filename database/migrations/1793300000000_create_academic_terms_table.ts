import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Terms of an academic session, per class (year level). Every term has its own timetable, kept as a
 * timetable version linked through timetable_versions.term_id.
 */
export default class extends BaseSchema {
  protected tableName = 'academic_terms'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('academic_year').notNullable()
      table.integer('class_id').unsigned().notNullable()
      table.integer('term_number').unsigned().notNullable()
      table.string('name', 100).notNullable()
      table.date('start_date').notNullable()
      table.date('end_date').notNullable()
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
      table.unique(['academic_year', 'class_id', 'term_number'])
    })

    this.schema.alterTable('timetable_versions', (table) => {
      table.integer('term_id').unsigned().nullable()
    })
  }

  async down() {
    this.schema.alterTable('timetable_versions', (table) => {
      table.dropColumn('term_id')
    })
    this.schema.dropTable(this.tableName)
  }
}
