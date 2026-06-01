//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

export default class SatffPayrunTemplates extends Base {
  public static table = 'satff_payrun_templates'

  @column()
  declare staff_enrollments_id: number

  @column()
  declare base_template_id: number

  @column()
  declare payroll_period: string

  @column()
  declare template_name: string

  @column()
  declare template_code: string

  @column()
  declare based_anual_ctc: number

  @column()
  declare total_payroll: number

  @column()
  declare notes: string | null

  @column()
  declare status:
    | 'draft'
    | 'pending'
    | 'processing'
    | 'partially_paid'
    | 'paid'
    | 'failed'
    | 'cancelled'
    | 'on_hold'
}
