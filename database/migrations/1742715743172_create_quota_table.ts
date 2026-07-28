import { BaseSchema } from "@adonisjs/lucid/schema";

export default class AlterQuotasTable extends BaseSchema {
  protected tableName = 'quotas';

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      table.integer('academic_year').notNullable();
      
      table.dropColumn('name');
    });
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('school_id');
      table.dropColumn('academic_year');
      
      table.dropColumn('name');
    });
  }
}