import type { HttpContext } from '@adonisjs/core/http'
import CertificateTemplate from '#models/certificate_template'

export default class CertificateTemplatesController {
  /**
   * List certificate templates with optional target_type ('staff' | 'student') and school_id filter
   */
  async index({ request, response, auth }: HttpContext) {
    try {
      const schoolId = request.input('school_id') || auth?.user?.school_id
      const targetType = request.input('target_type')
      const includeInactive = request.input('include_inactive', false)

      let query = CertificateTemplate.query()

      if (!includeInactive) {
        query = query.where('is_active', true)
      }

      if (targetType) {
        query = query.where('target_type', targetType)
      }

      if (schoolId) {
        query = query.where((q) => {
          q.where('school_id', schoolId).orWhereNull('school_id')
        })
      }

      const templates = await query.orderBy('created_at', 'desc')
      return response.status(200).json({ success: true, data: templates })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to fetch templates', error: error.message })
    }
  }

  /**
   * Create a new certificate template
   */
  async store({ request, response, auth }: HttpContext) {
    try {
      const body = { ...request.all(), ...request.body() }
      const {
        name,
        code,
        type,
        target_type = 'staff',
        targetType,
        description,
        content,
        school_id,
        schoolId,
        is_active = true,
        isActive,
      } = body

      if (!name || !content) {
        return response.badRequest({
          success: false,
          message: 'Template name and content are required',
        })
      }

      const finalSchoolId = school_id || schoolId || auth?.user?.school_id || null
      const finalTargetType = target_type || targetType || 'staff'
      const finalCode = code || name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')
      const finalType = type || finalCode
      const finalIsActive = isActive !== undefined ? isActive : is_active

      const template = await CertificateTemplate.create({
        name,
        code: finalCode,
        type: finalType,
        targetType: finalTargetType,
        description: description || null,
        content,
        schoolId: finalSchoolId,
        isActive: finalIsActive,
      })

      return response.status(201).json({
        success: true,
        message: 'Certificate template created successfully',
        data: template,
      })
    } catch (error: any) {
      console.error('Error creating template:', error)
      return response.status(500).json({
        success: false,
        message: 'Failed to create template: ' + error.message,
        error: error.message,
      })
    }
  }

  /**
   * Get single certificate template by ID
   */
  async show({ params, response }: HttpContext) {
    try {
      const template = await CertificateTemplate.findOrFail(params.id)
      return response.status(200).json({ success: true, data: template })
    } catch (error: any) {
      return response.status(404).json({ success: false, message: 'Template not found', error: error.message })
    }
  }

  /**
   * Update certificate template
   */
  async update({ params, request, response }: HttpContext) {
    try {
      const template = await CertificateTemplate.findOrFail(params.id)
      const body = { ...request.all(), ...request.body() }

      if (body.name !== undefined) template.name = body.name
      if (body.code !== undefined) template.code = body.code
      if (body.type !== undefined) template.type = body.type
      if (body.target_type !== undefined) template.targetType = body.target_type
      if (body.targetType !== undefined) template.targetType = body.targetType
      if (body.description !== undefined) template.description = body.description
      if (body.content !== undefined) template.content = body.content
      if (body.school_id !== undefined) template.schoolId = body.school_id
      if (body.schoolId !== undefined) template.schoolId = body.schoolId
      if (body.is_active !== undefined) template.isActive = body.is_active
      if (body.isActive !== undefined) template.isActive = body.isActive

      await template.save()

      return response.status(200).json({
        success: true,
        message: 'Certificate template updated successfully',
        data: template,
      })
    } catch (error: any) {
      console.error('Error updating template:', error)
      return response.status(500).json({
        success: false,
        message: 'Failed to update template: ' + error.message,
        error: error.message,
      })
    }
  }

  /**
   * Delete certificate template
   */
  async destroy({ params, response }: HttpContext) {
    try {
      const template = await CertificateTemplate.findOrFail(params.id)
      template.isActive = false // Soft delete
      await template.save()

      return response.status(200).json({ success: true, message: 'Template deleted successfully' })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to delete template', error: error.message })
    }
  }

