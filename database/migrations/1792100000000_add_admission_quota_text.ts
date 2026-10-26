import { BaseSchema } from '@adonisjs/lucid/schema'

/** Admission quota is typed in as text on the student form (and exported), instead of picked from the quota list. */
export default class extends BaseSchema {
  protected tableName = 'students_meta'

  async up() {
    if (!(await this.schema.hasColumn(this.tableName, 'admission_quota'))) {
      this.schema.alterTable(this.tableName, (table) => {
        // students_meta is close to the row-size limit, so this goes into a TEXT column (stored off-row)
        table.text('admission_quota').nullable()
      })
    }
  }

  async down() {
    if (await this.schema.hasColumn(this.tableName, 'admission_quota')) {
      this.schema.alterTable(this.tableName, (table) => table.dropColumn('admission_quota'))
    }
  }
}
