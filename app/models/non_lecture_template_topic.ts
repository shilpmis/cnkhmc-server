import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import NonLectureTemplate from './non_lecture_template.js'
import NonLecturePlanRow from './non_lecture_plan_row.js'

export default class NonLectureTemplateTopic extends BaseModel {
  public static table = 'non_lecture_template_topics'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'template_id' })
  declare templateId: number

  @column({ columnName: 'topic_order' })
  declare topicOrder: number

  @column()
  declare title: string

  @column()
  declare hours: number

  @column({ columnName: 'activity_type' })
  declare activityType: string | null

  @column({ columnName: 'learning_objectives' })
  declare learningObjectives: string | null

  @column()
  declare remarks: string | null

  @column({ columnName: 'completed_hours' })
  declare completedHours: number

  @column({ columnName: 'is_completed' })
  declare isCompleted: boolean

  /** Teachers (staff ids) this topic is assigned to; empty means every teacher of the subject */
  @column({
    columnName: 'assigned_staff_ids',
    prepare: (value: any) => (Array.isArray(value) && value.length ? JSON.stringify(value) : null),
    consume: (value: any) => {
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
  declare assignedStaffIds: number[]

  @hasMany(() => NonLecturePlanRow, { foreignKey: 'topicId' })
  declare rows: HasMany<typeof NonLecturePlanRow>

  @belongsTo(() => NonLectureTemplate, {
    foreignKey: 'templateId',
  })
  declare template: BelongsTo<typeof NonLectureTemplate>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
