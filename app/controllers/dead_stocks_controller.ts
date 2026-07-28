import type { HttpContext } from '@adonisjs/core/http'
import DeadStock from '#models/dead_stock'
import { createDeadStockValidator } from '#validators/dead_stock'
import { DateTime } from 'luxon'

export default class DeadStocksController {
  async index({ response }: HttpContext) {
    const stocks = await DeadStock.query().orderBy('created_at', 'desc')
    return response.ok({ data: stocks })
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createDeadStockValidator)
    
    // Automatically set available quantity to total quantity on creation
    const stockData = {
      ...payload,
      purchaseDate: payload.purchaseDate ? DateTime.fromJSDate(payload.purchaseDate) : undefined,
      expiryDate: payload.expiryDate ? DateTime.fromJSDate(payload.expiryDate) : undefined,
      totalAmount: payload.unitPrice * payload.totalQuantity,
      availableQuantity: payload.totalQuantity
    }

    const stock = await DeadStock.create(stockData)
    return response.created({ message: 'Dead stock entry created successfully', data: stock })
  }

  async show({ params, response }: HttpContext) {
    const stock = await DeadStock.query()
      .where('id', params.id)
      .preload('transactions', (query) => {
        query.preload('department').orderBy('transaction_date', 'desc')
      })
      .firstOrFail()
      
    return response.ok({ data: stock })
  }
}