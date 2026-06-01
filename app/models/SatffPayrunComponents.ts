//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

export default class SatffPayrunComponents extends Base {
  @column()
  declare satff_payrun_templates_id: number

  @column()
  declare salary_components_id: number

  @column()
  declare amount: number | null

  @column()
  declare payslip_name: string | null

  @column()
  declare percentage: number | null

  @column()
  declare is_based_on_annual_ctc: boolean

  @column()
  declare is_based_on_basic_pay: boolean

  @column()
  declare is_modofied: boolean
}
