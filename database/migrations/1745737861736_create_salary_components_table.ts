import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'salary_components'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('deduction_frequency', ['once', 'recurring']).nullable()
      table
        .enum('deduction_type', [
          'ends_on_selected_month',
          'ends_never',
          'recovering_specific_amount',
        ])
        .nullable()
      table.enum('benefit_frequency', ['once', 'recurring']).nullable()
      table
        .enum('benefit_type', [
          'ends_on_selected_month',
          'ends_never',
          'recovering_specific_amount',
        ])
        .nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
