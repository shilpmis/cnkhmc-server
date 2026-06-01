import vine from '@vinejs/vine'

export const CreateValidatorForBatch = vine.compile(
  vine.object({
    entity_id: vine.number().positive(),
    department_id: vine.number().positive().optional(),
    name: vine.string().trim().minLength(3).maxLength(100),
    start_date: vine.string(), 
    expected_end_date: vine.string().optional(),
  })
)

export const UpdateValidatorForBatch = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(100).optional(),
    department_id: vine.number().positive().optional(),
    start_date: vine.string().optional(),
    expected_end_date: vine.string().optional(),
  })
)
