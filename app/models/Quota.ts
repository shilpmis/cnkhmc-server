import { column } from '@adonisjs/lucid/orm'
import Base from './base.js'

export default class Quota extends Base {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare school_id: number

  @column()
  declare academic_session_id: number

  @column()
  declare description: string | null

  @column()
  declare is_active: boolean

  @column()
  declare eligibility_criteria?: string
}
