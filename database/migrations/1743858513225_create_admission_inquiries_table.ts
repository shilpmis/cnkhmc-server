import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admission_inquiries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('first_name', 100).notNullable().alter({ alterNullable: true })
      table.string('last_name', 100).notNullable().alter({ alterNullable: true })

      table.dropForeign('class_applying')
      table.dropColumn('class_applying')

      table
        .integer('class_applying_for')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('classes')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
