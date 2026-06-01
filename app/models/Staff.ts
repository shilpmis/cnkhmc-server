import Base from '#models/base'
import { belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import Schools from './Schools.js'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import StaffMaster from './StaffMaster.js'
import ClassTeacherMaster from '#models/Classteachermaster'
import StaffEnrollment from './StaffEnrollment.js'

export default class Staff extends Base {
  @column()
  declare employee_code: string

  @column()
  declare staff_role_id: number

  @column()
  declare school_id: number

  @column()
  declare first_name: string

  @column()
  declare middle_name: string | null

  @column()
  declare last_name: string

  // DB column: short_name (matches)
  @column()
  declare short_name: string | null

  @column()
  declare department: string | null

  // --- Columns added by migration (may not exist yet, see migration below) ---
  @column()
  declare minority: string | null

  // DB column: child (model uses child_count)
  @column({ columnName: 'child' })
  declare child_count: number | null

  @column()
  declare designation: string | null

  @column()
  declare staff_type: string | null

  @column()
  declare staff_category: string | null

  @column()
  declare nature_of_appointment: string | null

  @column()
  declare registration_authority: string | null

  // DB column: branch_details (added by new migration)
  @column()
  declare branch_details: string | null

  @column()
  declare qualification_college: string | null

  @column()
  declare qualification_university: string | null
  // --- End migration-added columns ---

  @column()
  declare total_experience: number | null

  @column()
  declare first_name_in_guj: string | null

  @column()
  declare middle_name_in_guj: string | null

  @column()
  declare last_name_in_guj: string | null

  @column()
  declare aadhar_no: number | null

  @column()
  declare religion: string | null

  @column()
  declare religion_in_guj: string | null

  @column()
  declare caste: string | null

  @column()
  declare caste_in_guj: string | null

  @column()
  declare category: 'ST' | 'SC' | 'OBC' | 'OPEN' | null

  @column()
  declare address: string | null

  @column()
  declare district: string | null

  @column()
  declare city: string | null

  @column()
  declare state: string | null

  @column()
  declare postal_code: number | null

  @column()
  declare bank_name: string | null

  @column()
  declare account_no: number | null

  @column()
  declare nationality: string | null

  @column()
  declare IFSC_code: string | null

  @column()
  declare profile_photo: string | null

  @column()
  declare is_active: boolean

  @column()
  declare is_teching_staff: boolean

  @column()
  declare is_teaching_role: boolean

  @column()
  declare gender: 'Male' | 'Female'

  // DB column: marital_status (matches)
  @column()
  declare marital_status: 'Single' | 'Married' | 'Divorced' | 'Widowed' | null

  // DB column: date_of_appointment (model uses appointment_date)
  @column({
    columnName: 'date_of_appointment',
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare appointment_date: Date | null

  // DB column: date_of_promotion (model uses promotion_date)
  @column({
    columnName: 'date_of_promotion',
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare promotion_date: Date | null

  // DB column: registration_no (model uses registration_number)
  @column({ columnName: 'registration_no' })
  declare registration_number: string | null

  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare registration_date: Date | null

  // DB column: name_of_council (model uses council_name)
  @column({ columnName: 'name_of_council' })
  declare council_name: string | null

  @column()
  declare ayush_teacher_code: string | null

  @column()
  declare ayush_id_no: string | null

  @column()
  declare state_council_reg_no: string | null

  // DB column: md_subject_name (model uses md_subject)
  @column({ columnName: 'md_subject_name' })
  declare md_subject: string | null

  // DB column: date_of_passing (model uses passing_date)
  @column({
    columnName: 'date_of_passing',
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare passing_date: Date | null

  // DB column: voter_id_no (model uses voter_id)
  @column({ columnName: 'voter_id_no' })
  declare voter_id: string | null

  // DB column: driving_license_no (model uses driving_licence)
  @column({ columnName: 'driving_license_no' })
  declare driving_licence: string | null

  // DB column: driving_license_validity (model uses driving_licence_expiry)
  @column({
    columnName: 'driving_license_validity',
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare driving_licence_expiry: Date | null

  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare uni_approval_date: Date | null

  // DB column: uni_approval_no (model uses uni_approval_number)
  @column({ columnName: 'uni_approval_no' })
  declare uni_approval_number: string | null

  @column()
  declare university_appointment_letter_no: string | null

  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare university_appointment_date: Date | null

  @column()
  declare area_of_expertise: string | null

  @column()
  declare ug_degree: string | null

  @column()
  declare ug_passing_university: string | null

  @column()
  declare ug_passing_year: number | null

  @column()
  declare pg_degree: string | null

  @column()
  declare pg_passing_university: string | null

  @column()
  declare pg_passing_year: number | null

  @column()
  declare other_degree: string | null

  @column()
  declare other_passing_university: string | null

  @column()
  declare other_passing_year: number | null

  @column()
  declare pay_scale: string | null

  @column()
  declare pan_card_no: string | null

  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare birth_date: Date | null

  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare joining_date: Date | null

  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare resignation_date: Date | null

  @column({
    serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
  })
  declare retirement_date: Date | null

  @column()
  declare retirement_age: number | null

  @column()
  declare mobile_number: number

  @column()
  declare email: string | null

  @column()
  declare emergency_contact_name: string | null

  @column()
  declare emergency_contact_number: number | null

  @column()
  declare epf_no: number | null

  @column()
  declare epf_uan_no: number | null

  @column()
  declare qualification:
    | 'D.Ed'
    | 'B.Ed'
    | 'M.Ed'
    | 'B.A + B.Ed'
    | 'B.Sc + B.Ed'
    | 'M.A + B.Ed'
    | 'M.Sc + B.Ed'
    | 'Ph.D'
    | 'Diploma'
    | 'B.Com'
    | 'BBA'
    | 'MBA'
    | 'M.Com'
    | 'ITI'
    | 'SSC'
    | 'HSC'
    | 'Others'
    | null

  @column()
  declare subject_specialization:
    | 'Mathematics'
    | 'Physics'
    | 'Chemistry'
    | 'Biology'
    | 'English'
    | 'Hindi'
    | 'Gujarati'
    | 'Social Science'
    | 'Computer Science'
    | 'Commerce'
    | 'Economics'
    | 'Physical Education'
    | 'Arts'
    | 'Music'
    | 'Others'
    | null

  @column()
  declare blood_group: string | null

  @column()
  declare employment_status:
    | 'Permanent'
    | 'Trial_Period'
    | 'Resigned'
    | 'Contract_Based'
    | 'Notice_Period'

  @belongsTo(() => StaffMaster, {
    localKey: 'id',
    foreignKey: 'staff_role_id',
  })
  declare role_type: BelongsTo<typeof StaffMaster>

  @hasOne(() => Schools, {
    localKey: 'school_id',
    foreignKey: 'id',
  })
  declare school: HasOne<typeof Schools>

  @hasMany(() => ClassTeacherMaster, {
    localKey: 'id',
    foreignKey: 'staff_id',
  })
  declare assigend_classes: HasMany<typeof ClassTeacherMaster>

  @hasMany(() => StaffEnrollment, {
    localKey: 'id',
    foreignKey: 'staff_id',
  })
  declare enrollments: HasMany<typeof StaffEnrollment>
}
