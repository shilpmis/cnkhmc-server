//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column, hasMany } from '@adonisjs/lucid/orm'
import ConcessionFeesPlanMaster from './ConcessionFeesPlanMaster.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import ConcessionStudentMaster from './ConcessionStudentMaster.js'

export default class Concessions extends Base {
  @column()
  declare school_id: number

  @column()
  declare academic_session_id: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare applicable_to: 'fees_types' | 'plan' | 'students'

  @column()
  declare concessions_to: 'fees_type' | 'plan'

  @column()
  declare status: 'Active' | 'Inactive'

  @column()
  declare category: 'family' | 'sports' | 'staff' | 'education' | 'financial' | 'other'

  @hasMany(() => ConcessionFeesPlanMaster, {
    foreignKey: 'concession_id',
    localKey: 'id',
  })
  declare concession_for_plan: HasMany<typeof ConcessionFeesPlanMaster>

  @hasMany(() => ConcessionStudentMaster, {
    foreignKey: 'concession_id',
    localKey: 'id',
  })
  declare concession_for_students: HasMany<typeof ConcessionStudentMaster>
}
