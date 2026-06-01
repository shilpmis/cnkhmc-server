import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'departments'

  async up() {
    const hasEntityId = await this.schema.hasColumn(this.tableName, 'entity_id')
    if (!hasEntityId) {
      this.schema.alterTable(this.tableName, (table) => {
        table.integer('entity_id').unsigned().references('entities.id').onDelete('CASCADE').after('id')
      })
    }
  }

  async down() {
    const hasEntityId = await this.schema.hasColumn(this.tableName, 'entity_id')
    if (hasEntityId) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropForeign(['entity_id'])
        table.dropColumn('entity_id')
      })
    }
  }
}