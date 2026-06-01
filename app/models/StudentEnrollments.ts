import Base from '#models/base'
import { belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import Students from './Students.js'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Quota from './Quota.js'
import Divisions from './Divisions.js'
import StudentFeesMaster from './StudentFeesMaster.js'
import ConcessionStudentMaster from './ConcessionStudentMaster.js'

export default class StudentEnrollments extends Base {
  public static table = 'student_enrollments'

  @column()
  declare student_id: number

  @column()
  declare division_id: number

  @column()
  declare academic_session_id: number

  @column()
  declare quota_id: number | null

  @column()
  declare status: 'pursuing' | 'permoted' | 'failed' | 'drop' | 'migrated' | 'completed' | 'transfered' | 'suspended'| 'onboarded' | 'admission_cancel'

  @column()
  declare remarks: string

  @column()
  declare is_new_admission: boolean

  @belongsTo(() => Students, {
    foreignKey: 'student_id',
    localKey: 'id',
  })
  declare student: BelongsTo<typeof Students>

  @belongsTo(() => Quota)
  declare quota: BelongsTo<typeof Quota>

  @hasOne(() => Divisions, {
    foreignKey: 'id',
    localKey: 'division_id',
    serializeAs: 'class',
  })
  declare division: HasOne<typeof Divisions>

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
  
  @column()
  declare promoted_by: number | null

}
