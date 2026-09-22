import type { HttpContext } from '@adonisjs/core/http'
import Students from '#models/Students'
import StudentCertificateLog from '#models/StudentCertificateLog'
import SpacesService from '#services/SpacesService'

export default class StudentCertificatesController {
  /**
   * Upload generated student certificate to DigitalOcean Spaces and record audit log
   * POST /api/v1/students/:student_id/certificates/generate
   */
  public async generateAndUpload({ request, response, params, auth }: HttpContext) {
    try {
      const studentId = Number(params.student_id)
      if (!studentId || isNaN(studentId)) {
        return response.badRequest({ success: false, message: 'Invalid student ID' })
      }

      const student = await Students.find(studentId)
      if (!student) {
        return response.notFound({ success: false, message: 'Student not found' })
      }

      const {
        certificate_type = 'BONAFIDE_CERTIFICATE',
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

      // Calculate generation count for this student and certificate type
      const countResult = await StudentCertificateLog.query()
        .where('student_id', studentId)
        .where('certificate_type', certificate_type)
        .count('* as total')
      const generationNumber = Number(countResult[0]?.$extras?.total || 0) + 1

      // Format clean student name for file key
      const safeStudentName = `${student.first_name || ''}_${student.last_name || ''}`
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '_')
      const timestamp = Date.now()
      const ext = file_type.startsWith('.') ? file_type.slice(1) : file_type

      const s3Key = `certificates/student_${studentId}/${certificate_type.toLowerCase()}_v${generationNumber}_${timestamp}.${ext}`
      const finalFileName = file_name || `${certificate_type}_${safeStudentName}_v${generationNumber}.${ext}`

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
      const log = await StudentCertificateLog.create({
        student_id: studentId,
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
        message: 'Student certificate saved to cloud storage and audit logged successfully',
        data: {
          log,
          file_url: uploadResult.url,
          generation_number: generationNumber,
          total_generated: generationNumber,
          is_cloud: uploadResult.isCloud,
        },
      })
    } catch (error: any) {
      console.error('[StudentCertificatesController.generateAndUpload] Error:', error)
      return response.internalServerError({
        success: false,
        message: error.message || 'Failed to save certificate and log audit record',
      })
    }
  }

  /**
   * Retrieve audit logs and generation statistics for a student
   * GET /api/v1/students/:student_id/certificates/audit-logs
   */
  public async getAuditLogs({ response, params, request }: HttpContext) {
    try {
      const studentId = Number(params.student_id)
      if (!studentId || isNaN(studentId)) {
        return response.badRequest({ success: false, message: 'Invalid student ID' })
      }

      const certificateType = request.input('certificate_type')

      let query = StudentCertificateLog.query()
        .where('student_id', studentId)
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
        logs: logs.map((log) => ({
          id: log.id,
          student_id: log.student_id,
          certificate_type: log.certificate_type,
          reference_no: log.reference_no,
          certificate_date: log.certificate_date,
          file_name: log.file_name,
          file_url: log.file_url,
          file_type: log.file_type,
          generation_number: log.generation_number,
          generated_by: log.generated_by,
          user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : null,
          metadata: log.metadata,
          created_at: log.createdAt?.toISO ? log.createdAt.toISO() : log.createdAt,
        })),
      })
    } catch (error: any) {
      console.error('[StudentCertificatesController.getAuditLogs] Error:', error)
      return response.internalServerError({
        success: false,
        message: error.message || 'Failed to fetch student certificate audit logs',
      })
    }
  }
}