  /**
   * Generate student certificate
   */
  async generate({ params, request, response }: HttpContext) {
    try {
      const { student_id } = params
      const purpose = request.input('purpose') || ''
      const examPassed = request.input('exam_passed') || ''

      const { default: Students } = await import('#models/Students')
      const { default: Schools } = await import('#models/Schools')
      const { default: StudentEnrollments } = await import('#models/StudentEnrollments')

      const student = await Students.findOrFail(student_id)
      const school = await Schools.findOrFail(student.school_id)

      const latestEnrollment = await StudentEnrollments.query()
        .where('student_id', student.id)
        .preload('division', (dQuery) => {
          dQuery.preload('class')
        })
        .orderBy('created_at', 'desc')
        .first()

      let academicSessionName = ''
      if (latestEnrollment && latestEnrollment.academic_year) {
        academicSessionName = String(latestEnrollment.academic_year)
      }

      const programme = latestEnrollment?.division?.class?.class || ''
      const dob = student.birth_date ? new Date(student.birth_date).toLocaleDateString('en-IN') : ''
      const currentDate = new Date().toLocaleDateString('en-IN')
      const studentName = `${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`.replace(/\s+/g, ' ').trim()
      const grNo = student.gr_no ? student.gr_no.toString() : ''
      const certNumber = `CERT-${student.id}-${new Date().getFullYear()}`
      const collegeLogo = school.school_logo || ''

      const content = `
<div style="font-family: Arial, sans-serif; font-size: 15px; max-width: 800px; margin: auto; padding: 30px 20px; line-height: 1.6;">
  <table style="width: 100%; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
    <tr>
      <td style="width: 110px; text-align: center; vertical-align: middle;">
        <img src="${collegeLogo}" alt="Logo" style="width: 100px; height: 100px; object-fit: contain;" onerror="this.style.display='none'" />
      </td>
      <td style="text-align: center; vertical-align: middle; padding-left: 15px;">
        <h2 style="margin: 0 0 5px 0; font-size: 22px; color: #000; font-weight: bold;">C. N. Kothari Homoeopathic Medical College & Research Center, Vyara</h2>
        <p style="margin: 0 0 5px 0; font-size: 14px;">Vilasini K. Desai Arogya Sankul, Near Vanchetna Kakrapar bypass Tadkuva, Dist-Tapi Vyara Gujarat 394650</p>
        <p style="margin: 0; font-size: 14px;">URL: www.cnkotharihomeocollege.org | E-mail: cnkotharicollege@gmail.com | Mobile: 7861849892</p>
      </td>
    </tr>
  </table>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
    <tr>
      <td colspan="3" style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold; font-size: 18px; background-color: #f9f9f9;">Bonafide Certificate</td>
    </tr>
    <tr>
      <td style="border: 1px solid #333; padding: 10px; width: 40%;">Student's Name : <strong>${studentName}</strong></td>
      <td style="border: 1px solid #333; padding: 10px; width: 25%;">SID : <strong>${grNo}</strong></td>
      <td style="border: 1px solid #333; padding: 10px; width: 35%;">Year/Semester : <strong>${programme}</strong></td>
    </tr>
    <tr>
      <td style="border: 1px solid #333; padding: 10px;">Programme : <strong>BHMS</strong></td>
      <td style="border: 1px solid #333; padding: 10px;">Academic Year : <strong>${academicSessionName}</strong></td>
      <td style="border: 1px solid #333; padding: 10px;">Date : <strong>${currentDate}</strong></td>
    </tr>
  </table>

  <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 25px; font-size: 15px;">
    <span>Certificate No : ${certNumber}</span>
    <span>Date : ${currentDate}</span>
  </div>

  <div style="text-align: justify;">
    <p style="margin-bottom: 15px;">
      This is to certify that Mr./Ms. <strong>${studentName}</strong> is a bonafide student of this College studying in <strong>${programme} ${academicSessionName}</strong> class.
    </p>

    <p style="margin-bottom: 15px;">
      According to college record his/her Date of Birth is <strong>${dob}</strong>.
    </p>

    <p style="margin-bottom: 15px;">
      To the best of my knowledge and belief he/she has appeared in/passed the examination <strong>${examPassed}</strong>.
    </p>

    <p style="margin-bottom: 15px;">
      He/she bears a good moral character.
    </p>

    <p style="margin-bottom: 40px;">
      Remarks : <strong>${purpose}</strong>
    </p>
  </div>

  <table style="width: 100%; margin-top: 80px; border: none;">
    <tr>
      <td style="width: 50%; vertical-align: bottom;">
        <p style="margin: 0; font-weight: bold;">Prepared by : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Checked by :</p>
      </td>
      <td style="width: 50%; text-align: center; vertical-align: bottom;">
        <p style="margin: 0; font-weight: bold; font-size: 16px;">Principal</p>
        <p style="margin: 5px 0 0 0;">C. N. K. H. M. C. &amp; Research Center, Vyara</p>
      </td>
    </tr>
  </table>
</div>
`

      return response.status(200).json({ success: true, data: { content, certificate_number: certNumber } })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to generate certificate', error: error.message })
    }
  }
}