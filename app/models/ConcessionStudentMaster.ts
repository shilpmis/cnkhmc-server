//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import Concessions from './Concessions.js'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import Students from './Students.js'
import FeesPlan from './FeesPlan.js'
import FeesType from './FeesType.js'

export default class ConcessionStudentMaster extends Base {
  public static table = 'concessions_student_masters'

  @column()
  declare academic_session_id: number

  @column()
  declare concession_id: number

  @column()
  declare student_id: number

  @column()
  declare fees_plan_id: number

  @column()
  declare fees_type_id: number | null

  @column()
  declare deduction_type: 'percentage' | 'fixed_amount'

  @column()
  declare amount: number | null

  @column()
  declare percentage: number | null

  @column()
  declare applied_discount: number

  @column()
  declare status: 'Active' | 'Inactive'

  @belongsTo(() => Concessions, {
    foreignKey: 'concession_id',
    localKey: 'id',
  })
  declare concession: BelongsTo<typeof Concessions>

  @belongsTo(() => Students, {
    foreignKey: 'student_id',
    localKey: 'id',
  })
  declare student: BelongsTo<typeof Students>

  @hasOne(() => FeesPlan, {
    foreignKey: 'id',
    localKey: 'fees_plan_id',
  })
  declare fees_plan: HasOne<typeof FeesPlan>

  @hasOne(() => FeesType, {
    foreignKey: 'id',
    localKey: 'fees_type_id',
    // onQuery: (query) => {
    //   query.whereNotNull('fees_type_id')
    // },
  })
  declare fees_type: HasOne<typeof FeesType>
}
