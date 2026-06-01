import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'role_master'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // For MySQL, we often need to use raw to alter enum
      table
        .enum('role', [
          'ADMIN',
          'PRINCIPAL',
          'HEAD_TEACHER',
          'CLERK',
          'IT_ADMIN',
          'SCHOOL_TEACHER',
          'HOD',
          'FACULTY',
          'ORG_ADMIN',
          'SUPER_ADMIN',
        ])
        .notNullable()
        .alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('role', ['ADMIN', 'PRINCIPAL', 'HEAD_TEACHER', 'CLERK', 'IT_ADMIN', 'SCHOOL_TEACHER']).notNullable().alter()
    })
  }
}
