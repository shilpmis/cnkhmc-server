//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column, hasMany } from '@adonisjs/lucid/orm'
import Classes from './Classes.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import ClassSeatAvailability from './ClassSeatAvailability.js'

export default class ParentClass extends Base {
  @column()
  declare school_id: number

  @column()
  declare academic_session_id: number

  @column()
  declare parent_class: 'Nursery' | 'LKG' | 'UKG' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

  @column()
  declare is_active: boolean

  @hasMany(() => Classes, {
    foreignKey: 'parent_class_id',
    localKey: 'id',
  })
  declare classes: HasMany<typeof Classes>

  @hasMany(() => ClassSeatAvailability, {
    foreignKey: 'parent_class_id',
    localKey: 'id',
  })
  declare seat_availability: HasMany<typeof ClassSeatAvailability>
}
