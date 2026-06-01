import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_enrollments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('status', ['pursuing', 'permoted' ,'promoted', 'failed', 'drop' , 'migrated' , 'completed' , 'transfered' , 'suspended', 'onboarded' , 'admission_cancel']).alter()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

