import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'role_master'

  async up() {
    const hasPermissions = await this.schema.hasColumn(this.tableName, 'permissions')
    this.schema.alterTable(this.tableName, (table) => {
      // Add permissions column if not exists
      if (!hasPermissions) {
        table.json('permissions').nullable().after('role')
      }
      
      // Update role enum to include DEVELOPER
      table.enum('role', [
        'ADMIN', 'PRINCIPAL', 'HEAD_TEACHER', 'CLERK', 
        'IT_ADMIN', 'SCHOOL_TEACHER', 'HOD', 'FACULTY', 
        'ORG_ADMIN', 'SUPER_ADMIN', 'DEVELOPER'
      ]).alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Since permissions was part of the original table creation, we do not drop it if it existed initially.
      table.enum('role', [
        'ADMIN', 'PRINCIPAL', 'HEAD_TEACHER', 'CLERK', 
        'IT_ADMIN', 'SCHOOL_TEACHER', 'HOD', 'FACULTY', 
        'ORG_ADMIN', 'SUPER_ADMIN'
      ]).alter()
    })
  }
}