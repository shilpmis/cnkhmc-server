import type { HttpContext } from '@adonisjs/core/http'
import ExamSubject from '#models/exam_subject'

export default class ExamSubjectsController {
  async index({ request, response }: HttpContext) {
    try {
      const examScheduleId = request.input('exam_schedule_id')
      let query = ExamSubject.query().preload('subject')

      if (examScheduleId) {
        query = query.where('exam_schedule_id', examScheduleId)
      }

      const subjects = await query.orderBy('exam_date', 'asc')
      return response.status(200).json({ success: true, data: subjects })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to fetch exam subjects', error: error.message })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const data = request.only([
        'exam_schedule_id', 
        'subject_id', 
        'max_marks', 
        'passing_marks', 
        'exam_date', 
        'start_time', 
        'end_time'
      ])
      
      const examSubject = await ExamSubject.create({
        examScheduleId: data.exam_schedule_id,
        subjectId: data.subject_id,
        maxMarks: data.max_marks,
        passingMarks: data.passing_marks,
        examDate: data.exam_date,
        startTime: data.start_time,
        endTime: data.end_time
      })
      await examSubject.load('subject')
      
      return response.status(201).json({ success: true, message: 'Exam subject added successfully', data: examSubject })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to add exam subject', error: error.message })
    }
  }

  async show({ params, response }: HttpContext) {
    try {
      const examSubject = await ExamSubject.query().where('id', params.id).preload('subject').firstOrFail()
      return response.status(200).json({ success: true, data: examSubject })
    } catch (error) {
      return response.status(404).json({ success: false, message: 'Exam subject not found', error: error.message })
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const examSubject = await ExamSubject.findOrFail(params.id)
      const data = request.only([
        'exam_schedule_id', 
        'subject_id', 
        'max_marks', 
        'passing_marks', 
        'exam_date', 
        'start_time', 
        'end_time'
      ])
      
      examSubject.merge({
        examScheduleId: data.exam_schedule_id,
        subjectId: data.subject_id,
        maxMarks: data.max_marks,
        passingMarks: data.passing_marks,
        examDate: data.exam_date,
        startTime: data.start_time,
        endTime: data.end_time
      })
      await examSubject.save()
      
      await examSubject.load('subject')
      
      return response.status(200).json({ success: true, message: 'Exam subject updated successfully', data: examSubject })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to update exam subject', error: error.message })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const examSubject = await ExamSubject.findOrFail(params.id)
      await examSubject.delete()
      
      return response.status(200).json({ success: true, message: 'Exam subject removed successfully' })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to remove exam subject', error: error.message })
    }
  }
}