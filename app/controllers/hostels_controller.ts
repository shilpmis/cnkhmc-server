import type { HttpContext } from '@adonisjs/core/http'
import Hostel from '#models/hostel'
import HostelRoom from '#models/hostel_room'
import HostelBed from '#models/hostel_bed'
import db from '@adonisjs/lucid/services/db'

export default class HostelsController {
  public async index({ request, response }: HttpContext) {
    try {
      const schoolId = request.qs().school_id
      if (!schoolId) {
        return response.badRequest({ message: 'school_id is required' })
      }

      const hostels = await Hostel.query()
        .where('schoolId', schoolId)
        .preload('rooms', (roomsQuery: any) => {
          roomsQuery.preload('beds', (bedsQuery: any) => {
            bedsQuery.preload('allocations', (allocQuery: any) => {
              allocQuery.where('status', 'Active').preload('student')
            })
          })
        })

      return response.ok(hostels)
    } catch (error: any) {
      const fs = await import('fs')
      try { fs.appendFileSync('scratch/last_error.log', new Date().toISOString() + '\\n' + String(error.message) + '\\n' + String(error.stack) + '\\n\\n') } catch(e) {}
      console.error(error)
      return response.internalServerError({ message: 'Error fetching hostels', error })
    }
  }

  public async store({ request, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const payload = request.only(['school_id', 'name', 'type', 'address', 'capacity', 'status', 'number_of_rooms', 'beds_per_room'])
      if (!payload.school_id) {
         return response.badRequest({ message: 'school_id is required', received: request.all() })
      }

      const hostel = await Hostel.create({
        schoolId: payload.school_id,
        name: payload.name,
        type: payload.type,
        address: payload.address,
        capacity: payload.capacity,
        status: payload.status || 'Active',
      }, { client: trx })

      if (payload.number_of_rooms && payload.beds_per_room) {
        for (let i = 1; i <= payload.number_of_rooms; i++) {
          const room = await HostelRoom.create({
            hostelId: hostel.id,
            roomNumber: `1${String(i).padStart(2, '0')}`, // e.g. 101, 102
            floor: 'Ground Floor',
            capacity: payload.beds_per_room,
            status: 'Active',
          }, { client: trx })

          const beds = []
          for (let j = 0; j < payload.beds_per_room; j++) {
            const bedLetter = String.fromCharCode(65 + j)
            beds.push({
              roomId: room.id,
              bedNumber: `${room.roomNumber}-${bedLetter}`,
              status: 'Available' as const,
            })
          }
          await HostelBed.createMany(beds, { client: trx })
        }
      }

      await trx.commit()
      return response.created(hostel)
    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.internalServerError({ message: 'Error creating hostel', error })
    }
  }

  public async show({ params, response }: HttpContext) {
    try {
      const hostel = await Hostel.findOrFail(params.id)
      await hostel.load('rooms', (roomsQuery: any) => {
        roomsQuery.preload('beds', (bedsQuery: any) => {
            bedsQuery.preload('allocations', (allocationQuery: any) => {
                allocationQuery.where('status', 'Active').preload('student')
            })
        })
      })

      return response.ok(hostel)
    } catch (error) {
      console.error(error)
      return response.notFound({ message: 'Hostel not found', error })
    }
  }

  public async update({ params, request, response }: HttpContext) {
    try {
      const hostel = await Hostel.findOrFail(params.id)
      const payload = request.only(['name', 'type', 'address', 'capacity', 'status'])

      hostel.merge(payload)
      await hostel.save()

      return response.ok(hostel)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error updating hostel', error })
    }
  }

  public async destroy({ params, response }: HttpContext) {
    try {
      const hostel = await Hostel.findOrFail(params.id)
      await hostel.delete()

      return response.ok({ message: 'Hostel deleted successfully' })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error deleting hostel', error })
    }
  }
}