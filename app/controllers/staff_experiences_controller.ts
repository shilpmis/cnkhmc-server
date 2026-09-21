import type { HttpContext } from '@adonisjs/core/http'
import Staff from '#models/Staff'
import StaffExperience from '#models/staff_experience'
import * as xlsx from 'xlsx'
import { DateTime } from 'luxon'
import fs from 'node:fs/promises'

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

      const buffer = await fs.readFile(file.tmpPath!)
      const workbook = xlsx.read(buffer, { type: 'buffer' })

      const unmatchedStaff: string[] = []
      let processedCount = 0

      for (const rawSheetName of workbook.SheetNames) {
        const sheetName = rawSheetName.trim()
        if (!sheetName) continue

        // 1. Clean honorifics from sheet name ("Dr Bhavana Patel" -> "Bhavana Patel")
        const cleanName = sheetName
          .replace(/^(dr|mr|mrs|prof|miss|ms)\.?\s+/i, '')
          .trim()

        const nameTokens = cleanName.split(/\s+/).filter(Boolean)

        // 2. Resolve Staff from DB
        let resolvedStaff = null

        // Try exact/like match on full cleaned name
        resolvedStaff = await Staff.query()
          .whereRaw("LOWER(CONCAT(first_name, ' ', COALESCE(middle_name, ''), ' ', last_name)) LIKE ?", [
            `%${cleanName.toLowerCase().replace(/\s+/g, '%')}%`,
          ])
          .first()

        if (!resolvedStaff) {
          // Try match without middle name
          resolvedStaff = await Staff.query()
            .whereRaw("LOWER(CONCAT(first_name, ' ', last_name)) LIKE ?", [
              `%${cleanName.toLowerCase().replace(/\s+/g, '%')}%`,
            ])
            .first()
        }

        if (!resolvedStaff && nameTokens.length >= 2) {
          // Try matching first and last name tokens
          const firstNameToken = nameTokens[0].toLowerCase()
          const lastNameToken = nameTokens[nameTokens.length - 1].toLowerCase()

          resolvedStaff = await Staff.query()
            .whereRaw('LOWER(first_name) LIKE ? AND LOWER(last_name) LIKE ?', [
              `%${firstNameToken}%`,
              `%${lastNameToken}%`,
            ])
            .first()
        }

        if (!resolvedStaff) {
          unmatchedStaff.push(rawSheetName)
          continue
        }

        // 3. Read sheet rows
        const worksheet = workbook.Sheets[rawSheetName]
        const rows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' })

        for (const row of rows) {
          // Helper to find key case-insensitively
          const getValue = (patterns: string[]) => {
            for (const key of Object.keys(row)) {
              const lowerKey = key.toLowerCase().trim()
              if (patterns.some((p) => lowerKey.includes(p.toLowerCase()))) {
                return row[key]
              }
            }
            return ''
          }

          const rawPostName = String(getValue(['post', 'designation']) || '').trim()
          const rawInstitute = String(getValue(['institute']) || '').trim()
          const rawDept = String(getValue(['department']) || '').trim()
          const rawFrom = getValue(['from'])
          const rawTo = getValue(['to'])
          const rawRegulation = String(getValue(['regulation', 'appointment']) || '').trim()

          // Skip header/subheader rows like "DD/MM/YY" or "Name of post held"
          if (
            !rawPostName ||
            !rawInstitute ||
            rawPostName.toLowerCase().includes('name of post') ||
            String(rawFrom).toLowerCase().includes('dd/mm') ||
            String(rawTo).toLowerCase().includes('dd/mm')
          ) {
            continue
          }

          // Parse dates
          const parseExcelDate = (val: any): DateTime | null => {
            if (val === null || val === undefined || val === '') return null

            if (typeof val === 'number') {
              // Excel date serial number
              const date = new Date(Math.round((val - 25569) * 86400 * 1000))
              return DateTime.fromJSDate(date)
            }

            const strVal = String(val).trim()
            if (!strVal) return null

            const lowerVal = strVal.toLowerCase()
            if (
              lowerVal.includes('till') ||
              lowerVal.includes('present') ||
              lowerVal.includes('continue')
            ) {
              return null
            }

            // Handle DD-MM-YY or DD/MM/YY or DD-MM-YYYY or DD/MM/YYYY
            const parts = strVal.split(/[-/]/)
            if (parts.length === 3) {
              let day = parseInt(parts[0], 10)
              let month = parseInt(parts[1], 10)
              let year = parseInt(parts[2], 10)

              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                if (year < 100) {
                  year += year < 50 ? 2000 : 1900
                }
                const dt = DateTime.fromObject({ day, month, year })
                if (dt.isValid) return dt
              }
            }

            const jsDate = new Date(strVal)
            if (!isNaN(jsDate.getTime())) {
              return DateTime.fromJSDate(jsDate)
            }

            return null
          }

          const fromDate = parseExcelDate(rawFrom)
          const toDate = parseExcelDate(rawTo)

          // Check if experience already exists for this staff member
          const existingExp = await StaffExperience.query()
            .where('staff_id', resolvedStaff.id)
            .where('post_name', rawPostName)
            .where('institute_name', rawInstitute)
            .first()

          if (existingExp) {
            existingExp.department = rawDept || existingExp.department
            existingExp.appointment_regulation = rawRegulation || existingExp.appointment_regulation
            existingExp.from_date = fromDate
            existingExp.to_date = toDate
            await existingExp.save()
          } else {
            await StaffExperience.create({
              staff_id: resolvedStaff.id,
              post_name: rawPostName,
              institute_name: rawInstitute,
              department: rawDept,
              appointment_regulation: rawRegulation,
              from_date: fromDate,
              to_date: toDate,
            })
          }
        }

        // 4. Calculate total experience for staff member
        const allExperiences = await StaffExperience.query().where('staff_id', resolvedStaff.id)
        let totalMonths = 0

        for (const exp of allExperiences) {
          if (exp.from_date) {
            const end = exp.to_date || DateTime.now()
            const diff = end.diff(exp.from_date, ['months', 'years']).toObject()
            const expMonths = (diff.years || 0) * 12 + (diff.months || 0)
            if (expMonths > 0) totalMonths += expMonths
          }
        }

        const totalYears = Math.round(totalMonths / 12)
        resolvedStaff.total_experience = totalYears
        await resolvedStaff.save()

        processedCount++
      }

      return response.ok({
        message: 'Bulk upload completed',
        processed_count: processedCount,
        unmatched_staff: unmatchedStaff,
      })
    } catch (error) {
      console.error('Error during experience bulk upload:', error)
      return response.internalServerError({
        message: error.message || 'An error occurred during upload',
        stack: error.stack,
      })
    }
  }
}