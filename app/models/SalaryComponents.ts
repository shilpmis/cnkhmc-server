//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

export default class SalaryComponents extends Base {
  @column()
  declare school_id: number

  @column()
  declare academic_session_id: number

  @column()
  declare component_name: string

  @column()
  declare component_code: string

  @column()
  declare component_type: 'earning' | 'deduction' | 'benefits'

  @column()
  declare description: string | null

  @column()
  declare calculation_method: 'amount' | 'percentage'

  @column()
  declare amount: number | null

  @column()
  declare percentage: number | null

  @column()
  declare is_based_on_annual_ctc: boolean

  @column()
  declare name_in_payslip: string | null

  @column()
  declare is_taxable: boolean

  @column()
  declare pro_rata_calculation: boolean

  @column()
  declare consider_for_epf: boolean

  @column()
  declare consider_for_esic: boolean

  @column()
  declare consider_for_esi: boolean

  @column()
  declare is_mandatory: boolean

  @column()
  declare is_mandatory_for_all_templates: boolean

  @column()
  declare deduction_frequency: 'once' | 'recurring' | null

  @column()
  declare deduction_type:
    | 'ends_on_selected_month'
    | 'ends_never'
    | 'recovering_specific_amount'
    | null

  @column()
  declare benefit_frequency: 'once' | 'recurring' | null

  @column()
  declare benefit_type:
    | 'ends_on_selected_month'
    | 'ends_never'
    | 'recovering_specific_amount'
    | null

  @column()
  declare is_active: boolean
}
