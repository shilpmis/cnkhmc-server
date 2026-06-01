//import { DateTime } from 'luxon'
//import { column } from '@ioc:Adonis/Lucid/Orm'
import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

export default class StudentMeta extends Base {

    public static table = "students_meta"

    @column()
    declare student_id : number 

    @column()
    declare aadhar_dise_no :number | null

    @column()
    declare birth_place :string | null

    @column()
    declare birth_place_in_guj :string | null 

    @column()
    declare religion :string | null

    @column()
    declare religion_in_guj :string | null 

    @column()
    declare caste :string | null

    @column()
    declare caste_in_guj :string | null 

    @column()
    declare category :'ST' | 'SC' | 'OBC' | 'OPEN' | null

    @column()
    declare blood_group : 'A+'| 'A-'| 'B+'| 'B-'| 'O+'| 'O-'| 'AB+'| 'AB-' | null

    @column()
    declare identification_mark : string | null

    @column()
    declare residence_type : 'day_scholar'| 'residential' | 'semi_residential' | null

    @column({
        serialize: (value: Date) => Base.serializeDateAsSQLDateString(value),
      })
    declare admission_date :Date | null


    @column()
    declare admission_class_id :number | null

    @column()
    declare secondary_mobile :number | null

    @column()
    declare privious_school :string | null

    @column()
    declare privious_school_in_guj :string | null  

    @column()
    declare address :string  | null

    @column()
    declare district :string | null

    @column()
    declare city :string  | null

    @column()
    declare state :string  | null

    @column()
    declare postal_code :string  | null

    @column()
    declare bank_name :string  | null

    @column()
    declare account_no :number  | null

    @column({ columnName: 'IFSC_code' , serializeAs: 'IFSC_code' })
    declare IFSC_code: string | null

    @column()
    declare current_area: string | null

    @column()
    declare current_country: string | null

    @column()
    declare permanent_address: string | null

    @column()
    declare permanent_area: string | null

    @column()
    declare permanent_city: string | null

    @column()
    declare permanent_state: string | null

    @column()
    declare permanent_pincode: string | null

    @column()
    declare permanent_country: string | null

    @column()
    declare country_code: string | null

    @column()
    declare nationality: string | null

    @column()
    declare student_code: string | null

    @column()
    declare guardian_name_in_guj: string | null

    @column()
    declare admission_year: string | null

    @column()
    declare admission_standard: string | null

    @column()
    declare subject_group: string | null

    @column()
    declare birth_taluka: string | null

    @column()
    declare birth_district: string | null

    @column()
    declare student_leaving_reason: string | null

    @column({
        serialize: (value: Date) => value ? Base.serializeDateAsSQLDateString(value) : null,
    })
    declare student_lc_date: Date | null

    @column()
    declare student_lc_no: string | null

    @column()
    declare pen: string | null

    @column()
    declare abha_card_no: string | null

    @column()
    declare school_udise_no: string | null

    @column()
    declare email_id: string | null

    @column()
    declare website: string | null

    @column()
    declare mother_tongue: string | null

    @column()
    declare father_qualification: string | null

    @column()
    declare father_occupation: string | null

    @column()
    declare father_email: string | null

    @column()
    declare father_organisation: string | null

    @column()
    declare father_office_address: string | null

    @column()
    declare father_office_phone: string | null

    @column()
    declare father_mobile: string | null

    @column()
    declare mother_qualification: string | null

    @column()
    declare mother_occupation: string | null

    @column()
    declare mother_email: string | null

    @column()
    declare mother_organisation: string | null

    @column()
    declare mother_office_address: string | null

    @column()
    declare mother_office_phone: string | null

    @column()
    declare mother_mobile: string | null

    @column()
    declare guardian_name: string | null

    @column()
    declare guardian_qualification: string | null

    @column()
    declare guardian_occupation: string | null

    @column()
    declare guardian_email: string | null

    @column()
    declare guardian_organisation: string | null

    @column()
    declare guardian_office_address: string | null

    @column()
    declare guardian_office_phone: string | null

    @column()
    declare guardian_mobile: string | null

    @column()
    declare guardian_relation: string | null

    @column()
    declare ssc_passing_year: string | null

    @column()
    declare hsc_passing_year: string | null

    @column()
    declare hsc_attempts: number | null

    @column()
    declare hsc_obtained_marks: number | null

    @column()
    declare hsc_pcb_marks_with_practical: number | null

    @column()
    declare entrance_exam_name: string | null

    @column()
    declare neet_score: number | null

    @column()
    declare neet_roll_no: string | null

    @column()
    declare neet_application_number: string | null

    @column()
    declare neet_all_india_rank: number | null

    @column()
    declare neet_percentile: string | null

    @column()
    declare general_merit: number | null

    @column()
    declare category_merit: number | null

    @column()
    declare internship_provisional_number: string | null

    @column({
        serialize: (value: Date) => value ? Base.serializeDateAsSQLDateString(value) : null,
    })
    declare internship_provisional_date: Date | null

    @column({
        serialize: (value: Date) => value ? Base.serializeDateAsSQLDateString(value) : null,
    })
    declare internship_starting_date: Date | null

    @column({
        serialize: (value: Date) => value ? Base.serializeDateAsSQLDateString(value) : null,
    })
    declare internship_completion_date: Date | null

    @column()
    declare first_year_attempt: number | null

    @column()
    declare second_year_attempt: number | null

    @column()
    declare third_year_attempt: number | null

    @column()
    declare fourth_year_attempt: number | null

    @column({
        serialize: (value: Date) => value ? Base.serializeDateAsSQLDateString(value) : null,
    })
    declare final_bhms_passing_date: Date | null

    @column()
    declare ayush_id: string | null

    @column()
    declare abc_id: string | null

    @column()
    declare admission_cancel: boolean | null

    @column()
    declare admission_cancel_year: string | null

    @column({
        serialize: (value: Date) => value ? Base.serializeDateAsSQLDateString(value) : null,
    })
    declare admission_cancel_date: Date | null

    @column()
    declare admission_transfer: boolean | null

    @column({
        serialize: (value: Date) => value ? Base.serializeDateAsSQLDateString(value) : null,
    })
    declare admission_transfer_date: Date | null

    @column()
    declare admission_transfer_to_college: string | null

    @column()
    declare admission_transfer_from_college: string | null

    @column()
    declare sub_caste: string | null

    @column()
    declare quota_fees: string | null

    @column()
    declare activity_house: string | null

    @column()
    declare bank_branch_name: string | null
}