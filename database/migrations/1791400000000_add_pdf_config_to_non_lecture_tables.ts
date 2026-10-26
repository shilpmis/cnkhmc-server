import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // 1. Add pdf_config to non_lecture_templates
    const hasTemplates = await this.schema.hasTable('non_lecture_templates')
    if (hasTemplates) {
      const hasPdfConfig = await this.schema.hasColumn('non_lecture_templates', 'pdf_config')
      if (!hasPdfConfig) {
        this.schema.alterTable('non_lecture_templates', (table) => {
          table.text('pdf_config').nullable()
        })
      }
    }

    // 2. School-level default PDF settings table
    const hasPdfSettings = await this.schema.hasTable('non_lecture_pdf_settings')
    if (!hasPdfSettings) {
      this.schema.createTable('non_lecture_pdf_settings', (table) => {
        table.increments('id').primary()
        table.integer('school_id').unsigned().nullable().references('id').inTable('schools').onDelete('CASCADE')
        table.string('setting_key').notNullable().defaultTo('default')
        table.text('config').notNullable()
        table.timestamp('created_at', { useTz: true }).notNullable()
        table.timestamp('updated_at', { useTz: true }).nullable()
      })
    }
  }

  async down() {
    this.schema.dropTableIfExists('non_lecture_pdf_settings')
    const hasTemplates = await this.schema.hasTable('non_lecture_templates')
    if (hasTemplates) {
      const hasPdfConfig = await this.schema.hasColumn('non_lecture_templates', 'pdf_config')
      if (hasPdfConfig) {
        this.schema.alterTable('non_lecture_templates', (table) => {
          table.dropColumn('pdf_config')
        })
      }
    }
  }
}
