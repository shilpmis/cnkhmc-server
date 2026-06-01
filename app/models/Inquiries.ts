import { belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import Base from './base.js'
import * as relations from '@adonisjs/lucid/types/relations'
import Schools from './Schools.js'
import AcademicSession from './AcademicSession.js'
import ClassSeatAvailability from './ClassSeatAvailability.js'
import Quota from './Quota.js'
import User from './User.js'
import StudentEnrollments from './StudentEnrollments.js'

export default class AdmissionInquiry extends Base {
  public static table = 'admission_inquiries'

  @column()
  declare school_id: number

  @column()
  declare student_enrollments_id: number | null

  @column()
  declare academic_session_id: number

  // New name fields
  @column()
  declare first_name: string

  @column()
  declare middle_name: string | null

  @column()
  declare last_name: string

  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare birth_date: Date | null

  @column()
  declare gender: 'male' | 'female'

  @column()
  declare inquiry_for_class: number

  // Renamed from parent_name
  @column()
  declare father_name: string

  // Renamed from parent_contact
  @column()
  declare primary_mobile: number

  @column()
  declare parent_email: string | null

  @column()
  declare address: string

  // Previous School Details
  @column()
  declare previous_school: string | null

  @column()
  declare previous_class: number | null

  @column()
  declare previous_percentage: number | null

  @column()
  declare previous_year: string | null

  @column()
  declare special_achievements: string | null

  // Quota Details
  @column()
  declare applying_for_quota: boolean

  @column()
  declare quota_type: number | null

  @column()
  declare status:
    | 'pending'
    | 'eligible'
    | 'approved'
    | 'ineligible'
    | 'rejected'
    | 'interview scheduled'
    | 'interview completed'
    | 'enrolled'
    | 'withdrawn'

  @column()
  declare admin_notes: string | null

  @column()
  declare created_by: number

  @column()
  declare is_converted_to_student: boolean

  // **Relationships**
  @belongsTo(() => Schools, { foreignKey: 'school_id' })
  declare school: relations.BelongsTo<typeof Schools>

  @belongsTo(() => AcademicSession, { foreignKey: 'academic_session_id' })
  declare academic_session: relations.BelongsTo<typeof AcademicSession>

  @belongsTo(() => ClassSeatAvailability, { foreignKey: 'inquiry_for_class' })
  declare class_seat_availability: relations.BelongsTo<typeof ClassSeatAvailability>

  @belongsTo(() => Quota, { foreignKey: 'quota_type' })
  declare quota: relations.BelongsTo<typeof Quota>

  @belongsTo(() => User, { foreignKey: 'created_by' })
  declare created_by_user: relations.BelongsTo<typeof User>

  @hasOne(() => StudentEnrollments, {
    foreignKey: 'id',
    localKey: 'student_enrollments_id',
  })
  declare student_enrollment: relations.HasOne<typeof StudentEnrollments>
}
