import vine from '@vinejs/vine'

export const CreateRoomValidator = vine.compile(
  vine.object({
    type: vine.enum(['DIRECT', 'GROUP']),
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    user_ids: vine.array(vine.number().positive()).minLength(1),
  })
)

export const CreateMessageValidator = vine.compile(
  vine.object({
    content: vine.string().trim().minLength(1),
    type: vine.enum(['TEXT', 'IMAGE', 'FILE']).optional(),
  })
)

export const AddMembersValidator = vine.compile(
  vine.object({
    user_ids: vine.array(vine.number().positive()).minLength(1),
  })
)
