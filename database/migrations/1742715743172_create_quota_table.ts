import { BaseSchema } from "@adonisjs/lucid/schema";

export default class AlterQuotasTable extends BaseSchema {
  protected tableName = 'quotas';

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      table.integer('academic_session_id').unsigned().notNullable().references('id').inTable('academic_sessions').onDelete('CASCADE');
      
      table.dropColumn('name');
    });
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('school_id');
      table.dropColumn('academic_session_id');
      
      table.dropColumn('name');
    });
  }
}