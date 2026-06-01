import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      // table.string('username').notNullable().unique();
      table.bigInteger('contact_number').unique().notNullable();
      table.enum('subscription_type', ['FREE', 'PREMIUM']).notNullable().defaultTo('FREE');
      table.date('subscription_start_date').notNullable();
      table.date('subscription_end_date').notNullable();
      table.boolean('is_email_verified').notNullable().defaultTo(false);
      table.enum('status', ['ACTIVE', 'INACTIVE']).notNullable().defaultTo('ACTIVE');
      table.text('organization_logo').nullable().defaultTo(null);
      table.string('established_year').notNullable();
      table.string('address', 255).nullable().defaultTo(null)
      // table.enum('school_type', ['Public', 'Private', 'Charter']),

      table.string('head_name' , 100).nullable().defaultTo(null);
      table.bigInteger('head_contact_number').unique().notNullable();
      table.string('district' , 100).nullable().defaultTo(null);
      table.string('city' , 100).notNullable();
      table.string('state' , 100).notNullable();
      table.bigInteger('pincode').nullable().defaultTo(null);

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}