import { DateTime } from 'luxon'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Base from '#models/base'
import Entity from '#models/Entity'

export default class Organization extends Base {
  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare contact_number: number

  @column()
  declare subscription_type: 'FREE' | 'PREMIUM'

  @column.date()
  declare subscription_start_date: DateTime

  @column.date()
  declare subscription_end_date: DateTime

  @column()
  declare is_email_verified: boolean

  @column()
  declare status: 'ACTIVE' | 'INACTIVE'

  @column()
  declare organization_logo: string | null

  @column()
  declare established_year: string

  @column()
  declare address: string | null

  @column()
  declare head_name: string | null

  @column()
  declare head_contact_number: number

  @column()
  declare district: string | null

  @column()
  declare city: string

  @column()
  declare state: string

  @column()
  declare pincode: number | null

  @hasMany(() => Entity, {
    foreignKey: 'organization_id',
  })
  declare entities: HasMany<typeof Entity>
}
