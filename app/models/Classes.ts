import Base from '#models/base'
import { column, hasMany, hasOne, belongsTo } from '@adonisjs/lucid/orm'
import FeesPlan from './FeesPlan.js'
import type { HasOne, BelongsTo } from '@adonisjs/lucid/types/relations'
import ClassSeatAvailability from './ClassSeatAvailability.js'
import * as relations from '@adonisjs/lucid/types/relations'
import Divisions from './Divisions.js'
import Batch from './Batch.js'
import Department from './Department.js'

import Schools from './Schools.js'

export default class Classes extends Base {
  @column()
  declare school_id: number

  @column()
  declare academic_year: number

  @column()
  declare batch_id: number | null

  @column()
  declare department_id: number | null

  @column()
  declare class: string

  @column()
  declare is_active: boolean

  @hasMany(() => Divisions, {
    foreignKey: 'class_id',
    localKey: 'id',
  })
  declare divisions: relations.HasMany<typeof Divisions>

  @hasOne(() => FeesPlan, {
    foreignKey: 'class_id',
    localKey: 'id',
  })
  declare fees_plan: HasOne<typeof FeesPlan>

  @hasMany(() => ClassSeatAvailability, {
    foreignKey: 'class_id',
    localKey: 'id',
  })
  declare seat_availability: relations.HasMany<typeof ClassSeatAvailability>

  @belongsTo(() => Batch, {
    foreignKey: 'batch_id',
  })
  declare batch: BelongsTo<typeof Batch>

  @belongsTo(() => Department, {
    foreignKey: 'department_id',
  })
  declare department: BelongsTo<typeof Department>

  @belongsTo(() => Schools, {
    foreignKey: 'school_id',
  })
  declare school: BelongsTo<typeof Schools>
}
