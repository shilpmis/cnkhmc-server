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