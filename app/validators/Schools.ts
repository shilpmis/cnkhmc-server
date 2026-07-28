import vine from "@vinejs/vine";

/**
 * Validates the post's creation action
 */
export const CreateValidatorForSchools = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(50),
    organization_id: vine.number(),

    email: vine.string().email().unique({ table: 'schools', column: 'email' }),
    established_year: vine.string(),
    school_type: vine.enum(['SCHOOL', 'COLLEGE']),
    branch_code: vine.string().trim().maxLength(10).optional(),  // Auto-generated but can be manually passed
    contact_number: vine.number().min(1000000000).max(999999999999).unique({ table: 'schools', column: 'contact_number' }),
    address: vine.string().maxLength(500).optional(),
    district: vine.string().trim().maxLength(100),
    city: vine.string().trim().maxLength(100),
    state: vine.string().trim().maxLength(100),
    pincode: vine.number().min(100000).max(999999),
    school_logo: vine.string().optional(),
    status: vine.enum(['ACTIVE', 'INACTIVE']),
    is_email_verified: vine.boolean(),
  })
);



/**
 * Validates the post's update action
 */
export const UpdateValidatorForSchools = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(50).optional(),
    established_year: vine.string().optional(),
    school_type: vine.enum(['SCHOOL', 'COLLEGE']).optional(),
    contact_number: vine.number().min(10).optional(),
    address: vine.string().maxLength(500).optional(),
    enrollment_number_format: vine.string().maxLength(255).optional(),
    // subscription_type: vine.enum(['FREE', 'PREMIUM']).optional(),

  })
)

