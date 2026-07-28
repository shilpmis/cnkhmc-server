import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Base from './base.js'
import Subjects from './Subjects.js'
import Schools from './Schools.js'
import LessonPlanTopic from '#models/LessonPlanTopic'

export default class LessonPlan extends Base {
  public static table = 'lesson_plans'

  @column()
  declare subjectId: number

  @column()
  declare academicYear: number

  @column()
  declare schoolId: number

  @column()
  declare totalRequiredHours: number

  @belongsTo(() => Subjects, {
    foreignKey: 'subjectId',
  })
  declare subject: BelongsTo<typeof Subjects>

  
  @belongsTo(() => Schools, {
    foreignKey: 'schoolId',
  })
  declare school: BelongsTo<typeof Schools>

  @hasMany(() => LessonPlanTopic, {
    foreignKey: 'lessonPlanId',
  })
  declare topics: HasMany<typeof LessonPlanTopic>
}
