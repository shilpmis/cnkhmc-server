import vine from '@vinejs/vine'

export const ValidatioinStatusForMigration = vine.compile(
  vine.object({
    reason: vine.string(),
    migrated_class: vine.number(),
    migrated_division : vine.number(),
    is_migration_for_class: vine.boolean(),
  })
)

export const ValidatioinStatusForDrop = vine.compile(
  vine.object({
    reason: vine.string(),
  })
)

export const ValidatioinStatusForComplete = vine.compile(
  vine.object({
    reason: vine.string(),
  })
)

export const ValidatioinStatusForSuspended   = vine.compile(
  vine.object({
    reason: vine.string(),
    status : vine.enum(['suspended', 'remove_suspension']),
  })
)
