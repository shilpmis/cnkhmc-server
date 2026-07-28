import type { HttpContext } from '@adonisjs/core/http'
import InventoryDepartment from '#models/inventory_department'
import { createInventoryDepartmentValidator, updateInventoryDepartmentValidator } from '#validators/dead_stock'

export default class InventoryDepartmentsController {
  async index({ response }: HttpContext) {
    const departments = await InventoryDepartment.query()
      .orderBy('name', 'asc')
      .preload('transactions', (query) => {
        query.preload('deadStock')
      })

    const departmentsWithItems = departments.map((dept) => {
      const deptJSON = dept.toJSON()
      const itemMap = new Map<number, any>()
      
      dept.transactions.forEach((tx) => {
        const item = tx.deadStock
        if (!item) return
        
        if (!itemMap.has(item.id)) {
          itemMap.set(item.id, {
            id: item.id,
            itemName: item.itemName,
            quantity: 0
          })
        }
        
        const currentItem = itemMap.get(item.id)!
        
        if (tx.transactionType === 'ISSUE') {
          currentItem.quantity += tx.quantity
        } else if (tx.transactionType === 'RETURN' || tx.transactionType === 'DISCARD') {
          currentItem.quantity -= tx.quantity
        }
      })
      
      const issuedItems = Array.from(itemMap.values()).filter(item => item.quantity > 0)
      
      return {
        ...deptJSON,
        issuedItems
      }
    })

    return response.ok({ data: departmentsWithItems })
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createInventoryDepartmentValidator)
    const department = await InventoryDepartment.create(payload)
    return response.created({ message: 'Inventory department created successfully', data: department })
  }

  async show({ params, response }: HttpContext) {
    const department = await InventoryDepartment.findOrFail(params.id)
    return response.ok({ data: department })
  }

  async update({ params, request, response }: HttpContext) {
    const department = await InventoryDepartment.findOrFail(params.id)
    const payload = await request.validateUsing(updateInventoryDepartmentValidator)
    
    department.merge(payload)
    await department.save()
    
    return response.ok({ message: 'Inventory department updated successfully', data: department })
  }

  async destroy({ params, response }: HttpContext) {
    const department = await InventoryDepartment.findOrFail(params.id)
    await department.delete()
    return response.ok({ message: 'Inventory department deleted successfully' })
  }
}