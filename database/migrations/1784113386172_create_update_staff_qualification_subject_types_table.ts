import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'staff'

  async up() {
    this.schema.raw('ALTER TABLE staff MODIFY qualification VARCHAR(255) NULL;')
    this.schema.raw('ALTER TABLE staff MODIFY subject_specialization VARCHAR(255) NULL;')
  }

  async down() {
    // Cannot easily revert back to the old ENUM without losing new data.
    // We'll leave it as VARCHAR in down() as well, or you could do nothing.
  }
}