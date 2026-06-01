import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateQuotasTable extends BaseSchema {
  protected tableName = 'quotas'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name').unique().notNullable()
      table.text('description').nullable()
      table.string('eligibility_criteria').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
