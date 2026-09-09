import type { HttpContext } from '@adonisjs/core/http'
import HostelRoom from '#models/hostel_room'
import HostelBed from '#models/hostel_bed'
import db from '@adonisjs/lucid/services/db'

export default class HostelRoomsController {
  public async store({ params, request, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const payload = request.only(['hostel_id', 'room_number', 'floor', 'capacity', 'status'])
      const hostelId = params.hostel_id || payload.hostel_id || request.input('hostel_id')
      if (!hostelId) {
         return response.badRequest({ message: 'hostel_id is required' })
      }

      const room = await HostelRoom.create({
        hostelId: Number(hostelId),
        roomNumber: payload.room_number,
        floor: payload.floor,
        capacity: payload.capacity || 0,
        status: payload.status || 'Active',
      }, { client: trx })

      // Auto-generate beds
      if (room.capacity > 0) {
        const beds = []
        // Letters A, B, C...
        for (let i = 0; i < room.capacity; i++) {
          const bedLetter = String.fromCharCode(65 + i) // 65 is 'A'
          beds.push({
            roomId: room.id,
            bedNumber: `${room.roomNumber}-${bedLetter}`,
            status: 'Available' as const,
          })
        }
        await HostelBed.createMany(beds, { client: trx })
      }

      await trx.commit()

      await room.load('beds')
      return response.created(room)
    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.internalServerError({ message: 'Error creating room', error })
    }
  }

  public async update({ params, request, response }: HttpContext) {
    try {
      const room = await HostelRoom.findOrFail(params.id)
      const payload = request.only(['room_number', 'floor', 'status'])

      // Note: We don't update capacity automatically to avoid deleting existing occupied beds.
      // If capacity needs to change, it would require a more complex UI flow to add/remove specific beds.
      
      room.merge(payload)
      await room.save()

      return response.ok(room)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error updating room', error })
    }
  }

  public async destroy({ params, response }: HttpContext) {
    try {
      const room = await HostelRoom.findOrFail(params.id)
      await room.delete()

      return response.ok({ message: 'Room deleted successfully' })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error deleting room', error })
    }
  }
}