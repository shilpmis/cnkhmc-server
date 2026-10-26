import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  protected tableName = 'role_master'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
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
          'DEVELOPER',
          'STAFF',
        ])
        .notNullable()
        .alter()
    })

    this.defer(async () => {
      const existing = await db.from('role_master').where('role', 'STAFF').first()
      if (!existing) {
        await db.table('role_master').insert({
          id: 12,
          role: 'STAFF',
          permissions: JSON.stringify(['MARK_LEAVES']),
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
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
          'DEVELOPER',
        ])
        .notNullable()
        .alter()
    })
  }
}
