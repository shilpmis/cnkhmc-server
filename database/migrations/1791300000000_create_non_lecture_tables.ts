import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // 1. Non-Lecture Templates
    const hasTemplates = await this.schema.hasTable('non_lecture_templates')
    if (!hasTemplates) {
      this.schema.createTable('non_lecture_templates', (table) => {
        table.increments('id').primary()
        table.integer('school_id').unsigned().nullable().references('id').inTable('schools').onDelete('SET NULL')
        table.integer('department_id').unsigned().nullable().references('id').inTable('departments').onDelete('SET NULL')
        table.integer('class_id').unsigned().nullable().references('id').inTable('classes').onDelete('SET NULL')
        table.integer('academic_session_id').nullable()
        table.string('title').notNullable()
        table.string('code').nullable()
        table.string('activity_type').notNullable().defaultTo('Clinical Posting')
        table.decimal('total_hours', 6, 2).defaultTo(0)
        table.text('description').nullable()
        table.boolean('is_active').defaultTo(true)
        table.timestamp('created_at', { useTz: true }).notNullable()
        table.timestamp('updated_at', { useTz: true }).nullable()
      })
    }

    // 2. Non-Lecture Template Topics/Units
    const hasTopics = await this.schema.hasTable('non_lecture_template_topics')
    if (!hasTopics) {
      this.schema.createTable('non_lecture_template_topics', (table) => {
        table.increments('id').primary()
        table.integer('template_id').unsigned().notNullable().references('id').inTable('non_lecture_templates').onDelete('CASCADE')
        table.integer('topic_order').notNullable().defaultTo(1)
        table.string('title').notNullable()
        table.decimal('hours', 5, 2).defaultTo(1)
        table.string('activity_type').nullable()
        table.text('learning_objectives').nullable()
        table.text('remarks').nullable()
        table.timestamp('created_at', { useTz: true }).notNullable()
        table.timestamp('updated_at', { useTz: true }).nullable()
      })
    }

    // 3. Teacher Assignments
    const hasAssignments = await this.schema.hasTable('non_lecture_teacher_assignments')
    if (!hasAssignments) {
      this.schema.createTable('non_lecture_teacher_assignments', (table) => {
        table.increments('id').primary()
        table.integer('template_id').unsigned().notNullable().references('id').inTable('non_lecture_templates').onDelete('CASCADE')
        table.integer('staff_id').unsigned().notNullable().references('id').inTable('staff').onDelete('CASCADE')
        table.integer('class_id').unsigned().nullable().references('id').inTable('classes').onDelete('SET NULL')
        table.integer('division_id').unsigned().nullable().references('id').inTable('divisions').onDelete('SET NULL')
        table.integer('batch_id').unsigned().nullable().references('id').inTable('batches').onDelete('SET NULL')
        table.string('batch_name').nullable()
        table.integer('academic_session_id').nullable()
        table.integer('assigned_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
        table.string('status').notNullable().defaultTo('Active')
        table.text('notes').nullable()
        table.timestamp('created_at', { useTz: true }).notNullable()
        table.timestamp('updated_at', { useTz: true }).nullable()
      })
    }

    // 4. Non-Lecture Logs
    const hasLogs = await this.schema.hasTable('non_lecture_logs')
    if (!hasLogs) {
      this.schema.createTable('non_lecture_logs', (table) => {
        table.increments('id').primary()
        table.integer('template_id').unsigned().notNullable().references('id').inTable('non_lecture_templates').onDelete('CASCADE')
        table.integer('assignment_id').unsigned().nullable().references('id').inTable('non_lecture_teacher_assignments').onDelete('SET NULL')
        table.integer('topic_id').unsigned().nullable().references('id').inTable('non_lecture_template_topics').onDelete('SET NULL')
        table.integer('staff_id').unsigned().notNullable().references('id').inTable('staff').onDelete('CASCADE')
        table.date('date').notNullable()
        table.decimal('hours_spent', 5, 2).notNullable().defaultTo(1)
        table.string('batch_name').nullable()
        table.integer('students_count').nullable()
        table.text('activity_details').notNullable()
        table.text('learning_outcomes').nullable()
        table.text('clinical_cases').nullable()
        table.text('remarks').nullable()
        table.timestamp('created_at', { useTz: true }).notNullable()
        table.timestamp('updated_at', { useTz: true }).nullable()
      })
    }
  }

  async down() {
    this.schema.dropTableIfExists('non_lecture_logs')
    this.schema.dropTableIfExists('non_lecture_teacher_assignments')
    this.schema.dropTableIfExists('non_lecture_template_topics')
    this.schema.dropTableIfExists('non_lecture_templates')
  }
}
