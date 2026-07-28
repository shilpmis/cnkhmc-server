import type { HttpContext } from '@adonisjs/core/http'
import ExamSchedule from '#models/exam_schedule'
import AcademicCalendarSetting from '#models/AcademicCalendarSetting'

export default class ExamSchedulesController {
  private async syncExamToCalendar(schedule: ExamSchedule) {
    const setting = await AcademicCalendarSetting.findBy('academic_year', schedule.academic_year)
    if (!setting) return

    const examTitle = schedule.examMaster?.name || 'Exam'
    const className = schedule.academicClass?.class || 'Class'
    const eventTitle = `${examTitle} - ${className}`

    let dates = [...(setting.non_working_dates || [])]
    
    // Remove existing events for this exam
    dates = dates.filter(dateStr => {
      try {
        if (typeof dateStr === 'string' && dateStr.trim().startsWith('{')) {
          const obj = JSON.parse(dateStr)
          if (obj.category === 'exam' && obj.title === eventTitle) {
            return false
          }
        }
      } catch (e) {
        // Not a JSON string
      }
      return true
    })

    // Add new events for each date
    const start = typeof (schedule.start_date as any)?.toJSDate === 'function' ? schedule.start_date.toJSDate() : new Date(schedule.start_date as any)
    const end = typeof (schedule.end_date as any)?.toJSDate === 'function' ? schedule.end_date.toJSDate() : new Date(schedule.end_date as any)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Skip Sundays (0 is Sunday in JS Date)
      if (d.getDay() === 0) continue;

      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      
      dates.push(JSON.stringify({
        date: `${y}-${m}-${day}`,
        title: eventTitle,
        description: `Exam schedule for ${className}`,
        category: 'exam',
        isWorkingDay: true
      }))
    }

    setting.non_working_dates = dates
    await setting.save()
  }

  async index({ request, response }: HttpContext) {
    try {
      const classId = request.input('class_id')
      const academicYear = request.input('academic_year')
      
      let query = ExamSchedule.query()
        .preload('examMaster')
        
        .preload('academicClass')
        .preload('subjects', (subjectsQuery) => {
          subjectsQuery.preload('subject')
        })

      if (classId) {
        query = query.where('class_id', classId)
      }
      
      if (academicYear) {
        query = query.where('academic_year', academicYear)
      }

      const schedules = await query.orderBy('created_at', 'desc')
      return response.status(200).json({ success: true, data: schedules })
    } catch (error: any) {
      const fs = require('fs')
      fs.writeFileSync('error.log', error.stack || error.message)
      return response.status(500).json({ success: false, message: 'Failed to fetch exam schedules', error: error.message, stack: error.stack })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const data = request.only(['exam_master_id', 'academic_year', 'class_id', 'start_date', 'end_date', 'status'])
      const schedule = await ExamSchedule.create({
        exam_master_id: data.exam_master_id,
        academic_year: data.academic_year,
        class_id: data.class_id,
        start_date: data.start_date,
        end_date: data.end_date,
        status: data.status || 'PLANNED'
      })
      
      await schedule.load('examMaster')
      await schedule.load('academicClass')
      
      await this.syncExamToCalendar(schedule)

      return response.status(201).json({ success: true, message: 'Exam schedule created successfully', data: schedule })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to create exam schedule', error: error.message })
    }
  }

  async show({ params, response }: HttpContext) {
    try {
      const schedule = await ExamSchedule.query()
        .where('id', params.id)
        .preload('examMaster')
        
        .preload('academicClass')
        .preload('subjects', (subjectsQuery) => {
          subjectsQuery.preload('subject')
        })
        .firstOrFail()
        
      return response.status(200).json({ success: true, data: schedule })
    } catch (error) {
      return response.status(404).json({ success: false, message: 'Exam schedule not found', error: error.message })
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const schedule = await ExamSchedule.findOrFail(params.id)
      const data = request.only(['exam_master_id', 'academic_year', 'class_id', 'start_date', 'end_date', 'status'])
      
      schedule.merge({
        exam_master_id: data.exam_master_id,
        academic_year: data.academic_year,
        class_id: data.class_id,
        start_date: data.start_date,
        end_date: data.end_date,
        status: data.status
      })
      await schedule.save()
      
      await schedule.load('examMaster')
      await schedule.load('academicClass')
      
      await this.syncExamToCalendar(schedule)

      return response.status(200).json({ success: true, message: 'Exam schedule updated successfully', data: schedule })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to update exam schedule', error: error.message })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const schedule = await ExamSchedule.findOrFail(params.id)
      await schedule.delete()
      
      return response.status(200).json({ success: true, message: 'Exam schedule deleted successfully' })
    } catch (error) {
      return response.status(500).json({ success: false, message: 'Failed to delete exam schedule', error: error.message })
    }
  }
}