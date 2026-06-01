import vine from "@vinejs/vine";

/**
 * Validates the post's creation action
 */
export const CreateValidatorForStaff = vine.compile(
  vine.object({
    remarks: vine.string().trim().minLength(2).maxLength(255).optional(),
    staff_role_id: vine.number(),

    first_name: vine.string().trim().minLength(1).maxLength(50),
    middle_name: vine.string().trim().minLength(1).maxLength(50).nullable().optional(),
    last_name: vine.string().trim().minLength(1).maxLength(50),

    first_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    middle_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    last_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),

    gender: vine.enum(['Male', 'Female']),
    marital_status: vine.enum(['Single', 'Married', 'Divorced', 'Widowed']).nullable().optional(),

    birth_date: vine.date().nullable().optional(),

    mobile_number: vine.number(),
    email: vine.string().email().nullable().optional(),

    emergency_contact_name: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    emergency_contact_number: vine.number().nullable().optional(),

    qualification: vine.enum([
      'D.Ed', 'B.Ed', 'M.Ed', 'B.A + B.Ed', 'B.Sc + B.Ed', 'M.A + B.Ed', 'M.Sc + B.Ed', 'Ph.D', 'Diploma', 'B.Com', 'BBA', 'MBA', 'M.Com', 'ITI', 'SSC', 'HSC', 'Others'
    ]).nullable().optional(),

    subject_specialization: vine.enum([
      'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Gujarati', 'Social Science', 'Computer Science', 'Commerce', 'Economics', 'Physical Education', 'Arts', 'Music', 'Others'
    ]).nullable().optional(),

    joining_date: vine.date().nullable().optional(),

    employment_status: vine.enum(['Permanent', 'Trial_Period', 'Resigned', 'Contract_Based', 'Notice_Period']),
    experience_years: vine.number().nullable().optional(),

    aadhar_no: vine.number().nullable().optional(),
    pan_card_no: vine.string().trim().minLength(10).maxLength(10).nullable().optional(),
    epf_no: vine.number().optional().nullable().optional(),
    epf_uan_no: vine.number().optional().nullable().optional(),

    blood_group: vine.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).nullable().optional(),
    religion: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    religion_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    caste: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    caste_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    category: vine.enum(['ST', 'SC', 'OBC', 'OPEN']).nullable().optional(),
    nationality: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),

    address: vine.string().trim().minLength(2).maxLength(255).nullable().optional(),
    district: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    city: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    state: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    postal_code: vine.number().nullable().optional(),

    bank_name: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    account_no: vine.number().nullable().optional(),
    IFSC_code: vine.string().trim().minLength(11).maxLength(11).nullable().optional(),

    profile_photo: vine.string().optional().nullable().optional(),

    // New fields from STAFF DETAIL.xlsx
    department: vine.string().trim().maxLength(100).nullable().optional(),
    short_name: vine.string().trim().maxLength(100).nullable().optional(),
    minority: vine.string().trim().maxLength(50).nullable().optional(),
    child_count: vine.number().nullable().optional(),
    designation: vine.string().trim().maxLength(100).nullable().optional(),
    staff_type: vine.string().trim().maxLength(50).nullable().optional(),
    staff_category: vine.string().trim().maxLength(50).nullable().optional(),
    nature_of_appointment: vine.string().trim().maxLength(100).nullable().optional(),
    appointment_date: vine.date().nullable().optional(),
    promotion_date: vine.date().nullable().optional(),
    registration_authority: vine.string().trim().maxLength(255).nullable().optional(),
    registration_number: vine.string().trim().maxLength(100).nullable().optional(),
    registration_date: vine.date().nullable().optional(),
    council_name: vine.string().trim().maxLength(255).nullable().optional(),
    ayush_teacher_code: vine.string().trim().maxLength(100).nullable().optional(),
    md_subject: vine.string().trim().maxLength(100).nullable().optional(),
    qualification_college: vine.string().trim().maxLength(255).nullable().optional(),
    qualification_university: vine.string().trim().maxLength(255).nullable().optional(),
    passing_date: vine.date().nullable().optional(),
    voter_id: vine.string().trim().maxLength(50).nullable().optional(),
    driving_licence: vine.string().trim().maxLength(50).nullable().optional(),
    driving_licence_expiry: vine.date().nullable().optional(),
    uni_approval_date: vine.date().nullable().optional(),
    uni_approval_number: vine.string().trim().maxLength(100).nullable().optional(),
    branch_details: vine.string().trim().maxLength(255).nullable().optional(),
    ayush_id_no: vine.string().trim().maxLength(100).nullable().optional(),
    teacher_code: vine.string().trim().maxLength(100).nullable().optional(),
    ayush_registration_no: vine.string().trim().maxLength(100).nullable().optional(),
    date_of_registration: vine.date().nullable().optional(),
    university_approval_letter_no: vine.string().trim().maxLength(100).nullable().optional(),
    university_approval_date: vine.date().nullable().optional(),
    bank_branch_name: vine.string().trim().maxLength(255).nullable().optional(),
    state_council_reg_no: vine.string().trim().maxLength(100).nullable().optional(),
    university_appointment_letter_no: vine.string().trim().maxLength(255).nullable().optional(),
    university_appointment_date: vine.date().nullable().optional(),
    area_of_expertise: vine.string().trim().maxLength(255).nullable().optional(),
    ug_degree: vine.string().trim().maxLength(100).nullable().optional(),
    ug_passing_university: vine.string().trim().maxLength(255).nullable().optional(),
    ug_passing_year: vine.number().nullable().optional(),
    pg_degree: vine.string().trim().maxLength(100).nullable().optional(),
    pg_passing_university: vine.string().trim().maxLength(255).nullable().optional(),
    pg_passing_year: vine.number().nullable().optional(),
    other_degree: vine.string().trim().maxLength(100).nullable().optional(),
    other_passing_university: vine.string().trim().maxLength(255).nullable().optional(),
    other_passing_year: vine.number().nullable().optional(),
    pay_scale: vine.string().trim().maxLength(100).nullable().optional(),
    resignation_date: vine.date().nullable().optional(),
    retirement_date: vine.date().nullable().optional(),
    retirement_age: vine.number().nullable().optional(),
  })
)

