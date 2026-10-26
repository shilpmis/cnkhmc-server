import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Non-lecture lesson plan.
 *
 * A non-lecture template keeps its topics ("Topic :" in the lesson plan sheet). Each topic now holds
 * syllabus ROWS carrying the sheet's heads: Sl. No., Competency, Miller's Level, Content, SLO/Outcome,
 * Bloom's Domain / Guilbert's Level, Priority, T-L Methods/media, Formative Assessment, Integration.
 * Teachers' non-lecture logs (the daily diary for these sessions) record which rows were covered.
 */
export default class extends BaseSchema {
  async up() {
    // 1. Progress on topics
    if (await this.schema.hasTable('non_lecture_template_topics')) {
      if (!(await this.schema.hasColumn('non_lecture_template_topics', 'completed_hours'))) {
        this.schema.alterTable('non_lecture_template_topics', (table) => {
          table.decimal('completed_hours', 6, 2).notNullable().defaultTo(0)
          table.boolean('is_completed').notNullable().defaultTo(false)
        })
      }
    }

    // 2. The syllabus rows (one line of the lesson plan sheet)
    if (!(await this.schema.hasTable('non_lecture_plan_rows'))) {
      this.schema.createTable('non_lecture_plan_rows', (table) => {
        table.increments('id').primary()
        table
          .integer('topic_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('non_lecture_template_topics')
          .onDelete('CASCADE')
        table.integer('row_order').notNullable().defaultTo(1)
        table.string('lesson_plan_number', 30).nullable()
        table.string('sl_no', 30).nullable()
        table.text('competency').nullable()
        table.string('miller', 80).nullable()
        table.text('content').nullable()
        table.text('outcome').nullable()
        table.string('bloom', 120).nullable()
        table.string('priority', 40).nullable()
        table.text('tl_mm').nullable()
        table.text('assessment').nullable()
        table.text('integration').nullable()
        table.decimal('required_hours', 5, 2).notNullable().defaultTo(1)
        table.boolean('is_completed').notNullable().defaultTo(false)
        table.decimal('completed_hours', 5, 2).notNullable().defaultTo(0)
        table.text('conclusion').nullable()
        table.text('reference_book').nullable()
        table.timestamp('created_at', { useTz: true }).notNullable()
        table.timestamp('updated_at', { useTz: true }).nullable()

        table.index(['topic_id', 'row_order'])
      })
    }

    // 3. What a teacher covered in a session (the diary entry)
    if (await this.schema.hasTable('non_lecture_logs')) {
      if (!(await this.schema.hasColumn('non_lecture_logs', 'row_ids'))) {
        this.schema.alterTable('non_lecture_logs', (table) => {
          table.text('row_ids').nullable() // JSON array of plan row ids covered
          table.text('conclusion').nullable()
          table.text('reference_book').nullable()
          table.string('lesson_plan_number', 30).nullable()
        })
      }
    }
  }

  async down() {
    if (await this.schema.hasTable('non_lecture_logs')) {
      this.schema.alterTable('non_lecture_logs', (table) => {
        table.dropColumn('row_ids')
        table.dropColumn('conclusion')
        table.dropColumn('reference_book')
        table.dropColumn('lesson_plan_number')
      })
    }
    this.schema.dropTableIfExists('non_lecture_plan_rows')
    if (await this.schema.hasTable('non_lecture_template_topics')) {
      this.schema.alterTable('non_lecture_template_topics', (table) => {
        table.dropColumn('completed_hours')
        table.dropColumn('is_completed')
      })
    }
  }
}
