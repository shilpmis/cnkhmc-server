import vine from '@vinejs/vine'

/**
 * Validates the post's creation action
 */
export const CreateValidatorForInquiry = vine.compile(
  vine.object({
    // add here
    first_name: vine.string().minLength(3).maxLength(100),
    middle_name: vine.string().minLength(3).maxLength(100).optional(),
    last_name: vine.string().minLength(3).maxLength(100),
    birth_date: vine.date(),
    gender: vine.enum(['male', 'female']),
    inquiry_for_class: vine.number().positive(),
    father_name: vine.string().minLength(3).maxLength(100),
    primary_mobile: vine.number(),
    parent_email: vine.string().email().optional(),
    address: vine.string().minLength(3).maxLength(500),
    previous_school: vine.string().minLength(3).maxLength(100).optional(),
    previous_class: vine.number().positive().optional(),
    previous_percentage: vine.number().positive().optional(),
    previous_year: vine.string().minLength(3).maxLength(100).optional(),
    special_achievements: vine.string().minLength(3).maxLength(100).optional(),
    applying_for_quota: vine.boolean(),
    quota_type: vine.number().positive().nullable(),
    academic_session_id: vine.number().positive(),
    // is_active: vine.boolean(),
    // is_converted_to_student : vine.boolean().optional(),
  })
)

/**
 * Validates the post's update action
 */
export const UpdateValidatorForInquiry = vine.compile(
  vine.object({
    first_name: vine.string().minLength(3).maxLength(100).optional(),
    middle_name: vine.string().minLength(3).maxLength(100).optional(),
    last_name: vine.string().minLength(3).maxLength(100).optional(),
    birth_date: vine.date().optional(),
    gender: vine.enum(['male', 'female']).optional(),
    inquiry_for_class: vine.number().positive().optional(),
    father_name: vine.string().minLength(3).maxLength(100).optional(),
    primary_mobile: vine.number().optional(),
    parent_email: vine.string().email().optional(),
    address: vine.string().minLength(3).maxLength(500).optional(),
    previous_school: vine.string().minLength(3).maxLength(100).optional(),
    previous_class: vine.number().positive().optional(),
    previous_percentage: vine.number().positive().optional(),
    previous_year: vine.string().minLength(3).maxLength(100).optional(),
    special_achievements: vine.string().minLength(3).maxLength(100).optional(),
    applying_for_quota: vine.boolean().optional(),
    quota_type: vine.number().positive().optional().nullable(),
    status: vine
      .enum([
        'pending',
        'eligible',
        'approved',
        'ineligible',
        'rejected',
        'interview scheduled',
        'interview completed',
        'enrolled',
        'withdrawn',
      ])
      .optional(),
    // is_active: vine.boolean(),
  })
)
