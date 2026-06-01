import AdmissionInquiry from '#models/Inquiries'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class AdmissionDashboardController {
  public async getDashboardData({ auth, request, response }: HttpContext) {
    try {
      // Get the authenticated user's school_id (assuming the user is authenticated)
      const schoolId = auth.user!.school_id
      if (!schoolId) return response.forbidden({ message: 'School ID missing' })

      const academicSessionId = request.input('academic_session')
      if (!academicSessionId) return response.badRequest({ message: 'Academic session missing' })

      const baseQuery = AdmissionInquiry.query()
        .where('school_id', schoolId)
        .andWhere('academic_session_id', academicSessionId)
      // Get total inquiries
      const totalInquiries = await baseQuery.clone().count('* as total')

      // Get pending applications
      const pendingApplications = await baseQuery
        .clone()
        .where('status', 'pending')
        .count('* as total')

      // Get accepted admissions (approved, admitted)
      const acceptedAdmissions = await baseQuery
        .clone()
        .whereIn('status', ['approved', 'admitted'])
        .count('* as total')

      // Get upcoming interviews
      const upcomingInterviews = await baseQuery
        .clone()
        .where('status', 'interview scheduled')
        .count('* as total')

      // Prepare the dashboard data
      const dashboardData = {
        totalInquiries: Number(totalInquiries[0]?.$extras.total || 0),
        pendingApplications: Number(pendingApplications[0]?.$extras.total || 0),
        acceptedAdmissions: Number(acceptedAdmissions[0]?.$extras.total || 0),
        upcomingInterviews: Number(upcomingInterviews[0]?.$extras.total || 0),
      }

      return response.ok(dashboardData)
    } catch (error) {
      console.error('Error fetching admission dashboard data:', error)
      return response.internalServerError({
        message: 'Failed to fetch dashboard data',
        error: error.message,
      })
    }
  }

  /**
   * Get detailed admission statistics by status
   */
  public async getDetailedStatistics({ response, request, auth }: HttpContext) {
    try {
      const schoolId = auth.user!.school_id
      if (!schoolId) return response.forbidden({ message: 'School ID missing' })

      const academicSessionId = request.input('academic_session')
      if (!academicSessionId) return response.badRequest({ message: 'Academic session missing' })

      // Base query to filter by school if needed
      const baseQuery = AdmissionInquiry.query()
        .where('school_id', schoolId)
        .andWhere('academic_session_id', academicSessionId)

      // Get counts for each status
      const statusCounts = await baseQuery.select('status').count('* as count').groupBy('status')

      // Transform the results into a more usable format
      const statusStats: Record<string, number> = {}
      statusCounts.forEach((item) => {
        statusStats[item.status] = Number(item.$extras.count || 0)
      })

      return response.ok(statusStats)
    } catch (error) {
      console.error('Error fetching detailed admission statistics:', error)
      return response.internalServerError({
        message: 'Failed to fetch detailed statistics',
        error: error.message,
      })
    }
  }

  /**
   * Get trend data for admissions over time, grouped by class
   */
  public async getTrendData({ request, response, auth }: HttpContext) {
    try {
      const { period = 'week', limit = 6 } = request.qs()
      const schoolId = auth.user!.school_id

      // Base query
      // const baseQuery = db.query()
      //   .from('admission_inquiries as ai')
      //   .where('school_id', schoolId)
      //   .andWhere('academic_session_id', request.input('academic_session'))

      // // Include class information in the query
      // const records = await baseQuery
      //   .groupBy('created_at', 'inquiry_for_class')
      //   .orderBy('created_at', period === 'month' ? 'desc' : 'asc')
      //   .limit(limit)

      const academicSessionId = request.input('academic_session')
      if (!academicSessionId) return response.badRequest({ message: 'Academic session missing' })

      const records = await db.query()
        .select('ai.created_at', 'ai.inquiry_for_class', 'c.class' , db.raw('count(*) as total'))
        .from('admission_inquiries as ai')
        .leftJoin('classes as c', 'ai.inquiry_for_class', 'c.id')
        .groupBy('ai.created_at', 'ai.inquiry_for_class')
        .orderBy('ai.created_at', period === 'month' ? 'desc' : 'asc')
        .where('ai.school_id', schoolId!)
        .andWhere('ai.academic_session_id', academicSessionId)
        .limit(limit)

      // Define types for our data structures
      type ClassCount = Record<string, number>

      interface TimeEntry {
        time_period: string
        classes: ClassCount
      }

      interface ResultEntry {
        time_period: string
        total: number
        [className: string]: number | string // Allow string class names as keys
      }

      // Process records to group by time period and class
      const groupedByTimeAndClass = new Map<string, TimeEntry>()
      const classes = new Set<string>()

      records.forEach((record) => {
        console.log('Processing record:', record)
        let timePeriod: string
        const date = new Date(record.created_at)
        const classInfo: string = String(`class ${record.class}` || 'Unspecified')

        // Track all unique classes for reference
        classes.add(classInfo)

        // Create time period format based on requested period
        switch (period) {
          case 'day':
            timePeriod = date.toISOString().split('T')[0] // YYYY-MM-DD
            break
          case 'week':
            const startOfYear = new Date(date.getFullYear(), 0, 1)
            const weekNumber = Math.ceil(
              ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
            )
            timePeriod = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`
            break
          case 'month':
          default:
            timePeriod = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
            break
        }

        // Create a composite key for time period and class
        const key = timePeriod

        if (!groupedByTimeAndClass.has(key)) {
          groupedByTimeAndClass.set(key, {
            time_period: timePeriod,
            classes: {},
          })
        }

        // Increment count for this class in this time period
        const timeEntry = groupedByTimeAndClass.get(key)!
        timeEntry.classes[classInfo] = (timeEntry.classes[classInfo] || 0) + 1
      })

      // Convert to array and sort chronologically
      let result = Array.from(groupedByTimeAndClass.values())
        .sort((a, b) => a.time_period.localeCompare(b.time_period))
        .slice(-limit) // Take only the last 'limit' items

      // Transform data structure to be more usable for frontend
      const transformedResult: ResultEntry[] = result.map((item) => {
        const entry: ResultEntry = {
          time_period: item.time_period,
          total: 0, // Initialize total
        }

        // Add all classes to each time period for consistency
        Array.from(classes).forEach((className) => {
          entry[className] = item.classes[className] || 0
        })

        // Add a total count for each time period
        entry.total = Object.values(item.classes).reduce((sum, count) => sum + count, 0)

        return entry
      })

      return response.ok({
        trends: transformedResult,
        classes: Array.from(classes),
      })
    } catch (error) {
      console.error('Error fetching class-wise admission trend data:', error)
      return response.internalServerError({
        message: 'Failed to fetch trend data',
        error: error.message,
      })
    }
  }
}
