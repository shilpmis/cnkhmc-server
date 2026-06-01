import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import LessonPlan from '#models/LessonPlan'
import LessonPlanTopic from '#models/LessonPlanTopic'
import LessonPlanSubtopic from '#models/LessonPlanSubtopic'
import DailyDiary from '#models/DailyDiary'
import Department from '#models/Department'
import db from '@adonisjs/lucid/services/db'
import path from 'node:path'
import fs from 'node:fs'
// @ts-ignore
import PdfPrinterPkg from 'pdfmake/js/printer.js'
const PdfPrinter = PdfPrinterPkg.default || PdfPrinterPkg

export default class BenchmarkExport extends BaseCommand {
  static commandName = 'benchmark:export'
  static description = 'Benchmark exportLP query performance'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const subjectId = 123
    const lpNumber = '1'
    const academicSessionId = 33
    const schoolId = 15

    this.logger.info('Starting Benchmark...')

    try {
      console.time('1. LessonPlan query')
      const lp = await LessonPlan.query()
        .where('subject_id', subjectId)
        .where('academic_session_id', academicSessionId)
        .where('school_id', schoolId)
        .preload('subject')
        .preload('school')
        .firstOrFail()
      console.timeEnd('1. LessonPlan query')
      this.logger.info(`LP ID: ${lp.id}`)

      console.time('2. Topics query')
      const topics = await LessonPlanTopic.query()
        .where('lesson_plan_id', lp.id)
      console.timeEnd('2. Topics query')
      this.logger.info(`Topics: ${topics.length}`)

      const topicIds = topics.map(t => t.id)

      console.time('3. Subtopics query')
      const subtopics = await LessonPlanSubtopic.query()
        .whereIn('topic_id', topicIds)
        .where('lesson_plan_number', lpNumber)
        .preload('topic')
      console.timeEnd('3. Subtopics query')
      this.logger.info(`Subtopics: ${subtopics.length}`)

      console.time('4. Dept, Session & Div queries')
      const subjectRow = await db.from('subjects').where('id', subjectId).first()
      const departmentId = subjectRow?.department_id || 0
      const department = await Department.query()
        .where('id', departmentId)
        .first()

      const session = await db.from('academic_sessions')
        .where('id', academicSessionId)
        .first()
      console.timeEnd('4. Dept, Session & Div queries')
      this.logger.info(`Dept: ${department?.name}, Session: ${session?.name}`)

      console.time('5. Daily Diaries JSON Query (original)')
      let dailyLogs: DailyDiary[] = []
      if (subtopics.length > 0) {
        const subtopicIds = subtopics.map((st) => st.id)
        dailyLogs = await DailyDiary.query()
          .where((q) => {
            for (const id of subtopicIds) {
              q.orWhereRaw('JSON_CONTAINS(subtopic_ids, ?)', [JSON.stringify(id)])
            }
          })
          .preload('staffEnrollment', (se) => {
            se.preload('staff')
          })
      }
      console.timeEnd('5. Daily Diaries JSON Query (original)')
      this.logger.info(`Daily diaries found: ${dailyLogs.length}`)

      console.time('6. Student count query')
      const divMaster = await db.from('subjects_division_masters')
        .where('subject_id', subjectId)
        .where('academic_session_id', academicSessionId)
        .first()

      let studentCount = 0
      if (divMaster) {
        const countRes = await db.from('student_enrollments')
          .where('division_id', divMaster.division_id)
          .where('academic_session_id', academicSessionId)
          .count('* as total')
        studentCount = Number((countRes[0] as any).total || 0)
      }
      console.timeEnd('6. Student count query')
      this.logger.info(`Student count: ${studentCount}`)

      // Let's profile the PDF generation
      console.time('7. PDF generation')

      const fonts = {
        Roboto: {
          normal: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Regular.ttf'),
          bold: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Medium.ttf'),
          italics: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Italic.ttf'),
          bolditalics: path.resolve(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto/Roboto-MediumItalic.ttf')
        }
      }

      const dates = [...new Set(dailyLogs.map(log => {
        if (!log.date) return ''
        return new Date(log.date).toLocaleDateString('en-GB')
      }))].filter(Boolean).join(', ')

      const teachersList = [...new Set(dailyLogs.map(log => {
        const staff = log.staffEnrollment?.staff
        return staff ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim() : ''
      }))].filter(Boolean).join(', ')

      const body: any[] = [
        [
          { text: 'Code', style: 'tableHeader' },
          { text: 'Subtopic Name', style: 'tableHeader' },
          { text: 'Detail', style: 'tableHeader' },
          { text: 'Hours', style: 'tableHeader' },
          { text: 'Status', style: 'tableHeader' }
        ]
      ]

      subtopics.forEach(st => {
        body.push([
          { text: st.code || 'N/A' },
          { text: st.name || 'No Name' },
          { text: st.detail || 'N/A' },
          { text: (st.requiredHours || 0).toString() },
          { text: st.isCompleted ? 'Completed' : 'Pending' }
        ])
      })

      const docDefinition: any = {
        content: [
          { text: `Lesson Plan Sheet - LP #${lpNumber}`, style: 'header' },
          {
            style: 'detailsTable',
            table: {
              widths: ['30%', '70%'],
              body: [
                [{ text: 'Subject', bold: true }, { text: lp.subject?.name || 'N/A' }],
                [{ text: 'Department', bold: true }, { text: department?.name || 'N/A' }],
                [{ text: 'Session', bold: true }, { text: session?.name || 'N/A' }],
                [{ text: 'Student Count', bold: true }, { text: studentCount.toString() }],
                [{ text: 'Teachers', bold: true }, { text: teachersList || 'None' }],
                [{ text: 'Dates Completed', bold: true }, { text: dates || 'None' }]
              ]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 20]
          },
          { text: 'Subtopics Included', style: 'subheader' },
          {
            table: {
              headerRows: 1,
              widths: ['8%', '35%', '33%', '9%', '15%'],
              body: body
            },
            layout: {
              hLineWidth: function (i: number, node: any) {
                return (i === 0 || i === node.table.body.length) ? 1.5 : 0.5;
              },
              vLineWidth: function () {
                return 0;
              },
              hLineColor: function () {
                return '#cbd5e1';
              },
              paddingLeft: function () { return 8; },
              paddingRight: function () { return 8; },
              paddingTop: function () { return 8; },
              paddingBottom: function () { return 8; }
            }
          }
        ],
        styles: {
          header: {
            fontSize: 22,
            bold: true,
            margin: [0, 0, 0, 15]
          },
          subheader: {
            fontSize: 14,
            bold: true,
            margin: [0, 20, 0, 10]
          },
          tableHeader: {
            bold: true,
            fontSize: 10,
            color: '#1e293b',
            fillColor: '#f1f5f9'
          }
        },
        defaultStyle: { font: 'Roboto', fontSize: 9 }
      }

      const printer = new PdfPrinter(fonts, fs as any, {
        resolve: () => { },
        resolved: () => Promise.resolve()
      })
      const pdfDoc = await (printer as any).createPdfKitDocument(docDefinition)
      console.timeEnd('7. PDF generation')
      
      console.time('8. Write PDF to file')
      const writeStream = fs.createWriteStream('scratch/test_local_lp_export.pdf')
      pdfDoc.pipe(writeStream)
      pdfDoc.end()
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve())
        writeStream.on('error', (err) => reject(err))
      })
      console.timeEnd('8. Write PDF to file')
      this.logger.info('✓ PDF written successfully')

    } catch (err) {
      this.logger.error(`Error during benchmark: ${err.message}`)
      console.error(err)
    }
  }
}
