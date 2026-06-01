import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    const hasUsername = await this.schema.hasColumn(this.tableName, 'username')
    const hasSaralEmail = await this.schema.hasColumn(this.tableName, 'saral_email')

    // Drop the unique constraints using raw SQL so we can silently catch errors
    // if the index doesn't exist (e.g. if it was already dropped or has a different name).
    try {
      await this.db.rawQuery(`ALTER TABLE \`${this.tableName}\` DROP INDEX \`users_saral_email_unique\``)
    } catch (e) {}
    
    try {
      await this.db.rawQuery(`ALTER TABLE \`${this.tableName}\` DROP INDEX \`users_email_unique\``)
    } catch (e) {}

    this.schema.alterTable(this.tableName, (table) => {
      // Add username if it doesn't exist
      if (!hasUsername) {
        table.string('username').nullable().unique()
      }

      // Rename saral_email -> email if it still has the old name
      if (hasSaralEmail) {
        table.renameColumn('saral_email', 'email')
      }
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.string('email').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('email').notNullable().alter()
    })
  }
}


