import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/Organization'
import Entity from '#models/Entity'

export default class ReportController {
  /** Aggregated reports for ORG_ADMIN across all entities */
  public async getOrganizationAggregatedReport(ctx: HttpContext) {
    try {
      const organizationId = ctx.params.organization_id
      
      // Verification (could be middleware-driven)
      const organization = await Organization.find(organizationId)
      if (!organization) return ctx.response.notFound({ message: 'Organization not found' })

      const entities = await Entity.query().where('organization_id', organizationId)
      const entityIds = entities.map(e => e.id)

      if (entityIds.length === 0) {
        return ctx.response.ok({
          organization_id: organizationId,
          entities_count: 0,
          student_analytics: [],
          financial_analytics: [],
          attendance_analytics: []
        })
      }

      // 1. Consolidated Student Counts by Entity
      const studentCounts = await db.from('students')
        .whereIn('school_id', entityIds)
        .groupBy('school_id')
        .select('school_id')
        .count('* as count')

      // 2. Consolidated Fee Collection Summary
      const feeSummary = await db.from('student_fees_master')
        .join('students', 'student_fees_master.student_id', 'students.id')
        .whereIn('students.school_id', entityIds)
        .groupBy('students.school_id')
        .select('students.school_id as school_id')
        .sum('student_fees_master.paid_amount as total_collected')
        .sum('student_fees_master.total_amount as total_receivable')

      // 3. Overall Attendance Trend (Consolidated)
      const attendanceTrend = await db.from('attendance_masters')
        .join('classes', 'attendance_masters.class_id', 'classes.id')
        .join('attendance_details', 'attendance_masters.id', 'attendance_details.attendance_master_id')
        .whereIn('classes.school_id', entityIds)
        .groupBy('attendance_masters.attendance_date')
        .select('attendance_masters.attendance_date as date')
        .select(
          db.raw(
            "COALESCE(ROUND(SUM(CASE WHEN attendance_details.attendance_status IN ('present', 'late') THEN 1 ELSE 0 END) / NULLIF(COUNT(attendance_details.id), 0) * 100, 2), 0) as avg_attendance"
          )
        )
        .orderBy('attendance_masters.attendance_date', 'desc')
        .limit(30)

      return ctx.response.ok({
        organization_id: organizationId,
        entities_count: entities.length,
        student_analytics: studentCounts,
        financial_analytics: feeSummary,
        attendance_analytics: attendanceTrend
      })
    } catch (error) {
      console.error('Report Error:', error)
      return ctx.response.status(500).json({ message: 'Failed to fetch reports', error: error.message })
    }
  }

  /** Specific detailed report for an entity */
  public async getEntityDetailedReport(ctx: HttpContext) {
    try {
      const entityId = ctx.params.entity_id
      const entity = await Entity.find(entityId)
      if (!entity) return ctx.response.notFound({ message: 'Entity not found' })

      // Logic for detailed entity report
      return ctx.response.ok({ message: 'Detailed entity report placeholder' })
    } catch (error) {
      return ctx.response.status(500).json(error)
    }
  }
}
