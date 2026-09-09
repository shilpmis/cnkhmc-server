import vine from '@vinejs/vine'

export const CreateValidatorStundet = vine.compile(
  vine.object({
    students_data: vine.object({
      class_id: vine.number(),
      enrollment_code: vine.string().trim().maxLength(100).unique({ table: 'students', column: 'enrollment_code' }).nullable().optional(),
      admission_number: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
      first_name: vine.string().trim().minLength(2).maxLength(50),
      middle_name: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
      last_name: vine.string().trim().minLength(2).maxLength(50),

      first_name_in_guj: vine.string().trim().optional().nullable().optional(),
      middle_name_in_guj: vine.string().trim().optional().nullable().optional(),
      last_name_in_guj: vine.string().trim().optional().nullable().optional(),

      gender: vine.enum(['Male', 'Female']).nullable().optional(),

      birth_date: vine.date().nullable().optional(),

      /**
       * FIX : this should be unique in between school's students
       */
      gr_no: vine.number().positive().unique({ table: 'students', column: 'gr_no' }).nullable().optional(),

      primary_mobile: vine.number(),

      father_name: vine.string().trim().minLength(3).maxLength(50).nullable().optional(),
      father_name_in_guj: vine.string().trim().nullable().optional(),

      mother_name: vine.string().trim().minLength(3).maxLength(50).nullable().optional(),
      mother_name_in_guj: vine.string().trim().nullable().optional(),

      /**
       * FIX : make this optional or remove roll number from table in next migrtion
       *  */
      roll_number: vine.number().positive().nullable().optional(),

      aadhar_no: vine
        .number()
        // .unique({ table: 'students', column: 'aadhar_no' })
        .nullable()
        .optional(),

      is_active: vine.boolean().nullable().optional(),
      remarks: vine.string().trim().nullable().optional(),
      student_type: vine.enum(['SCHOOL', 'COLLEGE']).nullable().optional(),
      practical_batch: vine.string().trim().nullable().optional(),
    }),
    student_meta_data: vine.object({
      aadhar_dise_no: vine
        .number()
        .positive()
        // .unique({ table: 'students_meta', column: 'aadhar_dise_no' })
        .nullable()
        .optional(),

      birth_place: vine.string().trim().minLength(2).maxLength(100).nullable().optional(),
      birth_place_in_guj: vine.string().trim().nullable().optional(),

      religion: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
      religion_in_guj: vine.string().trim().nullable().optional(),

      caste: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
      caste_in_guj: vine.string().trim().nullable().optional(),

      category: vine.enum(['ST', 'SC', 'OBC', 'OPEN']).nullable().optional(),

      blood_group: vine
        .enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])
        .nullable()
        .optional(),

      identification_mark: vine.string().trim().optional().nullable().optional(),

      residence_type: vine
        .enum(['day_scholar', 'residential', 'semi_residential'])
        .nullable()
        .optional(),

      admission_date: vine.date().nullable().optional(),

      admission_class_id: vine.number().nullable().optional(),

      secondary_mobile: vine.number().nullable().optional(),

      privious_school: vine.string().trim().nullable().optional(), //.minLength(5).maxLength(100).nullable().optional(),
      privious_school_in_guj: vine.string().trim().optional().nullable().optional(),

      address: vine.string().trim().minLength(5).maxLength(200).nullable().optional(),

      district: vine.string().trim().minLength(3).maxLength(100).nullable().optional(),
      city: vine.string().trim().minLength(3).maxLength(100).nullable().optional(),

      state: vine.string().trim().minLength(3).maxLength(50).nullable().optional(),

      postal_code: vine.string().trim().nullable().optional(),

      bank_name: vine.string().trim().nullable().optional(),

      account_no: vine.number().positive().nullable().optional(),

      IFSC_code: vine.string().trim().nullable().optional(),

      current_area: vine.string().trim().nullable().optional(),
      current_country: vine.string().trim().nullable().optional(),
      permanent_address: vine.string().trim().nullable().optional(),
      permanent_area: vine.string().trim().nullable().optional(),
      permanent_city: vine.string().trim().nullable().optional(),
      permanent_state: vine.string().trim().nullable().optional(),
      permanent_pincode: vine.string().trim().nullable().optional(),
      permanent_country: vine.string().trim().nullable().optional(),
      country_code: vine.string().trim().nullable().optional(),
      nationality: vine.string().trim().nullable().optional(),
      student_code: vine.string().trim().nullable().optional(),
      guardian_name_in_guj: vine.string().trim().nullable().optional(),
      admission_year: vine.string().trim().nullable().optional(),

      admission_standard: vine.string().trim().nullable().optional(),
      subject_group: vine.string().trim().nullable().optional(),
      birth_taluka: vine.string().trim().nullable().optional(),
      birth_district: vine.string().trim().nullable().optional(),
      student_leaving_reason: vine.string().trim().nullable().optional(),
      student_lc_date: vine.date().nullable().optional(),
      student_lc_no: vine.string().trim().nullable().optional(),
      pen: vine.string().trim().nullable().optional(),
      abha_card_no: vine.string().trim().nullable().optional(),
      school_udise_no: vine.string().trim().nullable().optional(),

      email_id: vine.string().trim().nullable().optional(),
      website: vine.string().trim().nullable().optional(),
      mother_tongue: vine.string().trim().nullable().optional(),

      father_qualification: vine.string().trim().nullable().optional(),
      father_occupation: vine.string().trim().nullable().optional(),
      father_email: vine.string().trim().nullable().optional(),
      father_organisation: vine.string().trim().nullable().optional(),
      father_office_address: vine.string().trim().nullable().optional(),
      father_office_phone: vine.string().trim().nullable().optional(),
      father_mobile: vine.string().trim().nullable().optional(),

      mother_qualification: vine.string().trim().nullable().optional(),
      mother_occupation: vine.string().trim().nullable().optional(),
      mother_email: vine.string().trim().nullable().optional(),
      mother_organisation: vine.string().trim().nullable().optional(),
      mother_office_address: vine.string().trim().nullable().optional(),
      mother_office_phone: vine.string().trim().nullable().optional(),
      mother_mobile: vine.string().trim().nullable().optional(),

      guardian_name: vine.string().trim().nullable().optional(),
      guardian_qualification: vine.string().trim().nullable().optional(),
      guardian_occupation: vine.string().trim().nullable().optional(),
      guardian_email: vine.string().trim().nullable().optional(),
      guardian_organisation: vine.string().trim().nullable().optional(),
      guardian_office_address: vine.string().trim().nullable().optional(),
      guardian_office_phone: vine.string().trim().nullable().optional(),
      guardian_mobile: vine.string().trim().nullable().optional(),
      guardian_relation: vine.string().trim().nullable().optional(),

      ssc_passing_year: vine.string().trim().nullable().optional(),
      hsc_passing_year: vine.string().trim().nullable().optional(),
      hsc_attempts: vine.number().nullable().optional(),
      hsc_obtained_marks: vine.number().nullable().optional(),
      hsc_pcb_marks_with_practical: vine.number().nullable().optional(),

      entrance_exam_name: vine.string().trim().nullable().optional(),
      neet_score: vine.number().nullable().optional(),
      neet_roll_no: vine.string().trim().nullable().optional(),
      neet_application_number: vine.string().trim().nullable().optional(),
      neet_all_india_rank: vine.number().nullable().optional(),
      neet_percentile: vine.string().trim().nullable().optional(),
      general_merit: vine.number().nullable().optional(),
      category_merit: vine.number().nullable().optional(),

      internship_provisional_number: vine.string().trim().nullable().optional(),
      internship_provisional_date: vine.date().nullable().optional(),
      internship_starting_date: vine.date().nullable().optional(),
      internship_completion_date: vine.date().nullable().optional(),

      first_year_attempt: vine.number().nullable().optional(),
      second_year_attempt: vine.number().nullable().optional(),
      third_year_attempt: vine.number().nullable().optional(),
      fourth_year_attempt: vine.number().nullable().optional(),
      final_bhms_passing_date: vine.date().nullable().optional(),

      ayush_id: vine.string().trim().nullable().optional(),
      abc_id: vine.string().trim().nullable().optional(),
      admission_cancel: vine.boolean().nullable().optional(),
      admission_cancel_year: vine.string().trim().nullable().optional(),
      admission_cancel_date: vine.date().nullable().optional(),
      admission_transfer: vine.boolean().nullable().optional(),
      admission_transfer_date: vine.date().nullable().optional(),
      admission_transfer_to_college: vine.string().trim().nullable().optional(),
      admission_transfer_from_college: vine.string().trim().nullable().optional(),

      sub_caste: vine.string().trim().nullable().optional(),
      quota_fees: vine.string().trim().nullable().optional(),
      activity_house: vine.string().trim().nullable().optional(),
      bank_branch_name: vine.string().trim().nullable().optional(),
    }),
  })
)

