import vine from "@vinejs/vine";

/**
 * Validates the post's creation action
 */
export const CreateValidatorForInquiries = vine.compile(
  vine.object({
    // add here
    student_name: vine.string().trim().minLength(3),
    parent_name: vine.string().trim().minLength(3),
    contact_number: vine.number(),
    email: vine.string().trim().email(),
    grade_applying: vine.enum([1,2,3,4,5,6,7,8,9,10,11,12]),
  })
)


/**
 * Validates the post's update action
 */
export const UpdateValidatorForInquiries = vine.compile(
  vine.object({
    student_name: vine.string().trim().minLength(3).optional(),
    parent_name: vine.string().trim().minLength(3).optional(),
    contact_number: vine.number().optional(),
    email: vine.string().trim().email().optional(),
    grade_applying: vine.enum([1,2,3,4,5,6,7,8,9,10,11,12]).optional(),
  })
)

