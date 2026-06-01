import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'course_phases'

  async up() {
    const hasDepartmentId = await this.schema.hasColumn(this.tableName, 'department_id')
    if (!hasDepartmentId) {
      this.schema.alterTable(this.tableName, (table) => {
        table.integer('department_id').unsigned().references('departments.id').onDelete('CASCADE').after('id')
      })
    }
  }

  async down() {
    const hasDepartmentId = await this.schema.hasColumn(this.tableName, 'department_id')
    if (hasDepartmentId) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropForeign(['department_id'])
        table.dropColumn('department_id')
      })
    }
  }
}