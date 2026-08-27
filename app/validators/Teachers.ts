import vine from "@vinejs/vine";

/**
 * Validates the post's creation action
 */
export const CreateValidatorForTeachers = vine.compile(

  vine.array(
    vine.object({
      // add here
      staff_role_id: vine.number(),
      first_name: vine.string().trim().minLength(2).maxLength(50),
      middle_name: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
      last_name: vine.string().trim().minLength(2).maxLength(50),

      first_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
      middle_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
      last_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),

      aadhar_no: vine.number()
        .unique({ table: 'teachers', column: 'aadhar_no' }),

      religion: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
      religion_in_guj: vine.string().trim().optional().nullable().optional(),
  
      caste: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
      caste_in_guj: vine.string().trim().optional().nullable().optional(),
  
      category: vine.enum(['ST', 'SC', 'OBC', 'OPEN']).optional(),

      address: vine.string().trim().minLength(5).maxLength(200).nullable().optional(),
  
      district: vine.string().trim().minLength(3).maxLength(100).nullable().optional(),
      city: vine.string().trim().minLength(3).maxLength(100).nullable().optional(),
  
      state: vine.string().trim().minLength(3).maxLength(50).nullable().optional(),
  
      postal_code: vine.number().nullable().optional(),
      
      bank_name: vine.string().trim().nullable().optional(),
      
      account_no: vine.number().positive().nullable().optional(),
  
      IFSC_code: vine.string().trim().nullable().optional(),

      gender: vine.enum(['Male', 'Female']),

      birth_date: vine.date().nullable().optional(),

      mobile_number: vine.number(),
      email: vine.string().email().nullable().optional(),

      class_id: vine.number().nullable().optional(),

      qualification: vine.string().nullable().optional(),
      joining_date: vine.date().nullable().optional(),

      employment_status: vine.enum(['Permanent', 'Trial_Period', 'Resigned', 'Contract_Based', 'Notice_Period']),

    })
  )
)

/**
 * Validates the post's update action
 */
export const UpdateValidatorForTeachers = vine.compile(
  vine.object({

    staff_role_id: vine.number().optional(),
    first_name: vine.string().trim().minLength(2).maxLength(50).optional(),
    middle_name: vine.string().trim().minLength(2).maxLength(50).optional(),
    last_name: vine.string().trim().minLength(2).maxLength(50).optional(),

    gender: vine.enum(['Male', 'Female']).optional(),

    birth_date: vine.date().optional(),

    mobile_number: vine.number().optional(),
    email: vine.string().email().optional(),

    qualification: vine.string().optional(),
    joining_date: vine.date().optional(),
    employment_status: vine.enum(['Permanent', 'Trial_Period', 'Resigned', 'Contract_Based', 'Notice_Period']).optional(),

  })
)

export const CreateValidatorForSingleTeacher = vine.compile(
  vine.object({
    // add here
    staff_role_id: vine.number(),
    first_name: vine.string().trim().minLength(2).maxLength(50),
    middle_name: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    last_name: vine.string().trim().minLength(2).maxLength(50),

    first_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    middle_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    last_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),

    aadhar_no: vine.number()
      .unique({ table: 'teachers', column: 'aadhar_no' }),

    religion: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    religion_in_guj: vine.string().trim().optional().nullable().optional(),

    caste: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    caste_in_guj: vine.string().trim().optional().nullable().optional(),

    category: vine.enum(['ST', 'SC', 'OBC', 'OPEN']).optional(),

    address: vine.string().trim().minLength(5).maxLength(200).nullable().optional(),

    district: vine.string().trim().minLength(3).maxLength(100).nullable().optional(),
    city: vine.string().trim().minLength(3).maxLength(100).nullable().optional(),

    state: vine.string().trim().minLength(3).maxLength(50).nullable().optional(),

    postal_code: vine.number().nullable().optional(),
    
    bank_name: vine.string().trim().nullable().optional(),
    
    account_no: vine.number().positive().nullable().optional(),

    IFSC_code: vine.string().trim().nullable().optional(),

    gender: vine.enum(['Male', 'Female']),

    birth_date: vine.date().nullable().optional(),

    mobile_number: vine.number(),
    email: vine.string().email().nullable().optional(),

    class_id: vine.number().nullable().optional(),

    qualification: vine.string().nullable().optional(),
    joining_date: vine.date().nullable().optional(),

    employment_status: vine.enum(['Permanent', 'Trial_Period', 'Resigned', 'Contract_Based', 'Notice_Period']),


  })
)