export const CreateValidatorForUpload = vine.compile(
  vine.object({
    students_data: vine.object({
      school_id: vine.number(),
      enrollment_code: vine.string().trim().maxLength(100).unique({ table: 'students', column: 'enrollment_code' }).nullable().optional(),
      first_name: vine.string().trim().minLength(2).maxLength(50),
      middle_name: vine.string().trim().optional(),
      last_name: vine.string().trim().minLength(2).maxLength(50),

      first_name_in_guj: vine.string().trim().nullable(),
      middle_name_in_guj: vine.string().trim().nullable(),
      last_name_in_guj: vine.string().trim().nullable(),

      gender: vine.enum(['Male', 'Female']).nullable().optional(),

      birth_date: vine.date().nullable().optional(),

      /**
       * FIX : this should be unique in between school's students
       */
      gr_no: vine.number().positive().nullable().optional(),

      primary_mobile: vine.number(),

      father_name: vine.string().trim().minLength(3).maxLength(50).nullable(),
      father_name_in_guj: vine.string().trim().nullable(),

      mother_name: vine.string().trim().minLength(3).maxLength(50).nullable(),
      mother_name_in_guj: vine.string().trim().nullable(),

      /**
       * FIX : make this optional or remove roll number from table in next migrtion
       *  */
      roll_number: vine.number().positive().nullable().optional(),
      first_year_roll_number: vine.number().positive().nullable().optional(),
      second_year_roll_number: vine.number().positive().nullable().optional(),
      third_year_roll_number: vine.number().positive().nullable().optional(),
      fourth_year_roll_number: vine.number().positive().nullable().optional(),

      aadhar_no: vine.number().nullable(),

      is_active: vine.boolean().nullable().optional(),
      student_type: vine.enum(['SCHOOL', 'COLLEGE']).optional(),
      practical_batch: vine.string().trim().nullable().optional(),
    }),
    student_meta_data: vine
      .object({
        aadhar_dise_no: vine
          .number()
          // .unique({ table: 'students_meta', column: 'aadhar_dise_no' })
          .nullable(),

        birth_place: vine.string().trim().minLength(2).maxLength(100).nullable(),
        birth_place_in_guj: vine.string().trim().nullable(),

        religion: vine.string().trim().minLength(2).maxLength(50).nullable(),
        religion_in_guj: vine.string().trim().nullable(),

        caste: vine.string().trim().minLength(2).maxLength(50).nullable(),
        caste_in_guj: vine.string().trim().nullable(),

        category: vine.enum(['ST', 'SC', 'OBC', 'OPEN']).nullable().optional(),

        admission_date: vine.date().nullable().optional(),

        admission_class_id: vine.number().nullable().optional(),

        secondary_mobile: vine.number().nullable(),

        privious_school: vine.string().trim().minLength(2).maxLength(100).nullable().optional(),
        privious_school_in_guj: vine.string().trim().optional().nullable(),

        address: vine.string().trim().minLength(5).maxLength(200).nullable(),

        district: vine.string().trim().minLength(3).maxLength(100).nullable().optional(),
        city: vine.string().trim().minLength(3).maxLength(100).nullable(),

        state: vine.string().trim().minLength(3).maxLength(50).nullable(),

        postal_code: vine.string().trim().nullable(),

        bank_name: vine.string().trim().nullable(),

        account_no: vine.number().positive().nullable().optional(),

        IFSC_code: vine.string().trim().nullable().optional(),

        current_area: vine.string().trim().nullable().optional(),
        current_country: vine.string().trim().nullable().optional(),
        permanent_address: vine.string().trim().nullable().optional(),
        permanent_area: vine.string().trim().nullable().optional(),
        permanent_city: vine.string().trim().nullable().optional(),
        permanent_state: vine.string().trim().nullable().optional(),
        permanent_pincode: vine.string().trim().nullable().optional(),
        permanent_country: vine.string().trim().nullable().optional(),
        country_code: vine.string().trim().nullable().optional(),
        nationality: vine.string().trim().nullable().optional(),
        student_code: vine.string().trim().nullable().optional(),
        guardian_name_in_guj: vine.string().trim().nullable().optional(),
        admission_year: vine.string().trim().nullable().optional(),

        admission_standard: vine.string().trim().nullable().optional(),
        subject_group: vine.string().trim().nullable().optional(),
        birth_taluka: vine.string().trim().nullable().optional(),
        birth_district: vine.string().trim().nullable().optional(),
        student_leaving_reason: vine.string().trim().nullable().optional(),
        student_lc_date: vine.date().nullable().optional(),
        student_lc_no: vine.string().trim().nullable().optional(),
        pen: vine.string().trim().nullable().optional(),
        abha_card_no: vine.string().trim().nullable().optional(),
        school_udise_no: vine.string().trim().nullable().optional(),

        email_id: vine.string().trim().nullable().optional(),
        website: vine.string().trim().nullable().optional(),
        mother_tongue: vine.string().trim().nullable().optional(),

        father_qualification: vine.string().trim().nullable().optional(),
        father_occupation: vine.string().trim().nullable().optional(),
        father_email: vine.string().trim().nullable().optional(),
        father_organisation: vine.string().trim().nullable().optional(),
        father_office_address: vine.string().trim().nullable().optional(),
        father_office_phone: vine.string().trim().nullable().optional(),
        father_mobile: vine.string().trim().nullable().optional(),

        mother_qualification: vine.string().trim().nullable().optional(),
        mother_occupation: vine.string().trim().nullable().optional(),
        mother_email: vine.string().trim().nullable().optional(),
        mother_organisation: vine.string().trim().nullable().optional(),
        mother_office_address: vine.string().trim().nullable().optional(),
        mother_office_phone: vine.string().trim().nullable().optional(),
        mother_mobile: vine.string().trim().nullable().optional(),

        guardian_name: vine.string().trim().nullable().optional(),
        guardian_qualification: vine.string().trim().nullable().optional(),
        guardian_occupation: vine.string().trim().nullable().optional(),
        guardian_email: vine.string().trim().nullable().optional(),
        guardian_organisation: vine.string().trim().nullable().optional(),
        guardian_office_address: vine.string().trim().nullable().optional(),
        guardian_office_phone: vine.string().trim().nullable().optional(),
        guardian_mobile: vine.string().trim().nullable().optional(),
        guardian_relation: vine.string().trim().nullable().optional(),

        ssc_passing_year: vine.string().trim().nullable().optional(),
        hsc_passing_year: vine.string().trim().nullable().optional(),
        hsc_attempts: vine.number().nullable().optional(),
        hsc_obtained_marks: vine.number().nullable().optional(),
        hsc_pcb_marks_with_practical: vine.number().nullable().optional(),

        entrance_exam_name: vine.string().trim().nullable().optional(),
        neet_score: vine.number().nullable().optional(),
        neet_roll_no: vine.string().trim().nullable().optional(),
        neet_application_number: vine.string().trim().nullable().optional(),
        neet_all_india_rank: vine.number().nullable().optional(),
        neet_percentile: vine.string().trim().nullable().optional(),
        general_merit: vine.number().nullable().optional(),
        category_merit: vine.number().nullable().optional(),

        internship_provisional_number: vine.string().trim().nullable().optional(),
        internship_provisional_date: vine.date().nullable().optional(),
        internship_starting_date: vine.date().nullable().optional(),
        internship_completion_date: vine.date().nullable().optional(),

        first_year_attempt: vine.number().nullable().optional(),
        second_year_attempt: vine.number().nullable().optional(),
        third_year_attempt: vine.number().nullable().optional(),
        fourth_year_attempt: vine.number().nullable().optional(),
        final_bhms_passing_date: vine.date().nullable().optional(),

        ayush_id: vine.string().trim().nullable().optional(),
        abc_id: vine.string().trim().nullable().optional(),
        admission_cancel: vine.boolean().nullable().optional(),
        admission_cancel_year: vine.string().trim().nullable().optional(),
        admission_cancel_date: vine.date().nullable().optional(),
        admission_transfer: vine.boolean().nullable().optional(),
        admission_transfer_date: vine.date().nullable().optional(),
        admission_transfer_to_college: vine.string().trim().nullable().optional(),
        admission_transfer_from_college: vine.string().trim().nullable().optional(),

        sub_caste: vine.string().trim().nullable().optional(),
        quota_fees: vine.string().trim().nullable().optional(),
        activity_house: vine.string().trim().nullable().optional(),
        bank_branch_name: vine.string().trim().nullable().optional(),
      })
      .optional(),
  })
)

