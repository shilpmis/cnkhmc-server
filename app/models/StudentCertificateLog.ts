import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Base from './base.js'
import Students from './Students.js'
import User from './User.js'

export default class StudentCertificateLog extends Base {
  public static table = 'student_certificate_logs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare student_id: number

  @column()
  declare certificate_type: string

  @column()
  declare reference_no: string | null

  @column()
  declare certificate_date: string | null

  @column()
  declare file_name: string

  @column()
  declare file_url: string

  @column()
  declare file_type: string

  @column()
  declare generation_number: number

  @column()
  declare generated_by: number | null

  @column({
    prepare: (value: any) => (value ? JSON.stringify(value) : null),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare metadata: any

  @belongsTo(() => Students, {
    foreignKey: 'student_id',
  })
  declare student: BelongsTo<typeof Students>

  @belongsTo(() => User, {
    foreignKey: 'generated_by',
  })
  declare user: BelongsTo<typeof User>
}
