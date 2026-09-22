import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Student from './Students.js'
import HostelBed from './hostel_bed.js'

export default class HostelAllocation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'student_id' })
  declare studentId: number

  @column({ columnName: 'bed_id' })
  declare bedId: number

  @column.dateTime({ columnName: 'allocation_date' })
  declare allocationDate: DateTime

  @column.dateTime({ columnName: 'vacation_date' })
  declare vacationDate: DateTime | null

  @column()
  declare status: 'Active' | 'Vacated'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Student, { foreignKey: 'studentId' })
  declare student: BelongsTo<typeof Student>

  @belongsTo(() => HostelBed, { foreignKey: 'bedId' })
  declare bed: BelongsTo<typeof HostelBed>
}