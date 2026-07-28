import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  public async up() {
    this.schema.alterTable('lesson_plan_topics', (table) => {
      table.dropForeign(['assigned_staff_id'])
      table.dropColumn('assigned_staff_id')
      table.json('assigned_staff_ids').nullable()
    })

    this.schema.alterTable('lesson_plan_subtopics', (table) => {
      table.dropForeign(['assigned_staff_id'])
      table.dropColumn('assigned_staff_id')
      table.json('assigned_staff_ids').nullable()
    })
  }

  public async down() {
    this.schema.alterTable('lesson_plan_topics', (table) => {
      table.dropColumn('assigned_staff_ids')
      table.integer('assigned_staff_id').unsigned().nullable().references('id').inTable('staff').onDelete('SET NULL')
    })

    this.schema.alterTable('lesson_plan_subtopics', (table) => {
      table.dropColumn('assigned_staff_ids')
      table.integer('assigned_staff_id').unsigned().nullable().references('id').inTable('staff').onDelete('SET NULL')
    })
  }
}