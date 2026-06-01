import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Base from './base.js'
import LessonPlanTopic from '#models/LessonPlanTopic'

export default class LessonPlanSubtopic extends Base {
  public static table = 'lesson_plan_subtopics'

  @column({ serializeAs: 'topicId' })
  declare topicId: number

  @column()
  declare name: string

  @column()
  declare code: string | null

  @column()
  declare detail: string | null

  @column({ serializeAs: 'isCompleted' })
  declare isCompleted: boolean

  @column()
  declare competency: string | null

  @column()
  declare outcome: string | null

  @column()
  declare order: number

  @column({ columnName: 'lesson_plan_number' })
  declare lessonPlanNumber: string | null

  @column({ columnName: 'required_hours' })
  declare requiredHours: number

  @column()
  declare miller: string | null

  @column()
  declare bloom: string | null

  @column()
  declare priority: string | null

  @column({ columnName: 'tl_mm' })
  declare tlMm: string | null

  @column()
  declare assessment: string | null

  @column()
  declare integration: string | null

  @column()
  declare conclusion: string | null

  @column({ columnName: 'reference_book' })
  declare referenceBook: string | null

  @belongsTo(() => LessonPlanTopic, {
    foreignKey: 'topicId',
  })
  declare topic: BelongsTo<typeof LessonPlanTopic>
}
