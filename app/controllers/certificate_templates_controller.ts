import type { HttpContext } from '@adonisjs/core/http'
import CertificateTemplate from '#models/certificate_template'

export default class CertificateTemplatesController {
  async index({ request, response }: HttpContext) {
    try {
      const schoolId = request.input('school_id')
      let query = CertificateTemplate.query().where('is_active', true)
      
      if (schoolId) {
        query = query.where('school_id', schoolId)
      }
      
      const templates = await query.orderBy('created_at', 'desc')
      return response.status(200).json({ success: true, data: templates })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to fetch templates', error: error.message })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const data = request.only(['name', 'type', 'content', 'schoolId', 'isActive'])
      const template = await CertificateTemplate.create(data)
      return response.status(201).json({ success: true, message: 'Template created successfully', data: template })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to create template', error: error.message })
    }
  }

  async show({ params, response }: HttpContext) {
    try {
      const template = await CertificateTemplate.findOrFail(params.id)
      return response.status(200).json({ success: true, data: template })
    } catch (error) {
      return response.status(404).json({ success: false, message: 'Template not found', error: error.message })
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const template = await CertificateTemplate.findOrFail(params.id)
      const data = request.only(['name', 'type', 'content', 'schoolId', 'isActive'])
      
      template.merge(data)
      await template.save()
      
      return response.status(200).json({ success: true, message: 'Template updated successfully', data: template })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to update template', error: error.message })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const template = await CertificateTemplate.findOrFail(params.id)
      template.isActive = false // Soft delete
      await template.save()
      
      return response.status(200).json({ success: true, message: 'Template deleted successfully' })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to delete template', error: error.message })
    }
  }

  async generate({ params, request, response }: HttpContext) {
    try {
      const { student_id } = params
      const purpose = request.input('purpose') || ''
      const examPassed = request.input('exam_passed') || ''
      
      // Import the models here to avoid circular dependency issues at the top level if any
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
  <!-- Header -->
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

  <!-- Table Details -->
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

  <!-- Cert Info -->
  <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 25px; font-size: 15px;">
    <span>Certificate No : ${certNumber}</span>
    <span>Date : ${currentDate}</span>
  </div>

  <!-- Body -->
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

  <!-- Signatures -->
  <table style="width: 100%; margin-top: 80px; border: none;">
    <tr>
      <td style="width: 50%; vertical-align: bottom;">
        <p style="margin: 0; font-weight: bold;">Prepared by : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Checked by :</p>
      </td>
      <td style="width: 50%; text-align: center; vertical-align: bottom;">
        <p style="margin: 0; font-weight: bold; font-size: 16px;">Principal</p>
        <p style="margin: 5px 0 0 0;">C. N. Kothari Homoeopathic Medical College &</p>
        <p style="margin: 2px 0 0 0;">Research Center, Vyara</p>
      </td>
    </tr>
  </table>
</div>
`

      return response.status(200).json({ success: true, data: { content, certificate_number: certNumber } })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to generate certificate', error: error.message })
    }
  }
}