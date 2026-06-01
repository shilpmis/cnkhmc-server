import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'users'

    public async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id')
            table.integer('organization_id').unsigned().nullable().references('id').inTable('organizations').onDelete('SET NULL')
            table.integer('school_id').unsigned().nullable().references('id').inTable('schools').onUpdate('CASCADE').onDelete('SET NULL')
            table.integer('role_id').unsigned().notNullable().references('id').inTable('role_master').onUpdate('CASCADE').onDelete('CASCADE');
            table.string('name').notNullable()
            // table.string('username').notNullable().unique();
            table.string('saral_email').notNullable().unique();
            table.string('password').notNullable();

            table.boolean('is_teacher').defaultTo(false).notNullable();
            table.integer('teacher_id')
                .unsigned()
                .references('id')
                .inTable('schools')
                .onUpdate('CASCADE')
                .onDelete('CASCADE')
                .nullable()
                .defaultTo(null);

            table.string('is_active').notNullable();

            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        })
    }

    public async down() {
        this.schema.dropTable(this.tableName)
    }
}
