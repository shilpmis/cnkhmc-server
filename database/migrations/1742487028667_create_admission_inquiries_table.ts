import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admission_inquiries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .enum('status', [
          'pending',
          'eligible',
          'approved',
          'ineligible',
          'rejected',
          'interview scheduled',
          'interview completed',
          'enrolled',
          'withdrawn',
        ])
        .defaultTo('pending')
        .alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .enum('status', ['pending', 'eligible', 'approved', 'ineligible'])
        .defaultTo('pending')
        .alter()
    })
  }
}
