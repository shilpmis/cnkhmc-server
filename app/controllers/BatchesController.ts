import type { HttpContext } from '@adonisjs/core/http'
import Batch from '#models/Batch'
import { CreateValidatorForBatch, UpdateValidatorForBatch } from '#validators/Batch'
import { DateTime } from 'luxon'

export default class BatchesController {
  /**
   * List all batches.
   * Filter by entity_id if provided.
   */
  async index({ request, response }: HttpContext) {
    const entityId = request.input('entity_id')
    
    const query = Batch.query()
      .preload('entity')
      .preload('department')

    if (entityId) {
      query.where('entity_id', entityId)
    }

    const batches = await query.orderBy('id', 'desc')
    return response.json(batches)
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(CreateValidatorForBatch)
    const batch = await Batch.create({
      ...payload,
      start_date: DateTime.fromISO(payload.start_date),
      expected_end_date: payload.expected_end_date ? DateTime.fromISO(payload.expected_end_date) : null
    })
    return response.status(201).json(batch)
  }

  async show({ params, response }: HttpContext) {
    const batch = await Batch.findOrFail(params.id)
    await batch.load('entity')
    await batch.load('department')
    return response.json(batch)
  }

  async update({ params, request, response }: HttpContext) {
    const batch = await Batch.findOrFail(params.id)
    const payload = await request.validateUsing(UpdateValidatorForBatch)
    
    const { start_date, expected_end_date, ...rest } = payload
    
    batch.merge({
      ...rest,
      ...(start_date ? { start_date: DateTime.fromISO(start_date) } : {}),
      ...(expected_end_date ? { expected_end_date: DateTime.fromISO(expected_end_date) } : {})
    })
    await batch.save()
    
    return response.json(batch)
  }

  async destroy({ params, response }: HttpContext) {
    const batch = await Batch.findOrFail(params.id)
    await batch.delete()
    return response.json({ 
      message: 'Batch deleted successfully' 
    })
  }
}
