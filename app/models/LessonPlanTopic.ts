import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Base from './base.js'
import LessonPlan from '#models/LessonPlan'
import LessonPlanSubtopic from '#models/LessonPlanSubtopic'

export default class LessonPlanTopic extends Base {
  public static table = 'lesson_plan_topics'

  @column()
  declare lessonPlanId: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare requiredHours: number

  @column()
  declare isCompleted: boolean

  @column()
  declare code: string | null

  @column()
  declare order: number

  @column({ columnName: 'assigned_staff_ids' })
  declare assignedStaffIds: number[] | null

  @belongsTo(() => LessonPlan, {
    foreignKey: 'lessonPlanId',
  })
  declare lessonPlan: BelongsTo<typeof LessonPlan>

  @hasMany(() => LessonPlanSubtopic, {
    foreignKey: 'topicId',
  })
  declare subtopics: HasMany<typeof LessonPlanSubtopic>
}
