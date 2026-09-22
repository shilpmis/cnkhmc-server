import type { HttpContext } from '@adonisjs/core/http'
import HostelAllocation from '#models/hostel_allocation'
import HostelBed from '#models/hostel_bed'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class HostelAllocationsController {
  public async store(ctx: HttpContext) {
    return this.allocate(ctx)
  }

  public async allocate({ request, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const payload = request.only(['student_id', 'bed_id', 'allocation_date'])
      const studentId = Number(payload.student_id)
      const bedId = Number(payload.bed_id)

      if (!studentId || !bedId) {
        await trx.rollback()
        return response.badRequest({ message: 'student_id and bed_id are required' })
      }

      // Check if bed is available
      const bed = await HostelBed.findOrFail(bedId, { client: trx })
      if (bed.status !== 'Available') {
        await trx.rollback()
        return response.badRequest({ message: 'Bed is not available' })
      }

      // Check if student already has an active allocation
      const existingAllocation = await HostelAllocation.query({ client: trx })
        .where('student_id', studentId)
        .where('status', 'Active')
        .first()

      if (existingAllocation) {
        await trx.rollback()
        return response.badRequest({ message: 'Student already has an active hostel allocation' })
      }

      // Safe date parsing
      let allocDate = DateTime.now()
      if (payload.allocation_date) {
        const parsed = DateTime.fromISO(String(payload.allocation_date))
        if (parsed.isValid) {
          allocDate = parsed
        }
      }

      // Create allocation
      const allocation = await HostelAllocation.create(
        {
          studentId: studentId,
          bedId: bedId,
          allocationDate: allocDate,
          status: 'Active',
        },
        { client: trx }
      )

      // Update bed status
      bed.status = 'Occupied'
      bed.useTransaction(trx)
      await bed.save()

      await trx.commit()

      // Load relations outside transaction safely
      try {
        await allocation.load('student')
        await allocation.load('bed', (bedQuery: any) => {
          bedQuery.preload('room', (roomQuery: any) => {
            roomQuery.preload('hostel')
          })
        })
      } catch (loadError) {
        console.warn('Could not preload relations on allocation:', loadError)
      }

      return response.created(allocation)
    } catch (error: any) {
      await trx.rollback()
      console.error('Error allocating bed:', error)
      return response.internalServerError({ 
        message: error?.message || 'Error allocating bed', 
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
      let vacDate = DateTime.now()
      if (payload.vacation_date) {
        const parsed = DateTime.fromISO(String(payload.vacation_date))
        if (parsed.isValid) {
          vacDate = parsed
        }
      }

      allocation.status = 'Vacated'
      allocation.vacationDate = vacDate
      allocation.useTransaction(trx)
      await allocation.save()

      // Update bed status
      const bed = await HostelBed.findOrFail(allocation.bedId, { client: trx })
      bed.status = 'Available'
      bed.useTransaction(trx)
      await bed.save()

      await trx.commit()

      return response.ok(allocation)
    } catch (error: any) {
      await trx.rollback()
      console.error('Error vacating bed:', error)
      return response.internalServerError({ 
        message: error?.message || 'Error vacating bed', 
        error: error instanceof Error ? error.message : error 
      })
    }
  }
}