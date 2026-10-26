import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import NonLectureTemplate from './non_lecture_template.js'
import NonLectureTemplateTopic from './non_lecture_template_topic.js'
import NonLectureTeacherAssignment from './non_lecture_teacher_assignment.js'
import Staff from './Staff.js'

export default class NonLectureLog extends BaseModel {
  public static table = 'non_lecture_logs'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'template_id' })
  declare templateId: number

  @column({ columnName: 'assignment_id' })
  declare assignmentId: number | null

  @column({ columnName: 'topic_id' })
  declare topicId: number | null

  @column({ columnName: 'staff_id' })
  declare staffId: number

  @column()
  declare date: string

  @column({ columnName: 'hours_spent' })
  declare hoursSpent: number

  @column({ columnName: 'batch_name' })
  declare batchName: string | null

  @column({ columnName: 'students_count' })
  declare studentsCount: number | null

  @column({ columnName: 'activity_details' })
  declare activityDetails: string

  @column({ columnName: 'learning_outcomes' })
  declare learningOutcomes: string | null

  @column({ columnName: 'clinical_cases' })
  declare clinicalCases: string | null

  @column()
  declare remarks: string | null

  /** Plan rows covered in this session (JSON array of row ids) */
  @column({
    columnName: 'row_ids',
    prepare: (value: number[] | null) => (value && value.length ? JSON.stringify(value) : null),
    consume: (value: string | number[] | null) => {
      if (!value) return []
      if (Array.isArray(value)) return value
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed.map(Number) : []
      } catch {
        return []
      }
    },
  })
  declare rowIds: number[]

  @column()
  declare conclusion: string | null

  @column({ columnName: 'reference_book' })
  declare referenceBook: string | null

  @column({ columnName: 'lesson_plan_number' })
  declare lessonPlanNumber: string | null

  @column({ columnName: 'periods_config_id' })
  declare periodsConfigId: number | null

  @belongsTo(() => NonLectureTemplate, {
    foreignKey: 'templateId',
  })
  declare template: BelongsTo<typeof NonLectureTemplate>

  @belongsTo(() => NonLectureTemplateTopic, {
    foreignKey: 'topicId',
  })
  declare topic: BelongsTo<typeof NonLectureTemplateTopic>

  @belongsTo(() => NonLectureTeacherAssignment, {
    foreignKey: 'assignmentId',
  })
  declare assignment: BelongsTo<typeof NonLectureTeacherAssignment>

  @belongsTo(() => Staff, {
    foreignKey: 'staffId',
  })
  declare staff: BelongsTo<typeof Staff>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
