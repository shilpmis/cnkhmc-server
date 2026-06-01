import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'periods_config'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('class_day_config_id').unsigned().references('id').inTable('class_day_config')
      table.integer('division_id').unsigned().references('id').inTable('divisions')
      table.integer('period_order') // Period 1,2,3...
      table.time('start_time')
      table.time('end_time')
      table.boolean('is_break').defaultTo(false)
      table.integer('subjects_division_masters_id').unsigned().nullable().references('id').inTable('subjects_division_masters').withKeyName('fk_subjects_division_masters_id')
      table.integer('staff_enrollment_id').unsigned().nullable().references('id').inTable('staff_enrollments')
      table.integer('lab_id').unsigned().nullable().references('id').inTable('labs_config').withKeyName('fk_labs_config_id')
      table.boolean('is_pt').defaultTo(false)
      table.boolean('is_free_period').defaultTo(false)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}