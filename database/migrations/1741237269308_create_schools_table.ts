import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'schools'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name').notNullable();
      table.integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('RESTRICT')
      table.string('email').unique().notNullable();
      table.string('branch_code').notNullable().unique();
      table.bigInteger('contact_number').unique().notNullable();
      table.boolean('is_email_verified').notNullable().defaultTo(false);
      table.enum('status', ['ACTIVE', 'INACTIVE']).notNullable().defaultTo('ACTIVE');
      table.string('established_year').notNullable();
      table.enum('school_type', ['SCHOOL', 'COLLEGE']).defaultTo('SCHOOL'),
      table.string('address', 255).nullable().defaultTo(null)
      table.string('district', 100).nullable().defaultTo(null);
      table.string('city', 100).notNullable();
      table.string('state', 100).notNullable();
      table.text('school_logo').nullable().defaultTo(null);
      table.bigInteger('pincode').unsigned().nullable().defaultTo(null);
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}