import type { HttpContext } from '@adonisjs/core/http'
import ExamMaster from '#models/exam_master'

export default class ExamMastersController {
  async index({ request, response }: HttpContext) {
    try {
      const schoolId = request.input('school_id')
      let query = ExamMaster.query()

      if (schoolId) {
        query = query.where('school_id', schoolId)
      }

      const exams = await query.orderBy('created_at', 'desc')
      return response.status(200).json({ success: true, data: exams })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to fetch exam masters', error: error.message })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const data = request.only(['name', 'description', 'school_id', 'is_active'])
      const examMaster = await ExamMaster.create(data)
      return response.status(201).json({ success: true, message: 'Exam type created successfully', data: examMaster })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to create exam master', error: error.message })
    }
  }

  async show({ params, response }: HttpContext) {
    try {
      const examMaster = await ExamMaster.findOrFail(params.id)
      return response.status(200).json({ success: true, data: examMaster })
    } catch (error) {
      return response.status(404).json({ success: false, message: 'Exam master not found', error: error.message })
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const examMaster = await ExamMaster.findOrFail(params.id)
      const data = request.only(['name', 'description', 'school_id', 'is_active'])
      
      examMaster.merge(data)
      await examMaster.save()
      
      return response.status(200).json({ success: true, message: 'Exam type updated successfully', data: examMaster })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to update exam master', error: error.message })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const examMaster = await ExamMaster.findOrFail(params.id)
      await examMaster.delete()
      
      return response.status(200).json({ success: true, message: 'Exam type deleted successfully' })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to delete exam master', error: error.message })
    }
  }
}