export const CreateValidatorForMultipleStaff = vine.compile(

  vine.array(
    vine.object({
      // add here
      staff_role_id: vine.number(),

      first_name: vine.string().trim().minLength(2).maxLength(50),
      middle_name: vine.string().trim().minLength(2).maxLength(50).optional(),
      last_name: vine.string().trim().minLength(2).maxLength(50),

      gender: vine.enum(['Male', 'Female']),

      birth_date: vine.date(),

      email: vine.string().email(),

      joining_date: vine.date(),

      employment_status: vine.enum(['Permanent', 'Trial_Period', 'Resigned', 'Contract_Based', 'Notice_Period'])

    })
  ).minLength(1)
)


/**
 * Validates the post's update action
 */
export const UpdateValidatorForStaff = vine.compile(
  vine.object({
    remarks: vine.string().trim().minLength(2).maxLength(255).optional(),

    first_name: vine.string().trim().minLength(1).maxLength(50).optional(),
    middle_name: vine.string().trim().minLength(1).maxLength(50).nullable().optional(),
    last_name: vine.string().trim().minLength(1).maxLength(50).optional(),

    first_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    middle_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    last_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),

    gender: vine.enum(['Male', 'Female']),
    marital_status: vine.enum(['Single', 'Married', 'Divorced', 'Widowed']).nullable().optional(),

    birth_date: vine.date().nullable().optional(),

    mobile_number: vine.number(),
    email: vine.string().email().nullable().optional(),

    emergency_contact_name: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    emergency_contact_number: vine.number().nullable().optional(),

    qualification: vine.enum([
      'D.Ed', 'B.Ed', 'M.Ed', 'B.A + B.Ed', 'B.Sc + B.Ed', 'M.A + B.Ed', 'M.Sc + B.Ed', 'Ph.D', 'Diploma', 'B.Com', 'BBA', 'MBA', 'M.Com', 'ITI', 'SSC', 'HSC', 'Others'
    ]).nullable().optional(),

    subject_specialization: vine.enum([
      'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Gujarati', 'Social Science', 'Computer Science', 'Commerce', 'Economics', 'Physical Education', 'Arts', 'Music', 'Others'
    ]).nullable().optional(),

    joining_date: vine.date().nullable().optional(),

    employment_status: vine.enum(['Permanent', 'Trial_Period', 'Resigned', 'Contract_Based', 'Notice_Period']),
    experience_years: vine.number().nullable().optional(),

    aadhar_no: vine.number().nullable().optional(),
    pan_card_no: vine.string().trim().minLength(10).maxLength(10).nullable().optional(),
    epf_no: vine.number().optional().nullable().optional(),
    epf_uan_no: vine.number().optional().nullable().optional(),

    blood_group: vine.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).nullable().optional(),
    religion: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    religion_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    caste: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    caste_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    category: vine.enum(['ST', 'SC', 'OBC', 'OPEN']).nullable().optional(),
    nationality: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),

    address: vine.string().trim().minLength(2).maxLength(255).nullable().optional(),
    district: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    city: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    state: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    postal_code: vine.number().nullable().optional(),

    bank_name: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    account_no: vine.number().nullable().optional(),
    IFSC_code: vine.string().trim().minLength(11).maxLength(11).nullable().optional(),

    profile_photo: vine.string().optional().nullable().optional(),

    // New fields from STAFF DETAIL.xlsx
    department: vine.string().trim().maxLength(100).nullable().optional(),
    short_name: vine.string().trim().maxLength(100).nullable().optional(),
    minority: vine.string().trim().maxLength(50).nullable().optional(),
    child_count: vine.number().nullable().optional(),
    designation: vine.string().trim().maxLength(100).nullable().optional(),
    staff_type: vine.string().trim().maxLength(50).nullable().optional(),
    staff_category: vine.string().trim().maxLength(50).nullable().optional(),
    nature_of_appointment: vine.string().trim().maxLength(100).nullable().optional(),
    appointment_date: vine.date().nullable().optional(),
    promotion_date: vine.date().nullable().optional(),
    registration_authority: vine.string().trim().maxLength(255).nullable().optional(),
    registration_number: vine.string().trim().maxLength(100).nullable().optional(),
    registration_date: vine.date().nullable().optional(),
    council_name: vine.string().trim().maxLength(255).nullable().optional(),
    ayush_teacher_code: vine.string().trim().maxLength(100).nullable().optional(),
    md_subject: vine.string().trim().maxLength(100).nullable().optional(),
    qualification_college: vine.string().trim().maxLength(255).nullable().optional(),
    qualification_university: vine.string().trim().maxLength(255).nullable().optional(),
    passing_date: vine.date().nullable().optional(),
    voter_id: vine.string().trim().maxLength(50).nullable().optional(),
    driving_licence: vine.string().trim().maxLength(50).nullable().optional(),
    driving_licence_expiry: vine.date().nullable().optional(),
    uni_approval_date: vine.date().nullable().optional(),
    uni_approval_number: vine.string().trim().maxLength(100).nullable().optional(),
    branch_details: vine.string().trim().maxLength(255).nullable().optional(),
    ayush_id_no: vine.string().trim().maxLength(100).nullable().optional(),
    teacher_code: vine.string().trim().maxLength(100).nullable().optional(),
    ayush_registration_no: vine.string().trim().maxLength(100).nullable().optional(),
    date_of_registration: vine.date().nullable().optional(),
    university_approval_letter_no: vine.string().trim().maxLength(100).nullable().optional(),
    university_approval_date: vine.date().nullable().optional(),
    bank_branch_name: vine.string().trim().maxLength(255).nullable().optional(),
    state_council_reg_no: vine.string().trim().maxLength(100).nullable().optional(),
    university_appointment_letter_no: vine.string().trim().maxLength(255).nullable().optional(),
    university_appointment_date: vine.date().nullable().optional(),
    area_of_expertise: vine.string().trim().maxLength(255).nullable().optional(),
    ug_degree: vine.string().trim().maxLength(100).nullable().optional(),
    ug_passing_university: vine.string().trim().maxLength(255).nullable().optional(),
    ug_passing_year: vine.number().nullable().optional(),
    pg_degree: vine.string().trim().maxLength(100).nullable().optional(),
    pg_passing_university: vine.string().trim().maxLength(255).nullable().optional(),
    pg_passing_year: vine.number().nullable().optional(),
    other_degree: vine.string().trim().maxLength(100).nullable().optional(),
    other_passing_university: vine.string().trim().maxLength(255).nullable().optional(),
    other_passing_year: vine.number().nullable().optional(),
    pay_scale: vine.string().trim().maxLength(100).nullable().optional(),
    resignation_date: vine.date().nullable().optional(),
    retirement_date: vine.date().nullable().optional(),
    retirement_age: vine.number().nullable().optional(),
  })
)


