import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import DeadStock from '#models/dead_stock'
import DeadStockTransaction from '#models/dead_stock_transaction'
import { issueDeadStockValidator, discardDeadStockValidator, returnDeadStockValidator, transferDeadStockValidator } from '#validators/dead_stock'

export default class DeadStockTransactionsController {
  async issue({ request, response }: HttpContext) {
    const payload = await request.validateUsing(issueDeadStockValidator)
    
    const stock = await DeadStock.findOrFail(payload.deadStockId)
    if (stock.availableQuantity < payload.quantity) {
      return response.badRequest({ message: 'Insufficient quantity available in stock' })
    }

    const transaction = await DeadStockTransaction.create({
      ...payload,
      transactionDate: DateTime.fromJSDate(payload.transactionDate),
      transactionType: 'ISSUE'
    })

    stock.availableQuantity -= payload.quantity
    await stock.save()

    return response.created({ message: 'Stock issued successfully', data: transaction })
  }

  async returnStock({ request, response }: HttpContext) {
    const payload = await request.validateUsing(returnDeadStockValidator)
    
    const stock = await DeadStock.findOrFail(payload.deadStockId)

    const transaction = await DeadStockTransaction.create({
      ...payload,
      transactionDate: DateTime.fromJSDate(payload.transactionDate),
      transactionType: 'RETURN'
    })

    stock.availableQuantity += payload.quantity
    await stock.save()

    return response.created({ message: 'Stock returned successfully', data: transaction })
  }

  async discard({ request, response }: HttpContext) {
    const payload = await request.validateUsing(discardDeadStockValidator)
    
    const stock = await DeadStock.findOrFail(payload.deadStockId)
    
    // Discards could happen from a department or central store. 
    // If not from a department (null), check available quantity in store
    if (!payload.departmentId && stock.availableQuantity < payload.quantity) {
      return response.badRequest({ message: 'Insufficient quantity available in central stock to discard' })
    }

    const transaction = await DeadStockTransaction.create({
      ...payload,
      transactionDate: DateTime.fromJSDate(payload.transactionDate),
      transactionType: 'DISCARD'
    })

    if (!payload.departmentId) {
      stock.availableQuantity -= payload.quantity
      await stock.save()
    }

    return response.created({ message: 'Stock discarded successfully', data: transaction })
  }

  async transfer({ request, response }: HttpContext) {
    const payload = await request.validateUsing(transferDeadStockValidator)
    await DeadStock.findOrFail(payload.deadStockId)
    
    // Check if fromDepartment has enough quantity
    const deptTransactions = await DeadStockTransaction.query()
      .where('deadStockId', payload.deadStockId)
      .andWhere('departmentId', payload.fromDepartmentId)
    
    let currentDeptQuantity = 0;
    for (const txn of deptTransactions) {
      if (txn.transactionType === 'ISSUE') currentDeptQuantity += txn.quantity;
      if (txn.transactionType === 'RETURN' || txn.transactionType === 'DISCARD') currentDeptQuantity -= txn.quantity;
    }

    if (currentDeptQuantity < payload.quantity) {
      return response.badRequest({ message: 'Insufficient quantity available in source department' })
    }

    // Since we're not using DB transactions explicitly (unless adonis db is imported, which we can avoid by just doing sequential),
    // Create the RETURN transaction from source dept
    const returnTxn = await DeadStockTransaction.create({
      deadStockId: payload.deadStockId,
      departmentId: payload.fromDepartmentId,
      quantity: payload.quantity,
      transactionDate: DateTime.fromJSDate(payload.transactionDate),
      transactionType: 'RETURN',
      remark: payload.remark ? `Transfer to Dept ${payload.toDepartmentId}: ${payload.remark}` : `Transfer to Dept ${payload.toDepartmentId}`
    })

    // Create the ISSUE transaction to dest dept
    const issueTxn = await DeadStockTransaction.create({
      deadStockId: payload.deadStockId,
      departmentId: payload.toDepartmentId,
      quantity: payload.quantity,
      transactionDate: DateTime.fromJSDate(payload.transactionDate),
      transactionType: 'ISSUE',
      remark: payload.remark ? `Transfer from Dept ${payload.fromDepartmentId}: ${payload.remark}` : `Transfer from Dept ${payload.fromDepartmentId}`
    })

    return response.created({ message: 'Stock transferred successfully', data: { returnTxn, issueTxn } })
  }
}