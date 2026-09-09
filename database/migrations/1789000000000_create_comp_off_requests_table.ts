import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'comp_off_requests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('uuid', 36).notNullable().unique()
      table.integer('staff_id').unsigned().references('id').inTable('staff').onDelete('CASCADE')
      table.integer('school_id').unsigned().references('id').inTable('schools').onDelete('CASCADE')
      table.integer('academic_year').nullable()
      table.date('worked_date').notNullable()
      table.enum('day_type', ['full_day', 'half_day']).defaultTo('full_day').notNullable()
      table.decimal('credited_days', 4, 2).defaultTo(1.0).notNullable()
      table.string('reason', 255).notNullable()
      table.text('description').nullable()
      table.enum('status', ['pending', 'approved', 'rejected', 'cancelled']).defaultTo('pending').notNullable()
      table.integer('approved_by').unsigned().references('id').inTable('users').onDelete('SET NULL').nullable()
      table.text('admin_remarks').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
