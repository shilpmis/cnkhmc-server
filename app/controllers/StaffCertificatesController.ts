import type { HttpContext } from '@adonisjs/core/http'
import Staff from '#models/Staff'
import StaffCertificateLog from '#models/StaffCertificateLog'
import SpacesService from '#services/SpacesService'

export default class StaffCertificatesController {
  /**
   * Upload generated certificate to DigitalOcean Spaces and record audit log
   * POST /api/v1/staff/:staff_id/certificates/generate
   */
  public async generateAndUpload({ request, response, params, auth }: HttpContext) {
    try {
      const staffId = Number(params.staff_id)
      if (!staffId || isNaN(staffId)) {
        return response.badRequest({ success: false, message: 'Invalid staff ID' })
      }

      const staff = await Staff.find(staffId)
      if (!staff) {
        return response.notFound({ success: false, message: 'Staff member not found' })
      }

      const {
        certificate_type = 'EXPERIENCE_CERTIFICATE',
        reference_no = null,
        certificate_date = null,
        file_content,
        file_type = 'doc',
        file_name,
        metadata = null,
      } = request.body()

      if (!file_content) {
        return response.badRequest({
          success: false,
          message: 'Certificate file content is required for storage',
        })
      }

      // Calculate generation count for this staff member and certificate type
      const countResult = await StaffCertificateLog.query()
        .where('staff_id', staffId)
        .where('certificate_type', certificate_type)
        .count('* as total')
      const generationNumber = Number(countResult[0]?.$extras?.total || 0) + 1

      // Format clean staff name for key
      const safeStaffName = `${staff.first_name || ''}_${staff.last_name || ''}`
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '_')
      const timestamp = Date.now()
      const ext = file_type.startsWith('.') ? file_type.slice(1) : file_type

      const s3Key = `certificates/staff_${staffId}/${certificate_type.toLowerCase()}_v${generationNumber}_${timestamp}.${ext}`
      const finalFileName = file_name || `${certificate_type}_${safeStaffName}_v${generationNumber}.${ext}`

      // Determine content type
      let contentType = 'application/octet-stream'
      if (ext === 'doc' || ext === 'msword') {
        contentType = 'application/msword;charset=utf-8'
      } else if (ext === 'docx') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      } else if (ext === 'pdf') {
        contentType = 'application/pdf'
      } else if (ext === 'html') {
        contentType = 'text/html;charset=utf-8'
      }

      // Upload to DigitalOcean Spaces
      const uploadResult = await SpacesService.upload({
        key: s3Key,
        body: file_content,
        contentType,
        contentDisposition: `inline; filename="${finalFileName}"`,
        isPublic: true,
      })

      // Create Audit Log Record
      const log = await StaffCertificateLog.create({
        staff_id: staffId,
        certificate_type,
        reference_no: reference_no || null,
        certificate_date: certificate_date || null,
        file_name: finalFileName,
        file_url: uploadResult.url,
        file_type: ext,
        generation_number: generationNumber,
        generated_by: auth?.user?.id || null,
        metadata: metadata || null,
      })

      return response.ok({
        success: true,
        message: 'Certificate saved to cloud storage and audit logged successfully',
        data: {
          log,
          file_url: uploadResult.url,
          generation_number: generationNumber,
          total_generated: generationNumber,
          is_cloud: uploadResult.isCloud,
        },
      })
    } catch (error: any) {
      console.error('[StaffCertificatesController.generateAndUpload] Error:', error)
      return response.internalServerError({
        success: false,
        message: error.message || 'Failed to save certificate and log audit record',
      })
    }
  }

  /**
   * Retrieve audit logs and generation statistics for a staff member
   * GET /api/v1/staff/:staff_id/certificates/audit-logs
   */
  public async getAuditLogs({ response, params, request }: HttpContext) {
    try {
      const staffId = Number(params.staff_id)
      if (!staffId || isNaN(staffId)) {
        return response.badRequest({ success: false, message: 'Invalid staff ID' })
      }

      const certificateType = request.input('certificate_type')

      let query = StaffCertificateLog.query()
        .where('staff_id', staffId)
        .preload('user', (userQuery) => {
          userQuery.select('id', 'name', 'email')
        })
        .orderBy('created_at', 'desc')

      if (certificateType) {
        query = query.where('certificate_type', certificateType)
      }

      const logs = await query

      return response.ok({
        success: true,
        total_count: logs.length,
        logs,
      })
    } catch (error: any) {
      console.error('[StaffCertificatesController.getAuditLogs] Error:', error)
      return response.internalServerError({
        success: false,
        message: error.message || 'Failed to retrieve certificate audit logs',
      })
    }
  }
}
