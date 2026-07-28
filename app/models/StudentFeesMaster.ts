import Base from '#models/base'
import { column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import StudentFeesInstallments from './StudentFeesInstallments.js'
import StudentFeesTypeMasters from './StudentFeesTypeMasters.js'
import BatchProgression from './BatchProgression.js'
import FeesPlan from './FeesPlan.js'

export default class StudentFeesMaster extends Base {
  public static table = 'student_fees_master'

  @column()
  declare student_id: number

  @column()
  declare academic_year: number | null

  @column()
  declare batch_progression_id: number | null

  @column()
  declare fees_plan_id: number

  @column()
  declare total_amount: number

  @column()
  declare discounted_amount: number

  @column()
  declare paid_amount: number

  @column()
  declare due_amount: number

  @column()
  declare status: 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue'

  @belongsTo(() => BatchProgression, {
    foreignKey: 'batch_progression_id',
  })
  declare batchProgression: BelongsTo<typeof BatchProgression>

  @belongsTo(() => FeesPlan, {
    foreignKey: 'fees_plan_id',
  })
  declare fees_plan: BelongsTo<typeof FeesPlan>

  @hasMany(() => StudentFeesInstallments, {
    foreignKey: 'student_fees_master_id',
  })
  declare paid_fees: HasMany<typeof StudentFeesInstallments>

  @hasMany(() => StudentFeesInstallments, {
    foreignKey: 'student_fees_master_id',
    onQuery: (query) => query.where('status', 'Reversed')
  })
  declare reversed_fees: HasMany<typeof StudentFeesInstallments>

  @hasMany(() => StudentFeesTypeMasters, {
    foreignKey: 'student_enrollments_id',
    localKey: 'student_id'
  })
  declare paid_fees_details: HasMany<typeof StudentFeesTypeMasters>
}
