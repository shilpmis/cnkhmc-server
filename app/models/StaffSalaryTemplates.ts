//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column, hasMany } from '@adonisjs/lucid/orm'
import StaffTemplateComponents from './StaffTemplateComponents.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import SalaryTemplates from './SalaryTemplates.js'

export default class StaffSalaryTemplates extends Base {
  @column()
  declare base_template_id: number

  @column()
  declare staff_enrollments_id: number

  @column()
  declare template_name: string

  @column()
  declare template_code: string | null

  @column()
  declare description: string

  @column()
  declare annual_ctc: number

  @hasMany(() => SalaryTemplates, {
    foreignKey: 'id',
    localKey: 'base_template_id',
  })
  declare base_template: HasMany<typeof SalaryTemplates>

  @hasMany(() => StaffTemplateComponents, {
    foreignKey: 'staff_salary_templates_id',
    localKey: 'id',
  })
  declare template_components: HasMany<typeof StaffTemplateComponents>
}