export const CreateValidatorForBulkUpload = vine.compile(
  vine.object({
    employee_code: vine.string().trim().nullable().optional(),
    first_name: vine.string().trim().nullable().optional(),
    middle_name: vine.string().trim().nullable().optional(),
    last_name: vine.string().trim().nullable().optional(),
    short_name: vine.string().trim().nullable().optional(),
    title: vine.string().trim().nullable().optional(),
    birth_date: vine.date().nullable().optional(),
    address: vine.string().trim().nullable().optional(),
    permanent_address: vine.string().trim().nullable().optional(),
    district: vine.string().trim().nullable().optional(),
    state: vine.string().trim().nullable().optional(),
    postal_code: vine.number().nullable().optional(),
    mobile_number: vine.number().nullable().optional(),
    category: vine.string().trim().nullable().optional(),
    religion: vine.string().trim().nullable().optional(),
    minority: vine.string().trim().nullable().optional(),
    nationality: vine.string().trim().nullable().optional(),
    gender: vine.string().trim().nullable().optional(),
    marital_status: vine.string().trim().nullable().optional(),
    child_count: vine.number().nullable().optional(),
    email: vine.string().email().nullable().optional(),
    designation: vine.string().trim().nullable().optional(),
    staff_type: vine.string().trim().nullable().optional(),
    staff_category: vine.string().trim().nullable().optional(),
    department: vine.string().trim().nullable().optional(),
    nature_of_appointment: vine.string().trim().nullable().optional(),
    designation_on_doa: vine.string().trim().nullable().optional(),
    appointment_date: vine.date().nullable().optional(),
    joining_date: vine.date().nullable().optional(),
    promotion_date: vine.date().nullable().optional(),
    total_experience: vine.number().nullable().optional(),
    blood_group: vine.string().trim().nullable().optional(),
    qualification: vine.string().trim().nullable().optional(),
    subject_specialization: vine.string().trim().nullable().optional(),
    first_name_in_guj: vine.string().trim().nullable().optional(),
    middle_name_in_guj: vine.string().trim().nullable().optional(),
    last_name_in_guj: vine.string().trim().nullable().optional(),
    registration_authority: vine.string().trim().nullable().optional(),
    registration_number: vine.string().trim().nullable().optional(),
    registration_date: vine.date().nullable().optional(),
    council_name: vine.string().trim().nullable().optional(),
    ayush_teacher_code: vine.string().trim().nullable().optional(),
    md_subject: vine.string().trim().nullable().optional(),
    qualification_college: vine.string().trim().nullable().optional(),
    qualification_university: vine.string().trim().nullable().optional(),
    passing_date: vine.date().nullable().optional(),
    account_no: vine.number().nullable().optional(),
    IFSC_code: vine.string().trim().nullable().optional(),
    bank_name: vine.string().trim().nullable().optional(),
    branch_details: vine.string().trim().nullable().optional(),
    aadhar_no: vine.number().nullable().optional(),
    pan_card_no: vine.string().trim().nullable().optional(),
    voter_id: vine.string().trim().nullable().optional(),
    uni_approval_date: vine.date().nullable().optional(),
    uni_approval_number: vine.string().trim().nullable().optional(),
    driving_licence: vine.string().trim().nullable().optional(),
    driving_licence_expiry: vine.date().nullable().optional(),
    epf_no: vine.number().nullable().optional(),
    epf_uan_no: vine.number().nullable().optional(),
    employment_status: vine.string().trim().nullable().optional(),
    staff_role_id: vine.number().nullable().optional(),
  })
)