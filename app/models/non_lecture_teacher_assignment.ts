import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import NonLectureTemplate from './non_lecture_template.js'
import Staff from './Staff.js'
import Classes from './Classes.js'
import Divisions from './Divisions.js'
import Batch from './Batch.js'
import User from './User.js'
import NonLectureLog from './non_lecture_log.js'

export default class NonLectureTeacherAssignment extends BaseModel {
  public static table = 'non_lecture_teacher_assignments'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'template_id' })
  declare templateId: number

  @column({ columnName: 'staff_id' })
  declare staffId: number

  @column({ columnName: 'class_id' })
  declare classId: number | null

  @column({ columnName: 'division_id' })
  declare divisionId: number | null

  @column({ columnName: 'batch_id' })
  declare batchId: number | null

  @column({ columnName: 'batch_name' })
  declare batchName: string | null

  @column({ columnName: 'academic_session_id' })
  declare academicSessionId: number | null

  @column({ columnName: 'assigned_by' })
  declare assignedBy: number | null

  @column()
  declare status: string

  @column()
  declare notes: string | null

  @belongsTo(() => NonLectureTemplate, {
    foreignKey: 'templateId',
  })
  declare template: BelongsTo<typeof NonLectureTemplate>

  @belongsTo(() => Staff, {
    foreignKey: 'staffId',
  })
  declare staff: BelongsTo<typeof Staff>

  @belongsTo(() => Classes, {
    foreignKey: 'classId',
  })
  declare class: BelongsTo<typeof Classes>

  @belongsTo(() => Divisions, {
    foreignKey: 'divisionId',
  })
  declare division: BelongsTo<typeof Divisions>

  @belongsTo(() => Batch, {
    foreignKey: 'batchId',
  })
  declare batch: BelongsTo<typeof Batch>

  @belongsTo(() => User, {
    foreignKey: 'assignedBy',
  })
  declare assigner: BelongsTo<typeof User>

  @hasMany(() => NonLectureLog, {
    foreignKey: 'assignmentId',
  })
  declare logs: HasMany<typeof NonLectureLog>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
