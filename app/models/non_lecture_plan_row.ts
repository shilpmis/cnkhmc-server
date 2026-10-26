import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import NonLectureTemplateTopic from './non_lecture_template_topic.js'

/** One line of the non-lecture lesson plan sheet, under a topic. */
export default class NonLecturePlanRow extends BaseModel {
  public static table = 'non_lecture_plan_rows'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'topic_id' })
  declare topicId: number

  @column({ columnName: 'row_order' })
  declare rowOrder: number

  @column({ columnName: 'lesson_plan_number' })
  declare lessonPlanNumber: string | null

  @column({ columnName: 'sl_no' })
  declare slNo: string | null

  @column()
  declare competency: string | null

  @column()
  declare miller: string | null

  @column()
  declare content: string | null

  /** SLO / Outcome */
  @column()
  declare outcome: string | null

  /** Bloom's Domain / Guilbert's Level */
  @column()
  declare bloom: string | null

  @column()
  declare priority: string | null

  /** T-L Methods / media */
  @column({ columnName: 'tl_mm' })
  declare tlMm: string | null

  /** Formative Assessment */
  @column()
  declare assessment: string | null

  @column()
  declare integration: string | null

  @column({ columnName: 'required_hours' })
  declare requiredHours: number

  @column({ columnName: 'is_completed' })
  declare isCompleted: boolean

  @column({ columnName: 'completed_hours' })
  declare completedHours: number

  @column()
  declare conclusion: string | null

  @column({ columnName: 'reference_book' })
  declare referenceBook: string | null

  @belongsTo(() => NonLectureTemplateTopic, { foreignKey: 'topicId' })
  declare topic: BelongsTo<typeof NonLectureTemplateTopic>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
