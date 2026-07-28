import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class StaffExperience extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare staff_id: number

  @column()
  declare post_name: string | null

  @column.date()
  declare from_date: DateTime | null

  @column.date()
  declare to_date: DateTime | null

  @column()
  declare department: string | null

  @column()
  declare institute_name: string | null

  @column()
  declare appointment_regulation: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime
}