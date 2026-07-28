import vine from '@vinejs/vine'

export const createInventoryDepartmentValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2),
    isActive: vine.boolean().optional(),
  })
)

export const updateInventoryDepartmentValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).optional(),
    isActive: vine.boolean().optional(),
  })
)

export const createDeadStockValidator = vine.compile(
  vine.object({
    itemName: vine.string().trim(),
    invoiceNumber: vine.string().trim().optional(),
    supplierName: vine.string().trim().optional(),
    purchaseDate: vine.date().optional(),
    unitPrice: vine.number().positive(),
    totalQuantity: vine.number().positive().withoutDecimals(),
    expiryDate: vine.date().optional(),
  })
)

export const issueDeadStockValidator = vine.compile(
  vine.object({
    deadStockId: vine.number().positive().withoutDecimals(),
    departmentId: vine.number().positive().withoutDecimals(),
    quantity: vine.number().positive().withoutDecimals(),
    transactionDate: vine.date(),
    remark: vine.string().trim().optional(),
  })
)

export const discardDeadStockValidator = vine.compile(
  vine.object({
    deadStockId: vine.number().positive().withoutDecimals(),
    departmentId: vine.number().positive().withoutDecimals().optional(),
    quantity: vine.number().positive().withoutDecimals(),
    transactionDate: vine.date(),
    remark: vine.string().trim().optional(),
  })
)

export const returnDeadStockValidator = vine.compile(
  vine.object({
    deadStockId: vine.number().positive().withoutDecimals(),
    departmentId: vine.number().positive().withoutDecimals(),
    quantity: vine.number().positive().withoutDecimals(),
    transactionDate: vine.date(),
    remark: vine.string().trim().optional(),
  })
)

export const transferDeadStockValidator = vine.compile(
  vine.object({
    deadStockId: vine.number().positive().withoutDecimals(),
    fromDepartmentId: vine.number().positive().withoutDecimals(),
    toDepartmentId: vine.number().positive().withoutDecimals(),
    quantity: vine.number().positive().withoutDecimals(),
    transactionDate: vine.date(),
    remark: vine.string().trim().optional(),
  })
)
