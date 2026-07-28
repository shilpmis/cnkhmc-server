import type { HttpContext } from '@adonisjs/core/http'
import HostelAllocation from '#models/hostel_allocation'
import HostelBed from '#models/hostel_bed'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class HostelAllocationsController {
  public async allocate({ request, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const payload = request.only(['student_id', 'bed_id', 'allocation_date'])
      if (!payload.student_id || !payload.bed_id) {
         return response.badRequest({ message: 'student_id and bed_id are required' })
      }

      // Check if bed is available
      const bed = await HostelBed.findOrFail(payload.bed_id, { client: trx })
      if (bed.status !== 'Available') {
        await trx.rollback()
        return response.badRequest({ message: 'Bed is not available' })
      }

      // Check if student already has an active allocation
      const existingAllocation = await HostelAllocation.query({ client: trx })
        .where('studentId', payload.student_id)
        .where('status', 'Active')
        .first()

      if (existingAllocation) {
        await trx.rollback()
        return response.badRequest({ message: 'Student already has an active hostel allocation' })
      }

      // Create allocation
      const allocation = await HostelAllocation.create({
        studentId: payload.student_id,
        bedId: payload.bed_id,
        allocationDate: payload.allocation_date ? DateTime.fromISO(payload.allocation_date) : DateTime.now(),
        status: 'Active',
      }, { client: trx })

      // Update bed status
      bed.status = 'Occupied'
      await bed.save()

      await allocation.load('student')
      await allocation.load('bed', (bedQuery: any) => {
        bedQuery.preload('room', (roomQuery: any) => {
          roomQuery.preload('hostel')
        })
      })

      await trx.commit()

      return response.created(allocation)
    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.internalServerError({ 
        message: 'Error allocating bed', 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  }

  public async vacate({ params, request, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const allocation = await HostelAllocation.findOrFail(params.id, { client: trx })
      
      if (allocation.status === 'Vacated') {
        await trx.rollback()
        return response.badRequest({ message: 'Allocation is already vacated' })
      }

      const payload = request.only(['vacation_date'])

      allocation.status = 'Vacated'
      allocation.vacationDate = payload.vacation_date ? DateTime.fromISO(payload.vacation_date) : DateTime.now()
      await allocation.save()

      // Update bed status
      const bed = await HostelBed.findOrFail(allocation.bedId, { client: trx })
      bed.status = 'Available'
      await bed.save()

      await trx.commit()

      return response.ok(allocation)
    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.internalServerError({ message: 'Error vacating bed', error })
    }
  }
}