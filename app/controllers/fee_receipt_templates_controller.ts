import type { HttpContext } from '@adonisjs/core/http'
import FeeReceiptTemplate from '#models/fee_receipt_template'

export default class FeeReceiptTemplatesController {
  /**
   * List all fee receipt templates for a school
   */
  async index({ request, response, auth }: HttpContext) {
    try {
      const schoolId = request.input('school_id') || auth?.user?.school_id
      const includeInactive = request.input('include_inactive', false)

      let query = FeeReceiptTemplate.query()

      if (!includeInactive) {
        query = query.where('is_active', true)
      }

      if (schoolId) {
        query = query.where((q) => {
          q.where('school_id', schoolId).orWhereNull('school_id')
        })
      }

      let templates = await query.orderBy('created_at', 'desc')

      const hasOfficial = templates.some(
        (t) => t.code === 'CNKHMC_OFFICIAL' || t.name.includes('C. N. Kothari')
      )

      if (!hasOfficial) {
        try {
          const official = await FeeReceiptTemplate.create({
            name: 'C. N. Kothari Official Receipt (Dual Copy Form)',
            code: 'CNKHMC_OFFICIAL',
            content: 'CNKHMC_OFFICIAL_DUAL_PAGE',
            description: 'Official college dual-copy format matching cnkothari.emli.in with cutting line',
            schoolId: schoolId || null,
            isActive: true,
          })
          templates = [official, ...templates]
        } catch {
          // In case table or unique code constraint
        }
      }

      return response.status(200).json({ success: true, data: templates })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to fetch fee receipt templates', error: error.message })
    }
  }

  /**
   * Create a new fee receipt template
   */
  async store({ request, response, auth }: HttpContext) {
    try {
      const body = { ...request.all(), ...request.body() }
      const { name, code, content, description, school_id, schoolId, is_active = true, isActive } = body

      if (!name || !content) {
        return response.badRequest({ success: false, message: 'Template name and content are required' })
      }

      const finalSchoolId = school_id || schoolId || auth?.user?.school_id || null
      const finalCode = code || name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')
      const finalIsActive = isActive !== undefined ? isActive : is_active

      const template = await FeeReceiptTemplate.create({
        name,
        code: finalCode,
        content,
        description: description || null,
        schoolId: finalSchoolId,
        isActive: finalIsActive,
      })

      return response.status(201).json({
        success: true,
        message: 'Fee receipt template created successfully',
        data: template,
      })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to create template: ' + error.message })
    }
  }

  /**
   * Get single fee receipt template by ID
   */
  async show({ params, response }: HttpContext) {
    try {
      const template = await FeeReceiptTemplate.findOrFail(params.id)
      return response.status(200).json({ success: true, data: template })
    } catch (error: any) {
      return response.status(404).json({ success: false, message: 'Template not found', error: error.message })
    }
  }

  /**
   * Update a fee receipt template
   */
  async update({ params, request, response }: HttpContext) {
    try {
      const template = await FeeReceiptTemplate.findOrFail(params.id)
      const body = { ...request.all(), ...request.body() }

      if (body.name !== undefined) template.name = body.name
      if (body.code !== undefined) template.code = body.code
      if (body.content !== undefined) template.content = body.content
      if (body.description !== undefined) template.description = body.description
      if (body.school_id !== undefined) template.schoolId = body.school_id
      if (body.schoolId !== undefined) template.schoolId = body.schoolId
      if (body.is_active !== undefined) template.isActive = body.is_active
      if (body.isActive !== undefined) template.isActive = body.isActive

      await template.save()

      return response.status(200).json({
        success: true,
        message: 'Fee receipt template updated successfully',
        data: template,
      })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to update template: ' + error.message })
    }
  }

  /**
   * Soft-delete a fee receipt template
   */
  async destroy({ params, response }: HttpContext) {
    try {
      const template = await FeeReceiptTemplate.findOrFail(params.id)
      template.isActive = false
      await template.save()
      return response.status(200).json({ success: true, message: 'Template deleted successfully' })
    } catch (error: any) {
      return response.status(500).json({ success: false, message: 'Failed to delete template', error: error.message })
    }
  }
}
