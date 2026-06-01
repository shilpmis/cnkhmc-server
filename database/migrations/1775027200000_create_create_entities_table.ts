import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'entities'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (exists) return

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name').notNullable();
      table.integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table.enum('type', ['SCHOOL', 'COLLEGE']).notNullable();
      table.string('email').unique().nullable();
      table.string('branch_code').nullable().unique();
      table.bigInteger('contact_number').nullable();
      table.boolean('is_email_verified').notNullable().defaultTo(false);
      table.enum('status', ['ACTIVE', 'INACTIVE']).notNullable().defaultTo('ACTIVE');
      table.string('established_year').nullable();
      table.string('address', 255).nullable();
      table.string('city', 100).nullable();
      table.string('state', 100).nullable();
      table.string('logo').nullable();
      table.bigInteger('pincode').unsigned().nullable();
      table.json('config').nullable();
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
