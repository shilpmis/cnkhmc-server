import { column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import Base from './base.js'
import ConcessionFeesPlanMaster from './ConcessionFeesPlanMaster.js'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import FeesPlanDetails from './FeesPlanDetails.js'
import Quota from './Quota.js'

export default class FeesPlan extends Base {
  public static table = 'fees_plans'

  @column()
  declare academic_year: number

  @column()
  declare division_id: number

  @column()
  declare class_id: number

  @column()
  declare quota_id: number | null

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare total_amount: number

  @column()
  declare status: 'Active' | 'Inactive'

  @belongsTo(() => Quota, {
    foreignKey: 'quota_id',
  })
  declare quota: BelongsTo<typeof Quota>

  @hasMany(() => FeesPlanDetails, {
    foreignKey: 'fees_plan_id',
    localKey: 'id',
  })
  declare fees_detail: HasMany<typeof FeesPlanDetails>

  @hasMany(() => ConcessionFeesPlanMaster, {
    foreignKey: 'fees_plan_id',
    localKey: 'id',
  })
  declare concession_for_plan: HasMany<typeof ConcessionFeesPlanMaster>
}
