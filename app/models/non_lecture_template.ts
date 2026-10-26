import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Schools from './Schools.js'
import Department from './Department.js'
import Classes from './Classes.js'
import NonLectureTemplateTopic from './non_lecture_template_topic.js'
import NonLectureTeacherAssignment from './non_lecture_teacher_assignment.js'
import NonLectureLog from './non_lecture_log.js'

export default class NonLectureTemplate extends BaseModel {
  public static table = 'non_lecture_templates'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'school_id' })
  declare schoolId: number | null

  @column({ columnName: 'department_id' })
  declare departmentId: number | null

  @column({ columnName: 'class_id' })
  declare classId: number | null

  @column({ columnName: 'academic_session_id' })
  declare academicSessionId: number | null

  @column({ columnName: 'subject_id' })
  declare subjectId: number | null

  @column()
  declare title: string

  @column()
  declare code: string | null

  @column({ columnName: 'activity_type' })
  declare activityType: string

  @column({ columnName: 'total_hours' })
  declare totalHours: number

  @column()
  declare description: string | null

  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @column({
    columnName: 'pdf_config',
    prepare: (value: any) => (value && typeof value === 'object' ? JSON.stringify(value) : value),
    consume: (value: any) => {
      if (!value) return null
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    },
  })
  declare pdfConfig: any | null

  @belongsTo(() => Schools, {
    foreignKey: 'schoolId',
  })
  declare school: BelongsTo<typeof Schools>

  @belongsTo(() => Department, {
    foreignKey: 'departmentId',
  })
  declare department: BelongsTo<typeof Department>

  @belongsTo(() => Classes, {
    foreignKey: 'classId',
  })
  declare class: BelongsTo<typeof Classes>

  @hasMany(() => NonLectureTemplateTopic, {
    foreignKey: 'templateId',
  })
  declare topics: HasMany<typeof NonLectureTemplateTopic>

  @hasMany(() => NonLectureTeacherAssignment, {
    foreignKey: 'templateId',
  })
  declare assignments: HasMany<typeof NonLectureTeacherAssignment>

  @hasMany(() => NonLectureLog, {
    foreignKey: 'templateId',
  })
  declare logs: HasMany<typeof NonLectureLog>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
