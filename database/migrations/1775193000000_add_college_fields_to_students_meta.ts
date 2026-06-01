import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students_meta'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Address Details
      table.string('current_area').nullable()
      table.string('current_country').nullable()
      table.text('permanent_address').nullable()
      table.string('permanent_area').nullable()
      table.string('permanent_city').nullable()
      table.string('permanent_state').nullable()
      table.string('permanent_pincode').nullable()
      table.string('permanent_country').nullable()
      table.string('country_code').nullable()
      table.string('nationality').nullable()
      table.string('student_code').nullable()
      table.string('guardian_name_in_guj').nullable()
      table.string('admission_year').nullable()

      // Academic/Admission
      table.string('admission_standard').nullable()
      table.string('subject_group').nullable()
      table.string('birth_taluka').nullable()
      table.string('birth_district').nullable()
      table.string('student_leaving_reason').nullable()
      table.date('student_lc_date').nullable()
      table.string('student_lc_no').nullable()
      table.string('pen').nullable()
      table.string('abha_card_no').nullable()
      table.string('school_udise_no').nullable()

      // Family & Contact
      table.string('email_id').nullable()
      table.string('website').nullable()
      table.string('mother_tongue').nullable()

      // Father Details
      table.string('father_qualification').nullable()
      table.string('father_occupation').nullable()
      table.string('father_email').nullable()
      table.string('father_organisation').nullable()
      table.text('father_office_address').nullable()
      table.string('father_office_phone').nullable()
      table.string('father_mobile').nullable()

      // Mother Details
      table.string('mother_qualification').nullable()
      table.string('mother_occupation').nullable()
      table.string('mother_email').nullable()
      table.string('mother_organisation').nullable()
      table.text('mother_office_address').nullable()
      table.string('mother_office_phone').nullable()
      table.string('mother_mobile').nullable()

      // Guardian Details
      table.string('guardian_name').nullable()
      table.string('guardian_qualification').nullable()
      table.string('guardian_occupation').nullable()
      table.string('guardian_email').nullable()
      table.string('guardian_organisation').nullable()
      table.text('guardian_office_address').nullable()
      table.string('guardian_office_phone').nullable()
      table.string('guardian_mobile').nullable()
      table.string('guardian_relation').nullable()

      // Academic History
      table.string('ssc_passing_year').nullable()
      table.string('hsc_passing_year').nullable()
      table.integer('hsc_attempts').nullable()
      table.decimal('hsc_obtained_marks', 8, 2).nullable()
      table.decimal('hsc_pcb_marks_with_practical', 8, 2).nullable()

      // College Specific
      table.string('entrance_exam_name').nullable()
      table.decimal('neet_score', 8, 2).nullable()
      table.string('neet_roll_no').nullable()
      table.string('neet_application_number').nullable()
      table.integer('neet_all_india_rank').nullable()
      table.string('neet_percentile').nullable()
      table.integer('general_merit').nullable()
      table.integer('category_merit').nullable()

      // Internship Details
      table.string('internship_provisional_number').nullable()
      table.date('internship_provisional_date').nullable()
      table.date('internship_starting_date').nullable()
      table.date('internship_completion_date').nullable()

      // Progress
      table.integer('first_year_attempt').nullable()
      table.integer('second_year_attempt').nullable()
      table.integer('third_year_attempt').nullable()
      table.integer('fourth_year_attempt').nullable()
      table.date('final_bhms_passing_date').nullable()

      // Administrative
      table.string('ayush_id').nullable()
      table.string('abc_id').nullable()
      table.boolean('admission_cancel').defaultTo(false).nullable()
      table.string('admission_cancel_year').nullable()
      table.date('admission_cancel_date').nullable()
      table.boolean('admission_transfer').defaultTo(false).nullable()
      table.date('admission_transfer_date').nullable()
      table.string('admission_transfer_to_college').nullable()
      table.string('admission_transfer_from_college').nullable()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns(
        'current_area',
        'current_country',
        'permanent_address',
        'permanent_area',
        'permanent_city',
        'permanent_state',
        'permanent_pincode',
        'permanent_country',
        'country_code',
        'nationality',
        'student_code',
        'guardian_name_in_guj',
        'admission_year',
        'admission_standard',
        'subject_group',
        'birth_taluka',
        'birth_district',
        'student_leaving_reason',
        'student_lc_date',
        'student_lc_no',
        'pen',
        'abha_card_no',
        'school_udise_no',
        'email_id',
        'website',
        'mother_tongue',
        'father_qualification',
        'father_occupation',
        'father_email',
        'father_organisation',
        'father_office_address',
        'father_office_phone',
        'father_mobile',
        'mother_qualification',
        'mother_occupation',
        'mother_email',
        'mother_organisation',
        'mother_office_address',
        'mother_office_phone',
        'mother_mobile',
        'guardian_name',
        'guardian_qualification',
        'guardian_occupation',
        'guardian_email',
        'guardian_organisation',
        'guardian_office_address',
        'guardian_office_phone',
        'guardian_mobile',
        'guardian_relation',
        'ssc_passing_year',
        'hsc_passing_year',
        'hsc_attempts',
        'hsc_obtained_marks',
        'hsc_pcb_marks_with_practical',
        'entrance_exam_name',
        'neet_score',
        'neet_roll_no',
        'neet_application_number',
        'neet_all_india_rank',
        'neet_percentile',
        'general_merit',
        'category_merit',
        'internship_provisional_number',
        'internship_provisional_date',
        'internship_starting_date',
        'internship_completion_date',
        'first_year_attempt',
        'second_year_attempt',
        'third_year_attempt',
        'fourth_year_attempt',
        'final_bhms_passing_date',
        'ayush_id',
        'abc_id',
        'admission_cancel',
        'admission_cancel_year',
        'admission_cancel_date',
        'admission_transfer',
        'admission_transfer_date',
        'admission_transfer_to_college',
        'admission_transfer_from_college'
      )
    })
  }
}
