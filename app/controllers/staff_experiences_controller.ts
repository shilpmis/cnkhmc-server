import type { HttpContext } from '@adonisjs/core/http'
import Staff from '#models/Staff'
import StaffExperience from '#models/staff_experience'
import * as xlsx from 'xlsx'
import { DateTime } from 'luxon'

export default class StaffExperiencesController {
  public async bulkUpload({ request, response }: HttpContext) {
    try {
      const file = request.file('file', {
        extnames: ['xlsx', 'xls', 'csv'],
        size: '10mb',
      })

      if (!file) {
        return response.badRequest({ message: 'No file uploaded' })
      }

      if (file.hasErrors) {
        return response.badRequest({ message: file.errors })
      }

      // Read file into memory (requires obtaining the buffer or reading from temp path)
      const buffer = await require('fs').promises.readFile(file.tmpPath)
      const workbook = xlsx.read(buffer, { type: 'buffer' })

      const unmatchedStaff: string[] = []
      let processedCount = 0

      for (const sheetName of workbook.SheetNames) {
        // Assume sheetName is something like "John Doe" or "John M Doe"
        // Let's do a simple fuzzy match or exact match on name
        const staff = await Staff.query()
          .whereRaw('LOWER(CONCAT(first_name, " ", COALESCE(middle_name, ""), " ", last_name)) LIKE ?', [`%${sheetName.toLowerCase().replace(/\s+/g, '%')}%`])
          .first()

        let resolvedStaff = staff

        if (!resolvedStaff) {
          // If we still can't find, try exact match ignoring middle name
           const staffWithoutMiddle = await Staff.query()
            .whereRaw('LOWER(CONCAT(first_name, " ", last_name)) = ?', [sheetName.toLowerCase().trim()])
            .first()
           
           if (!staffWithoutMiddle) {
             unmatchedStaff.push(sheetName)
             continue
           }
           resolvedStaff = staffWithoutMiddle
        }

        const worksheet = workbook.Sheets[sheetName]
        const rows: any[] = xlsx.utils.sheet_to_json(worksheet)

        for (const row of rows) {
          const postName = row['Name of post held'] || row['post_name']
          const instituteName = row['Institute Name'] || row['institute_name']
          const department = row['Department'] || row['department']
          
          if (!postName || !instituteName) continue; // Skip empty rows

          // Parse dates (Excel might give strings or serial numbers)
          const parseExcelDate = (val: any) => {
            if (!val) return null
            if (typeof val === 'number') {
              // Excel date serial
              const date = new Date(Math.round((val - 25569) * 86400 * 1000))
              return DateTime.fromJSDate(date)
            }
            if (typeof val === 'string') {
                const parts = val.split('/')
                if (parts.length === 3) {
                    return DateTime.fromObject({ day: parseInt(parts[0]), month: parseInt(parts[1]), year: parseInt(parts[2]) })
                }
            }
            return DateTime.fromJSDate(new Date(val))
          }

          const fromDate = parseExcelDate(row['From dd/mm/yy'] || row['from_date'])
          const toDate = parseExcelDate(row['To dd/mm/yy'] || row['to_date'])
          const regulation = row['Appointment under which regulation'] || row['appointment_regulation']

          // Check for existing experience (composite key approach)
          const existingExp = await StaffExperience.query()
            .where('staff_id', resolvedStaff.id)
            .where('institute_name', instituteName)
            .where('post_name', postName)
            .first()

          if (existingExp) {
            // Update logic
            let isDifferent = false
            if (existingExp.department !== department) isDifferent = true
            if (existingExp.appointment_regulation !== regulation) isDifferent = true
            
            if (fromDate && existingExp.from_date?.toISODate() !== fromDate.toISODate()) isDifferent = true
            if (toDate && existingExp.to_date?.toISODate() !== toDate.toISODate()) isDifferent = true

            if (isDifferent) {
              existingExp.department = department
              existingExp.appointment_regulation = regulation
              existingExp.from_date = fromDate
              existingExp.to_date = toDate
              await existingExp.save()
            }
            // else skip
          } else {
            // Add new
            await StaffExperience.create({
              staff_id: resolvedStaff.id,
              post_name: postName,
              institute_name: instituteName,
              department: department,
              appointment_regulation: regulation,
              from_date: fromDate,
              to_date: toDate
            })
          }
        }
        processedCount++
      }

      return response.ok({
        message: 'Bulk upload completed',
        processed_count: processedCount,
        unmatched_staff: unmatchedStaff
      })
    } catch (error) {
      return response.internalServerError({ message: error.message || 'An error occurred during upload' })
    }
  }
}