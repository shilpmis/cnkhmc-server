import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      
      table.string('middle_name', 100).nullable().alter({alterNullable : true});

      table.string('first_name_in_guj', 100).nullable().alter({alterNullable : true});
      table.string('middle_name_in_guj', 100).nullable().alter({alterNullable : true});
      table.string('last_name_in_guj', 100).nullable().alter({alterNullable : true});


      table.date('birth_date').nullable().alter({alterNullable : true});

      table.string('father_name', 100).nullable().alter({alterNullable : true});
      table.string('father_name_in_guj', 100).nullable().alter({alterNullable : true});
      table.string('mother_name', 100).nullable().alter({alterNullable : true});
      table.string('mother_name_in_guj', 100).nullable().alter({alterNullable : true});

    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      
      table.string('middle_name', 100).notNullable();

      table.string('first_name_in_guj', 100).notNullable();
      table.string('middle_name_in_guj', 100).notNullable();
      table.string('last_name_in_guj', 100).notNullable();

      table
        .integer('gr_no')
        .unsigned()
        .notNullable()

      table.date('birth_date').notNullable();

      table.string('father_name_in_guj', 100).notNullable();
      table.string('mother_name', 100).notNullable();
      table.string('mother_name_in_guj', 100).notNullable();

      table.bigInteger('aadhar_no').unsigned().notNullable().unique();

    })
  }
}