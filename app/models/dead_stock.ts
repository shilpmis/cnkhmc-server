import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import DeadStockTransaction from './dead_stock_transaction.js'

export default class DeadStock extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare itemName: string

  @column()
  declare invoiceNumber: string | null

  @column()
  declare supplierName: string | null

  @column.date()
  declare purchaseDate: DateTime | null

  @column()
  declare unitPrice: number

  @column()
  declare totalQuantity: number

  @column()
  declare totalAmount: number

  @column.date()
  declare expiryDate: DateTime | null

  @column()
  declare availableQuantity: number

  @hasMany(() => DeadStockTransaction)
  declare transactions: HasMany<typeof DeadStockTransaction>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}