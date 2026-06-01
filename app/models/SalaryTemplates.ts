//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import TemplateComponents from './TemplateComponents.js'

export default class SalaryTemplates extends Base {
  @column()
  declare school_id: number

  @column()
  declare academic_session_id: number

  @column()
  declare template_name: string

  @column()
  declare template_code: string | null

  @column()
  declare description: string | null

  @column()
  declare annual_ctc: number

  @column()
  declare is_active: boolean

  @column()
  declare is_mandatory: boolean

  @hasMany(() => TemplateComponents, {
    foreignKey: 'salary_templates_id',
    localKey: 'id',
  })
  declare template_components: HasMany<typeof TemplateComponents>
}
