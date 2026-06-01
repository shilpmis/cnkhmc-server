//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column, hasMany } from '@adonisjs/lucid/orm'
import InstallmentBreakDowns from './InstallmentBreakDowns.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class FeesPlanDetails extends Base {
  public static table = 'fees_plan_details'

  // @column()
  // declare academic_session_id: number

  @column()
  declare fees_plan_id: number

  @column()
  declare fees_type_id: number

  @column()
  declare installment_type: string

  @column()
  declare total_installment: number

  @column()
  declare total_amount: number

  @column()
  declare status: 'Active' | 'Inactive'

  @hasMany(() => InstallmentBreakDowns, {
    foreignKey: 'fee_plan_details_id',
    localKey: 'id',
  })
  declare installments_breakdown: HasMany<typeof InstallmentBreakDowns>
}
