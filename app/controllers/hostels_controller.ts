import type { HttpContext } from '@adonisjs/core/http'
import Hostel from '#models/hostel'
import HostelRoom from '#models/hostel_room'
import HostelBed from '#models/hostel_bed'
import HostelAllocation from '#models/hostel_allocation'
import Classes from '#models/Classes'
import SpacesService from '#services/SpacesService'
import ExcelJS from 'exceljs'
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

  public async exportReport({ request, response, auth }: HttpContext) {
    try {
      const schoolId = request.qs().school_id || auth.user?.school_id || request.header('schoolId')
      const hostelId = request.qs().hostel_id && request.qs().hostel_id !== 'all' ? Number(request.qs().hostel_id) : null
      const classId = request.qs().class_id && request.qs().class_id !== 'all' ? Number(request.qs().class_id) : null

      // Build query for active allocations
      const allocationsQuery = HostelAllocation.query()
        .where('status', 'Active')
        .preload('bed', (bedQuery: any) => {
          bedQuery.preload('room', (roomQuery: any) => {
            roomQuery.preload('hostel')
          })
        })
        .preload('student', (studentQuery: any) => {
          studentQuery.preload('academic_class', (enrollQuery: any) => {
            enrollQuery
              .preload('division', (divQuery: any) => {
                divQuery.preload('class')
              })
              .orderBy('academic_year', 'desc')
          })
        })

      if (schoolId) {
        allocationsQuery.whereHas('bed', (bedQuery: any) => {
          bedQuery.whereHas('room', (roomQuery: any) => {
            roomQuery.whereHas('hostel', (hostelQuery: any) => {
              hostelQuery.where('school_id', schoolId)
            })
          })
        })
      }

      if (hostelId) {
        allocationsQuery.whereHas('bed', (bedQuery: any) => {
          bedQuery.whereHas('room', (roomQuery: any) => {
            roomQuery.where('hostel_id', hostelId)
          })
        })
      }

      const allocations = await allocationsQuery

      // Helper to extract student's current class name and id
      const getStudentClassInfo = (student: any): { classId: number | null; className: string } => {
        if (!student?.academic_class || student.academic_class.length === 0) {
          return { classId: null, className: 'General' }
        }
        const activeEnrollment =
          student.academic_class.find((e: any) => e.status === 'pursuing') ||
          student.academic_class[0]
        const cls = activeEnrollment?.division?.class
        return {
          classId: cls?.id || null,
          className: cls?.class || 'General',
        }
      }

      // Filter by class_id if requested
      let filteredAllocations = allocations
      if (classId) {
        filteredAllocations = allocations.filter((alloc) => {
          const info = getStudentClassInfo(alloc.student)
          return info.classId === classId
        })
      }

      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'CNKHMC'
      workbook.created = new Date()

      // Function to build a sheet strictly matching "hostel Report_9655.xlsx"
      const buildSheetForClass = (sheetName: string, displayClassName: string, items: typeof allocations) => {
        const sheet = workbook.addWorksheet(sheetName)

        // Set column widths matching sample
        sheet.getColumn(1).width = 10  // Sr.No
        sheet.getColumn(2).width = 38  // Name
        sheet.getColumn(3).width = 15  // Floor
        sheet.getColumn(4).width = 15  // Room No.
        sheet.getColumn(5).width = 15  // Bed Number

        // Row 1: College Header (Merged A1:E1)
        sheet.mergeCells('A1:E1')
        const cellA1 = sheet.getCell('A1')
        cellA1.value = 'C.N.Kothari Homoeopathic Medical College & Research Center,Vyara'
        cellA1.font = { name: 'Calibri', size: 12, family: 2 }
        cellA1.alignment = { horizontal: 'center', vertical: 'middle' }
        sheet.getRow(1).height = 18

        // Row 2: Hostel Report (Merged A2:E2)
        sheet.mergeCells('A2:E2')
        const cellA2 = sheet.getCell('A2')
        cellA2.value = 'Hostel Report'
        cellA2.font = { name: 'Calibri', size: 16, bold: true, family: 2 }
        cellA2.alignment = { horizontal: 'center', vertical: 'middle' }
        sheet.getRow(2).height = 24

        // Row 3: Class
        const cellA3 = sheet.getCell('A3')
        cellA3.value = 'Class'
        cellA3.font = { name: 'Calibri', size: 11, bold: true, family: 2 }

        const cellB3 = sheet.getCell('B3')
        cellB3.value = displayClassName
        cellB3.font = { name: 'Calibri', size: 11, bold: true, family: 2 }
        sheet.getRow(3).height = 18

        // Row 4: Column Headers with thin borders
        const headers = ['Sr.No', 'Name', 'Floor', 'Room No.', 'Bed Number']
        const thinBorder = {
          top: { style: 'thin' as const },
          bottom: { style: 'thin' as const },
          left: { style: 'thin' as const },
          right: { style: 'thin' as const },
        }

        const headerRow = sheet.getRow(4)
        headers.forEach((h, idx) => {
          const cell = headerRow.getCell(idx + 1)
          cell.value = h
          cell.font = { name: 'Calibri', size: 11, family: 2 }
          cell.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'center' : 'left' }
          cell.border = thinBorder
        })
        headerRow.height = 20

        // Sort items by room number and bed number
        const sortedItems = [...items].sort((a, b) => {
          const roomA = a.bed?.room?.roomNumber || ''
          const roomB = b.bed?.room?.roomNumber || ''
          if (roomA !== roomB) return roomA.localeCompare(roomB, undefined, { numeric: true })
          const bedA = a.bed?.bedNumber || ''
          const bedB = b.bed?.bedNumber || ''
          return bedA.localeCompare(bedB, undefined, { numeric: true })
        })

        // Determine row count (at least 15 to preserve template appearance if few students)
        const rowCount = Math.max(sortedItems.length, 15)

        for (let i = 0; i < rowCount; i++) {
          const rowNum = 5 + i
          const row = sheet.getRow(rowNum)
          row.height = 18
          const item = sortedItems[i]

          const cellSr = row.getCell(1)
          cellSr.value = i + 1
          cellSr.font = { name: 'Calibri', size: 11, family: 2 }
          cellSr.alignment = { horizontal: 'center', vertical: 'middle' }
          cellSr.border = thinBorder

          const cellName = row.getCell(2)
          let studentName = ''
          if (item?.student) {
            studentName = [item.student.first_name, item.student.middle_name, item.student.last_name]
              .filter(Boolean)
              .join(' ')
              .trim()
          }
          cellName.value = studentName
          cellName.font = { name: 'Calibri', size: 11, family: 2 }
          cellName.alignment = { vertical: 'middle' }
          cellName.border = thinBorder

          const cellFloor = row.getCell(3)
          let floor = item?.bed?.room?.floor || ''
          if (floor.toLowerCase() === 'ground floor') {
            floor = 'Ground'
          } else if (floor) {
            floor = floor.replace(/\s+Floor$/i, '')
          }
          cellFloor.value = floor
          cellFloor.font = { name: 'Calibri', size: 11, family: 2 }
          cellFloor.alignment = { vertical: 'middle' }
          cellFloor.border = thinBorder

          const cellRoom = row.getCell(4)
          cellRoom.value = item?.bed?.room?.roomNumber || ''
          cellRoom.font = { name: 'Calibri', size: 11, family: 2 }
          cellRoom.alignment = { vertical: 'middle' }
          cellRoom.border = thinBorder

          const cellBed = row.getCell(5)
          cellBed.value = item?.bed?.bedNumber || ''
          cellBed.font = { name: 'Calibri', size: 11, family: 2 }
          cellBed.alignment = { vertical: 'middle' }
          cellBed.border = thinBorder
        }
      }

      if (classId) {
        let className = 'Class'
        const matchedAlloc = filteredAllocations[0]
        if (matchedAlloc?.student) {
          className = getStudentClassInfo(matchedAlloc.student).className
        } else {
          const cls = await Classes.find(classId)
          if (cls) className = cls.class
        }

        buildSheetForClass('Sheet1', className, filteredAllocations)
      } else {
        // Group allocations by class
        const classMap = new Map<string, typeof allocations>()
        for (const alloc of filteredAllocations) {
          const info = getStudentClassInfo(alloc.student)
          const key = info.className || 'General'
          if (!classMap.has(key)) {
            classMap.set(key, [])
          }
          classMap.get(key)!.push(alloc)
        }

        if (classMap.size === 0) {
          buildSheetForClass('Sheet1', 'All Classes', [])
        } else if (classMap.size === 1) {
          const [className, items] = Array.from(classMap.entries())[0]
          buildSheetForClass('Sheet1', className, items)
        } else {
          // Multiple classes: sheet per class, first sheet named Sheet1
          let isFirst = true
          for (const [className, items] of classMap.entries()) {
            const sanitizedSheetName = isFirst ? 'Sheet1' : className.substring(0, 31).replace(/[\\/?*[\]]/g, '')
            buildSheetForClass(sanitizedSheetName, className, items)
            isFirst = false
          }
        }
      }

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
      const uniqueTimestamp = new Date().getTime()
      const fileName = `hostel_report_${uniqueTimestamp}.xlsx`

      // Upload to DigitalOcean Spaces
      try {
        const uploadResult = await SpacesService.uploadExport(
          'hostels',
          fileName,
          buffer,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response.header('x-cloud-url', uploadResult.url)
        response.header('Access-Control-Expose-Headers', 'x-cloud-url')
      } catch (err) {
        console.error('[HostelsController] Error uploading export to Spaces:', err)
      }

      response.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      response.header('Content-Disposition', `attachment; filename="${fileName}"`)

      return response.send(buffer)
    } catch (error: any) {
      console.error('[HostelsController] exportReport error:', error)
      return response.internalServerError({
        message: 'Error exporting hostel report',
        error: error?.message || error,
      })
    }
  }
}