export const CreateValidatorForMultipleStundets = vine.compile(
  vine
    .array(
      vine.object({
        // add here
        students_data: vine.object({
          first_name: vine.string().trim().minLength(2).maxLength(50),
          middle_name: vine.string().trim().minLength(2).maxLength(50).optional(),
          last_name: vine.string().trim().minLength(2).maxLength(50),

          first_name_in_guj: vine.string().trim().optional(),
          middle_name_in_guj: vine.string().trim().optional(),
          last_name_in_guj: vine.string().trim().optional(),

          gender: vine.enum(['Male', 'Female']).nullable().optional(),

          birth_date: vine.date().optional(),

          /**
           * FIX : this should be unique in between school's students
           */
          gr_no: vine.number().positive().unique({ table: 'students', column: 'gr_no' }).nullable().optional(),

          primary_mobile: vine.number(),

          father_name: vine.string().trim().minLength(3).maxLength(50),
          father_name_in_guj: vine.string().trim().optional(),

          mother_name: vine.string().trim().minLength(3).maxLength(50).optional(),
          mother_name_in_guj: vine.string().trim().optional(),

          /**
           * FIX : make this optional or remove roll number from table in next migrtion
           *  */
          roll_number: vine.number().positive().optional(),

          aadhar_no: vine.number(),

          is_active: vine.boolean().nullable().optional(),
          practical_batch: vine.string().trim().nullable().optional(),
        }),
        student_meta_data: vine
          .object({
            // student_id: vine.number().exists({ table: 'students', column: 'id' }),

            aadhar_dise_no: vine
              .number()
              .positive()
              // .unique({ table: 'student_meta', column: 'aadhar_dise_no' })
              .optional(),

            birth_place: vine.string().trim().minLength(2).maxLength(100).optional(),
            birth_place_in_guj: vine.string().trim().optional(),

            religion: vine.string().trim().minLength(2).maxLength(50).optional(),
            religion_in_guj: vine.string().trim().optional(),

            caste: vine.string().trim().minLength(2).maxLength(50).optional(),
            caste_in_guj: vine.string().trim().optional(),

            category: vine.enum(['ST', 'SC', 'OBC', 'OPEN']).nullable().optional(),

            admission_date: vine.date().optional(),

            admission_class_id: vine.number().optional(),

            secondary_mobile: vine.number().optional(),

            privious_school: vine.string().trim().minLength(5).maxLength(100).optional(),
            privious_school_in_guj: vine.string().trim().optional().optional(),

            address: vine.string().trim().minLength(5).maxLength(200).optional(),

            district: vine.string().trim().minLength(3).maxLength(100).optional(),
            city: vine.string().trim().minLength(3).maxLength(100).optional(),

            state: vine.string().trim().minLength(3).maxLength(50).optional(),

            postal_code: vine.string().trim().optional(),
            // .check((value, field) => {
            //   if (!/^\d{6}$/.test(value)) {
            //     field.report('Postal code must be exactly 6 digits.')
            //   }
            // }),

            bank_name: vine.string().trim().optional(),

            account_no: vine.number().positive().optional(),

            IFSC_code: vine.string().trim().optional(),
            // .check((value, field) => {
            //   if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) {
            //     field.report('Invalid IFSC code format.')
            //   }
            // }),
          })
          .optional(),
      })
    )
    .minLength(1)
)

