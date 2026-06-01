import { BaseSchema } from "@adonisjs/lucid/schema";

export default class AlterQuotasTable extends BaseSchema {
  protected tableName = 'quotas';

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('name').notNullable();
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}