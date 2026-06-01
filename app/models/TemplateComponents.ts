//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

export default class TemplateComponents extends Base {
  @column()
  declare salary_templates_id: number

  @column()
  declare salary_components_id: number

  @column()
  declare amount: number | null

  @column()
  declare percentage: number | null

  @column()
  declare is_based_on_annual_ctc: boolean

  @column()
  declare is_mandatory: boolean
}
