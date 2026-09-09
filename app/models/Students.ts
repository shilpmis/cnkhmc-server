import Base from '#models/base'
import { column, hasMany, hasOne, belongsTo } from '@adonisjs/lucid/orm'
import StudentMeta from './StudentMeta.js'
import type { HasMany, HasOne, BelongsTo } from '@adonisjs/lucid/types/relations'
import StudentFeesMaster from './StudentFeesMaster.js'
import ConcessionStudentMaster from './ConcessionStudentMaster.js'
import StudentEnrollments from './StudentEnrollments.js'
import Batch from './Batch.js'

export default class Students extends Base {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare school_id: number

  @column()
  declare batch_id: number | null

  @column()
  declare practical_batch: string | null

  @column()
  declare student_type: 'SCHOOL' | 'COLLEGE'

  @column()
  declare enrollment_code: string

  @column()
  declare admission_number: string | null

  @column()
  declare first_name: string

  @column()
  declare middle_name: string | null

  @column()
  declare last_name: string

  @column()
  declare first_name_in_guj: string | null

  @column()
  declare middle_name_in_guj: string | null

  @column()
  declare last_name_in_guj: string | null

  @column()
  declare gender: 'Male' | 'Female' | null

  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare birth_date: Date | null

  @column()
  declare gr_no: number | null

  @column()
  declare primary_mobile: number | null

  @column()
  declare father_name: string | null

  @column()
  declare father_name_in_guj: string | null

  @column()
  declare mother_name: string | null

  @column()
  declare mother_name_in_guj: string | null

  @column()
  declare first_year_roll_number: number | null

  @column()
  declare second_year_roll_number: number | null

  @column()
  declare third_year_roll_number: number | null

  @column()
  declare fourth_year_roll_number: number | null

  @column()
  declare aadhar_no: number | null

  @column()
  declare is_active: boolean

  // Relationships
  @belongsTo(() => Batch, {
    foreignKey: 'batch_id',
  })
  declare batch: BelongsTo<typeof Batch>

  @hasOne(() => StudentMeta, {
    foreignKey: 'student_id',
    localKey: 'id',
  })
  declare student_meta: HasOne<typeof StudentMeta>

  @hasOne(() => StudentFeesMaster, {
    foreignKey: 'student_id',
    localKey: 'id',
  })
  declare fees_status: HasOne<typeof StudentFeesMaster>

  @hasMany(() => ConcessionStudentMaster, {
    foreignKey: 'student_id',
    localKey: 'id',
  })
  declare provided_concession: HasMany<typeof ConcessionStudentMaster>

  @hasMany(() => StudentEnrollments, {
    foreignKey: 'student_id',
    localKey: 'id',
  })
  declare academic_class: HasMany<typeof StudentEnrollments>
}