/**
 * Validates the post's update action
 */
export const UpdateValidatorForStundets = vine.compile(
  vine.object({
    // add here
    students_data: vine
      .object({
        first_name: vine.string().trim().minLength(2).maxLength(50).optional(),
        middle_name: vine.string().trim().minLength(2).maxLength(50).optional(),
        last_name: vine.string().trim().minLength(2).maxLength(50).optional(),

        first_name_in_guj: vine.string().trim().optional(),
        middle_name_in_guj: vine.string().trim().optional(),
        last_name_in_guj: vine.string().trim().optional(),

        gender: vine.enum(['Male', 'Female']).optional(),

        birth_date: vine.date().optional(),

        /**
         * FIX : this should be unique in between school's students
         */
        gr_no: vine.number().positive().unique({ table: 'students', column: 'gr_no' }).optional(),

        primary_mobile: vine.number().optional(),

        father_name: vine.string().trim().minLength(3).maxLength(50).optional(),
        father_name_in_guj: vine.string().trim().optional(),

        mother_name: vine.string().trim().minLength(3).maxLength(50).optional(),
        mother_name_in_guj: vine.string().trim().optional(),

        /**
         * FIX : make this optional or remove roll number from table in next migrtion
         *  */
        roll_number: vine.number().positive().optional(),

        aadhar_no: vine.number().optional(),

        is_active: vine.boolean().optional(),
        class_id: vine.number().optional(),
        practical_batch: vine.string().trim().nullable().optional(),
      })
      .optional(),

    student_meta_data: vine
      .object({
        // student_id: vine.number().exists({ table: 'students', column: 'id' }),

        aadhar_dise_no: vine
          .number()
          .positive()
          // .unique({ table: 'students_meta', column: 'aadhar_dise_no' })
          .optional(),

        birth_place: vine.string().trim().minLength(2).maxLength(100).optional(),
        birth_place_in_guj: vine.string().trim().optional(),

        religion: vine.string().trim().minLength(2).maxLength(50).optional(),
        religion_in_guj: vine.string().trim().optional(),

        caste: vine.string().trim().minLength(2).maxLength(50).optional(),
        caste_in_guj: vine.string().trim().optional().optional(),

        category: vine.enum(['ST', 'SC', 'OBC', 'OPEN']).nullable().optional(),

        admission_date: vine.date().optional(),

        /**
         * TODO :
         *    validation for verify class added is not greater then in which student acctualy in
         */
        admission_class_id: vine.number().optional(),

        secondary_mobile: vine.number().optional(),

        privious_school: vine.string().trim().minLength(2).maxLength(100).optional(),
        privious_school_in_guj: vine.string().trim().optional().optional(),

        address: vine.string().trim().minLength(5).maxLength(200).optional(),

        district: vine.string().trim().minLength(5).maxLength(100).optional(),
        city: vine.string().trim().minLength(5).maxLength(100).optional(),

        state: vine.string().trim().minLength(2).maxLength(50).optional(),

        postal_code: vine.string().trim().optional(),

        bank_name: vine.string().trim().optional(),

        account_no: vine.number().positive().optional(),

        IFSC_code: vine.string().trim().optional(),

        current_area: vine.string().trim().nullable().optional(),
        current_country: vine.string().trim().nullable().optional(),
        permanent_address: vine.string().trim().nullable().optional(),
        permanent_area: vine.string().trim().nullable().optional(),
        permanent_city: vine.string().trim().nullable().optional(),
        permanent_state: vine.string().trim().nullable().optional(),
        permanent_pincode: vine.string().trim().nullable().optional(),
        permanent_country: vine.string().trim().nullable().optional(),
        country_code: vine.string().trim().nullable().optional(),
        nationality: vine.string().trim().nullable().optional(),
        student_code: vine.string().trim().nullable().optional(),
        guardian_name_in_guj: vine.string().trim().nullable().optional(),
        admission_year: vine.string().trim().nullable().optional(),

        admission_standard: vine.string().trim().nullable().optional(),
        subject_group: vine.string().trim().nullable().optional(),
        birth_taluka: vine.string().trim().nullable().optional(),
        birth_district: vine.string().trim().nullable().optional(),
        student_leaving_reason: vine.string().trim().nullable().optional(),
        student_lc_date: vine.date().nullable().optional(),
        student_lc_no: vine.string().trim().nullable().optional(),
        pen: vine.string().trim().nullable().optional(),
        abha_card_no: vine.string().trim().nullable().optional(),
        school_udise_no: vine.string().trim().nullable().optional(),

        email_id: vine.string().trim().nullable().optional(),
        website: vine.string().trim().nullable().optional(),
        mother_tongue: vine.string().trim().nullable().optional(),

        father_qualification: vine.string().trim().nullable().optional(),
        father_occupation: vine.string().trim().nullable().optional(),
        father_email: vine.string().trim().nullable().optional(),
        father_organisation: vine.string().trim().nullable().optional(),
        father_office_address: vine.string().trim().nullable().optional(),
        father_office_phone: vine.string().trim().nullable().optional(),
        father_mobile: vine.string().trim().nullable().optional(),

        mother_qualification: vine.string().trim().nullable().optional(),
        mother_occupation: vine.string().trim().nullable().optional(),
        mother_email: vine.string().trim().nullable().optional(),
        mother_organisation: vine.string().trim().nullable().optional(),
        mother_office_address: vine.string().trim().nullable().optional(),
        mother_office_phone: vine.string().trim().nullable().optional(),
        mother_mobile: vine.string().trim().nullable().optional(),

        guardian_name: vine.string().trim().nullable().optional(),
        guardian_qualification: vine.string().trim().nullable().optional(),
        guardian_occupation: vine.string().trim().nullable().optional(),
        guardian_email: vine.string().trim().nullable().optional(),
        guardian_organisation: vine.string().trim().nullable().optional(),
        guardian_office_address: vine.string().trim().nullable().optional(),
        guardian_office_phone: vine.string().trim().nullable().optional(),
        guardian_mobile: vine.string().trim().nullable().optional(),
        guardian_relation: vine.string().trim().nullable().optional(),

        ssc_passing_year: vine.string().trim().nullable().optional(),
        hsc_passing_year: vine.string().trim().nullable().optional(),
        hsc_attempts: vine.number().nullable().optional(),
        hsc_obtained_marks: vine.number().nullable().optional(),
        hsc_pcb_marks_with_practical: vine.number().nullable().optional(),

        entrance_exam_name: vine.string().trim().nullable().optional(),
        neet_score: vine.number().nullable().optional(),
        neet_roll_no: vine.string().trim().nullable().optional(),
        neet_application_number: vine.string().trim().nullable().optional(),
        neet_all_india_rank: vine.number().nullable().optional(),
        neet_percentile: vine.string().trim().nullable().optional(),
        general_merit: vine.number().nullable().optional(),
        category_merit: vine.number().nullable().optional(),

        internship_provisional_number: vine.string().trim().nullable().optional(),
        internship_provisional_date: vine.date().nullable().optional(),
        internship_starting_date: vine.date().nullable().optional(),
        internship_completion_date: vine.date().nullable().optional(),

        first_year_attempt: vine.number().nullable().optional(),
        second_year_attempt: vine.number().nullable().optional(),
        third_year_attempt: vine.number().nullable().optional(),
        fourth_year_attempt: vine.number().nullable().optional(),
        final_bhms_passing_date: vine.date().nullable().optional(),

        ayush_id: vine.string().trim().nullable().optional(),
        abc_id: vine.string().trim().nullable().optional(),
        admission_cancel: vine.boolean().nullable().optional(),
        admission_cancel_year: vine.string().trim().nullable().optional(),
        admission_cancel_date: vine.date().nullable().optional(),
        admission_transfer: vine.boolean().nullable().optional(),
        admission_transfer_date: vine.date().nullable().optional(),
        admission_transfer_to_college: vine.string().trim().nullable().optional(),
        admission_transfer_from_college: vine.string().trim().nullable().optional(),

        sub_caste: vine.string().trim().nullable().optional(),
        quota_fees: vine.string().trim().nullable().optional(),
        activity_house: vine.string().trim().nullable().optional(),
        bank_branch_name: vine.string().trim().nullable().optional(),
      })
      .optional(),
  })
)

export const ValidationForExportStudents = vine.compile(
  vine.object({
    students: vine
      .array(
        vine.enum([
          'first_name',
          'middle_name',
          'last_name',
          'first_name_in_guj',
          'middle_name_in_guj',
          'last_name_in_guj',
          'gender',
          'birth_date',
          'aadhar_no',
          'gr_no',
        ])
      )
      .minLength(1),
    student_meta: vine
      .array(vine.enum(['birth_place', 'birth_place_in_guj', 'aadhar_dise_no']))
      .minLength(1),
  })
)


export const createStudentValidatorForOnBoarding = vine.compile(
  vine.object({
      // class_id: vine.number(),
      first_name: vine.string().trim().minLength(2).maxLength(50),
      middle_name: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
      last_name: vine.string().trim().minLength(2).maxLength(50),
      birth_date : vine.date().nullable().optional(),
      class_id : vine.number(),
      division_id : vine.number(),
      gender: vine.enum(['Male', 'Female']).nullable().optional(),
      primary_mobile : vine.number(),
      father_name: vine.string().trim().minLength(3).maxLength(50).nullable().optional(),
      academic_year : vine.number(),
  }))