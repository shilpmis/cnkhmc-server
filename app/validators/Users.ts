import vine from '@vinejs/vine'

/**
 * Validates the post's creation action
 */
export const CreateValidatorForUsers = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(30),
    role_id: vine.number(),
    username: vine.string().trim().minLength(3).maxLength(30),
    password: vine.string().minLength(8),
  })
)

export const CreateValidatorForOnBoardTeacherAsUser = vine.compile(
  vine.object({
    staff_id: vine.number(),
    username: vine.string().trim().minLength(3).maxLength(30),
    password: vine.string().minLength(8),
    assign_classes: vine.array(vine.number().min(1)).optional(),
    is_active: vine.boolean(),
  })
)

export const UpdateValidatorForOnBoardTeacherAsUser = vine.compile(
  vine.object({
    is_active: vine.boolean().optional(),
    assign_classes: vine.array(vine.number().min(1)).optional(),
    unassign_classes: vine.array(vine.number().min(1)).optional(),
  })
)

export const UpdateValidatorForUsers = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(30).optional(),
    username: vine.string().trim().minLength(3).maxLength(30).optional(),
    is_active: vine.boolean().optional(),
  })
)
