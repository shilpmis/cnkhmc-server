import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Base from '#models/base'
import Department from '#models/Department'
import Batch from '#models/Batch'
import Organization from '#models/Organization'

export default class Entity extends Base {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organization_id: number

  @column()
  declare name: string

  @column()
  declare type: 'SCHOOL' | 'COLLEGE'

  @column()
  declare email: string | null

  @column()
  declare branch_code: string | null

  @column()
  declare contact_number: number | null

  @column()
  declare address: string | null

  @column()
  declare city: string | null

  @column()
  declare state: string | null

  @column()
  declare pincode: string | null

  @column()
  declare logo: string | null

  @column({
    consume: (value: unknown) => {
      if (value === null || value === undefined) return null
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return null
        }
      }
      // mysql/json columns may already come back as objects
      if (typeof value === 'object') return value
      return null
    },
    prepare: (value: any) => value ? JSON.stringify(value) : null,
  })
  declare config: any

  @column()
  declare status: 'ACTIVE' | 'INACTIVE'

  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => Department, {
    foreignKey: 'entity_id',
  })
  declare departments: HasMany<typeof Department>

  @hasMany(() => Batch, {
    foreignKey: 'entity_id',
  })
  declare batches: HasMany<typeof Batch>
}