export const CreateValidatorForBulkUpload = vine.compile(
  vine.object({
    remarks: vine.string().trim().minLength(2).maxLength(255).optional(),
    staff_role_id: vine.number(),

    first_name: vine.string().trim().minLength(1).maxLength(50),
    middle_name: vine.string().trim().minLength(1).maxLength(50).nullable().optional(),
    last_name: vine.string().trim().minLength(1).maxLength(50),

    first_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    middle_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    last_name_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),

    gender: vine.enum(['Male', 'Female']),
    marital_status: vine.enum(['Single', 'Married', 'Divorced', 'Widowed']).nullable().optional(),

    birth_date: vine.date().nullable().optional(),

    mobile_number: vine.number(),
    email: vine.string().email().nullable().optional(),

    emergency_contact_name: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    emergency_contact_number: vine.number().nullable().optional(),

    qualification: vine.enum([
      'D.Ed', 'B.Ed', 'M.Ed', 'B.A + B.Ed', 'B.Sc + B.Ed', 'M.A + B.Ed', 'M.Sc + B.Ed', 'Ph.D', 'Diploma', 'B.Com', 'BBA', 'MBA', 'M.Com', 'ITI', 'SSC', 'HSC', 'Others'
    ]).nullable().optional(),

    subject_specialization: vine.enum([
      'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Gujarati', 'Social Science', 'Computer Science', 'Commerce', 'Economics', 'Physical Education', 'Arts', 'Music', 'Others'
    ]).nullable().optional(),

    joining_date: vine.date().nullable().optional(),

    employment_status: vine.enum(['Permanent', 'Trial_Period', 'Resigned', 'Contract_Based', 'Notice_Period']),
    experience_years: vine.number().nullable().optional(),

    aadhar_no: vine.number().nullable().optional(),
    pan_card_no: vine.string().trim().minLength(10).maxLength(10).nullable().optional(),
    epf_no: vine.number().optional().nullable().optional(),
    epf_uan_no: vine.number().optional().nullable().optional(),

    blood_group: vine.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).nullable().optional(),
    religion: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    religion_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    caste: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    caste_in_guj: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    category: vine.enum(['ST', 'SC', 'OBC', 'OPEN']).nullable().optional(),
    nationality: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),

    address: vine.string().trim().minLength(2).maxLength(255).nullable().optional(),
    district: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    city: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    state: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    postal_code: vine.number().nullable().optional(),

    bank_name: vine.string().trim().minLength(2).maxLength(50).nullable().optional(),
    account_no: vine.number().nullable().optional(),
    IFSC_code: vine.string().trim().minLength(11).maxLength(11).nullable().optional(),

    profile_photo: vine.string().optional().nullable().optional(),
    resignation_date: vine.date().nullable().optional(),
    retirement_date: vine.date().nullable().optional(),
  })
)