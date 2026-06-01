import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admission_inquiries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('inquiry_for_class')
        .unsigned()
        // .nullable()
        .references('id')
        .inTable('classes')
        .onDelete('CASCADE')
      // .defaultTo(null)

      table.dropForeign('class_applying_for')
      table.dropColumn('class_applying_for')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
