import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import DeadStock from './dead_stock.js'
import InventoryDepartment from './inventory_department.js'

export default class DeadStockTransaction extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare deadStockId: number

  @column()
  declare departmentId: number | null

  @column()
  declare transactionType: 'ISSUE' | 'RETURN' | 'DISCARD'

  @column()
  declare quantity: number

  @column.date()
  declare transactionDate: DateTime

  @column()
  declare remark: string | null

  @belongsTo(() => DeadStock)
  declare deadStock: BelongsTo<typeof DeadStock>

  @belongsTo(() => InventoryDepartment, { foreignKey: 'departmentId' })
  declare department: BelongsTo<typeof InventoryDepartment>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}