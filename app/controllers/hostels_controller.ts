import type { HttpContext } from '@adonisjs/core/http'
import Hostel from '#models/hostel'
import HostelRoom from '#models/hostel_room'
import HostelBed from '#models/hostel_bed'
import db from '@adonisjs/lucid/services/db'

export default class HostelsController {
  public async index({ request, response, auth }: HttpContext) {
    try {
      const schoolId = request.qs().school_id || auth.user?.school_id || request.header('schoolId')
      if (!schoolId) {
        return response.badRequest({ message: 'school_id is required' })
      }

      const hostels = await Hostel.query()
        .where('school_id', schoolId)
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
      try { fs.appendFileSync('scratch/last_error.log', new Date().toISOString() + '\n' + String(error.message) + '\n' + String(error.stack) + '\n\n') } catch(e) {}
      console.error(error)
      return response.internalServerError({ message: 'Error fetching hostels', error })
    }
  }

  public async store({ request, response, auth }: HttpContext) {
    const trx = await db.transaction()
    try {
      const payload = request.only([
        'school_id',
        'name',
        'type',
        'address',
        'capacity',
        'status',
        'number_of_rooms',
        'number_of_floors',
        'beds_per_room',
        'floors',
      ])
      const schoolId = payload.school_id || auth.user?.school_id || request.header('schoolId')
      if (!schoolId) {
        return response.badRequest({ message: 'school_id is required', received: request.all() })
      }

      let totalCapacity = payload.capacity || 0
      let totalRooms = payload.number_of_rooms || 0

      // If custom structured floors array is provided, calculate total rooms and capacity
      if (Array.isArray(payload.floors) && payload.floors.length > 0) {
        totalRooms = 0
        totalCapacity = 0
        for (const floor of payload.floors) {
          if (Array.isArray(floor.rooms)) {
            for (const room of floor.rooms) {
              totalRooms++
              const beds = Number(room.beds || room.capacity || payload.beds_per_room || 1)
              totalCapacity += beds
            }
          }
        }
      }

      const hostel = await Hostel.create(
        {
          schoolId: Number(schoolId),
          name: payload.name,
          type: payload.type,
          address: payload.address,
          capacity: totalCapacity || payload.capacity || 0,
          status: payload.status || 'Active',
        },
        { client: trx }
      )

      if (Array.isArray(payload.floors) && payload.floors.length > 0) {
        for (const floor of payload.floors) {
          const floorName = floor.floorName || floor.name || 'Ground Floor'
          if (Array.isArray(floor.rooms)) {
            for (const r of floor.rooms) {
              const bedCount = Number(r.beds || r.capacity || 1)
              const room = await HostelRoom.create(
                {
                  hostelId: hostel.id,
                  roomNumber: String(r.roomNumber || r.room_number).trim(),
                  floor: floorName,
                  capacity: bedCount,
                  status: 'Active',
                },
                { client: trx }
              )

              const beds = []
              for (let j = 0; j < bedCount; j++) {
                const bedLetter = String.fromCharCode(65 + j)
                beds.push({
                  roomId: room.id,
                  bedNumber: `${room.roomNumber}-${bedLetter}`,
                  status: 'Available' as const,
                })
              }
              if (beds.length > 0) {
                await HostelBed.createMany(beds, { client: trx })
              }
            }
          }
        }
      } else if (payload.number_of_rooms && payload.beds_per_room) {
        const numberOfFloors = Math.max(1, payload.number_of_floors || 1)
        const roomsPerFloor = Math.ceil(payload.number_of_rooms / numberOfFloors)
        let roomCount = 0

        for (let f = 0; f < numberOfFloors; f++) {
          const floorName =
            f === 0 ? 'Ground Floor' : `${f}${f === 1 ? 'st' : f === 2 ? 'nd' : f === 3 ? 'rd' : 'th'} Floor`

          for (let i = 1; i <= roomsPerFloor && roomCount < payload.number_of_rooms; i++) {
            roomCount++
            const roomNumber = `${f + 1}${String(i).padStart(2, '0')}` // e.g., 101, 102 for Ground, 201, 202 for 1st Floor
            const room = await HostelRoom.create(
              {
                hostelId: hostel.id,
                roomNumber,
                floor: floorName,
                capacity: payload.beds_per_room,
                status: 'Active',
              },
              { client: trx }
            )

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