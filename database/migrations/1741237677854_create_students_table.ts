import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      table
        .integer('school_id')
        .unsigned()
        .references('id')
        .inTable('schools')
        .onDelete('CASCADE');

      table.string('enrollment_code').notNullable().unique(); 
      table.string('admission_number').nullable().unique().defaultTo(null);
      table.string('first_name', 100).notNullable();
      table.string('middle_name', 100).notNullable();
      table.string('last_name', 100).notNullable();

      table.string('first_name_in_guj', 100).nullable();
      table.string('middle_name_in_guj', 100).nullable();
      table.string('last_name_in_guj', 100).nullable();

      table.enum('gender', ['Male', 'Female']).notNullable();
      
      table
        .integer('gr_no')
        .unsigned()
        .notNullable()

      table.date('birth_date').notNullable();

      // Contact details
      table
        .bigInteger('primary_mobile')
        .notNullable()

      table.string('father_name', 100).notNullable();
      table.string('father_name_in_guj', 100).nullable();
      table.string('mother_name', 100).nullable();
      table.string('mother_name_in_guj', 100).notNullable();

      table.integer('roll_number').nullable().defaultTo(null);

      table.bigInteger('aadhar_no').unsigned().notNullable().unique();
      table.text('profile_photo').nullable()
      table.boolean('is_active').notNullable().defaultTo(true);

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}