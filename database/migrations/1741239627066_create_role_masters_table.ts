import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'role_master'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.enum('role'  , ['ADMIN' , 'PRINCIPAL' , 'HEAD_TEACHER' , 'CLERK' , 'IT_ADMIN' , 'SCHOOL_TEACHER']).notNullable()
      table.json('permissions').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}