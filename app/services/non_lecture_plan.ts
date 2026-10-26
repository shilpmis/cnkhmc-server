import ExcelJS from 'exceljs'
import NonLectureTemplateTopic from '#models/non_lecture_template_topic'
import NonLecturePlanRow from '#models/non_lecture_plan_row'
import NonLectureLog from '#models/non_lecture_log'

/**
 * Non-lecture lesson plan: the sheet layout, reading it, writing it, and keeping progress.
 *
 * Sheet layout (one block per topic):
 *   <Subject> (<Class> <Year>) Non-Lecture Lesson Plan Number :- <n>  Date:- <date>  Teacher Name : <name>
 *   Topic : <topic>
 *   Sl. No. | Competency | Miller's Level | Content | SLO / Outcome | Bloom's Domain / Guilbert's Level |
 *   Priority | T-L Methods / Media | Formative Assessment | Integration
 *   <rows...>
 */

export interface PlanHead {
  key: keyof PlanRowInput
  label: string
  width: number
}

/** The heads, in sheet order. */
export const PLAN_HEADS: PlanHead[] = [
  { key: 'slNo', label: 'Sl. No.', width: 8 },
  { key: 'competency', label: 'Competency', width: 24 },
  { key: 'miller', label: "Miller's Level", width: 14 },
  { key: 'content', label: 'Content', width: 34 },
  { key: 'outcome', label: 'SLO / Outcome', width: 30 },
  { key: 'bloom', label: "Bloom's Domain / Guilbert's Level", width: 22 },
  { key: 'priority', label: 'Priority', width: 12 },
  { key: 'tlMm', label: 'T-L Methods / Media', width: 22 },
  { key: 'assessment', label: 'Formative Assessment', width: 22 },
  { key: 'integration', label: 'Integration', width: 20 },
]

export interface PlanRowInput {
  slNo: string | null
  competency: string | null
  miller: string | null
  content: string | null
  outcome: string | null
  bloom: string | null
  priority: string | null
  tlMm: string | null
  assessment: string | null
  integration: string | null
  lessonPlanNumber: string | null
  requiredHours: number
}

export interface ParsedTopic {
  title: string
  rows: PlanRowInput[]
}

export interface ParsedPlan {
  topics: ParsedTopic[]
  warnings: string[]
}

const clean = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

export function cellText(cell: ExcelJS.Cell): string {
  const v: any = cell.value
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    if (Array.isArray(v.richText)) return v.richText.map((r: any) => r.text).join('').trim()
    if (v.text !== undefined) return String(v.text).trim()
    if (v.result !== undefined) return String(v.result).trim()
    return ''
  }
  return String(v).trim()
}

/** Which plan field a column heading belongs to, or null. */
export function headKeyFor(heading: string): keyof PlanRowInput | 'hours' | null {
  const c = clean(heading)
  if (!c) return null
  if (['slno', 'sino', 'srno', 'sno', 'code'].includes(c)) return 'slNo'
  if (c.includes('competency')) return 'competency'
  if (c.includes('miller')) return 'miller'
  if (c.includes('content')) return 'content'
  if (c.includes('slo') || c.includes('outcome') || c.includes('learningobjective')) return 'outcome'
  if (c.includes('bloom') || c.includes('guilbert')) return 'bloom'
  if (c.includes('priority')) return 'priority'
  if (c.includes('tl') || c.includes('method') || c.includes('media')) return 'tlMm'
  if (c.includes('assessment') || c.includes('formative')) return 'assessment'
  if (c.includes('integration')) return 'integration'
  if (c === 'hours' || c === 'hrs' || c.includes('requiredhour')) return 'hours'
  return null
}

const emptyRow = (): PlanRowInput => ({
  slNo: null,
  competency: null,
  miller: null,
  content: null,
  outcome: null,
  bloom: null,
  priority: null,
  tlMm: null,
  assessment: null,
  integration: null,
  lessonPlanNumber: null,
  requiredHours: 1,
})

/** Lesson plan number from a title line such as "... Non-Lecture Lesson Plan Number :- 3 Date:- ..." */
export function lessonPlanNumberFrom(text: string): string | null {
  const m = /lesson\s*plan\s*(?:number|no\.?)\s*:?\s*-?\s*(.*)$/i.exec(text.replace(/\s+/g, ' '))
  if (!m) return null
  const value = m[1].split(/date\s*:|teacher\s*name/i)[0].replace(/^[:\-\s]+|[:\-\s]+$/g, '').trim()
  return value || null
}

/**
 * Read a worksheet in the sheet layout. Understands several topic blocks in one sheet, a heading row
 * anywhere in the sheet, merged cells, and a lesson plan number in the title line.
 */
export function parsePlanWorksheet(ws: ExcelJS.Worksheet): ParsedPlan {
  const warnings: string[] = []
  const topics: ParsedTopic[] = []
  let current: ParsedTopic | null = null
  let columnMap: Record<number, keyof PlanRowInput | 'hours'> | null = null
  let lessonPlanNumber: string | null = null

  const maxCol = Math.max(ws.columnCount, 12)

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const texts: string[] = []
    for (let c = 1; c <= maxCol; c++) texts.push(cellText(row.getCell(c)))
    const nonEmpty = texts.filter((t) => t !== '')
    if (nonEmpty.length === 0) continue

    const first = nonEmpty[0]

    // Title line: carries the lesson plan number, and closes the block above it
    if (/lesson\s*plan\s*(number|no)/i.test(first)) {
      lessonPlanNumber = lessonPlanNumberFrom(first)
      columnMap = null
      continue
    }

    // "Topic : ..." line starts a new topic
    const topicMatch = /^topic\s*:?\s*-?\s*(.*)$/i.exec(first)
    if (topicMatch && !texts.some((t) => /competency/i.test(t))) {
      current = { title: topicMatch[1].trim() || `Topic ${topics.length + 1}`, rows: [] }
      topics.push(current)
      columnMap = null
      continue
    }

    // Heading row: needs at least Competency or Content plus one more known head
    const heads = texts.map((t) => headKeyFor(t))
    const known = heads.filter(Boolean)
    if (!columnMap && known.length >= 3 && (heads.includes('competency') || heads.includes('content'))) {
      columnMap = {}
      heads.forEach((h, i) => {
        if (h && !Object.values(columnMap!).includes(h)) columnMap![i + 1] = h
      })
      if (!current) {
        current = { title: `Topic ${topics.length + 1}`, rows: [] }
        topics.push(current)
      }
      continue
    }

    // Data row
    if (columnMap && current) {
      const item = emptyRow()
      item.lessonPlanNumber = lessonPlanNumber
      let any = false
      for (const [colStr, key] of Object.entries(columnMap)) {
        const text = texts[Number(colStr) - 1] ?? ''
        if (!text) continue
        if (key === 'hours') {
          const hours = Number(text)
          if (Number.isFinite(hours) && hours > 0) item.requiredHours = hours
          continue
        }
        ;(item as any)[key] = text
        any = true
      }
      if (any) current.rows.push(item)
    }
  }

  if (topics.length === 0) warnings.push('No topic or heading row was found. Use the downloaded template.')
  for (const t of topics) if (t.rows.length === 0) warnings.push(`Topic "${t.title}" has no rows.`)
  return { topics, warnings }
}

export interface PlanBlock {
  title: string
  rows: Array<Partial<Record<keyof PlanRowInput, any>>>
}

export interface PlanDocumentInput {
  /** e.g. "Organon of Medicine (4th BHMS 2026-27)" */
  heading: string
  lessonPlanNumber?: string | null
  date?: string | null
  teacherName?: string | null
  topics: PlanBlock[]
}

const titleLine = (input: PlanDocumentInput) =>
  `${input.heading} Non-Lecture Lesson Plan Number :- ${input.lessonPlanNumber ?? ''}   Date:- ${input.date ?? ''}   Teacher Name : ${input.teacherName ?? ''}`.replace(/\s+/g, ' ')

/** Excel in the sheet layout (a blank one when topics have no rows). */
export async function buildPlanWorkbook(input: PlanDocumentInput): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Non-Lecture Lesson Plan', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  PLAN_HEADS.forEach((h, i) => (ws.getColumn(i + 1).width = h.width))

  const border: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  }
  let r = 1
  const topics = input.topics.length ? input.topics : [{ title: '', rows: [] }]

  for (const topic of topics) {
    ws.mergeCells(r, 1, r, PLAN_HEADS.length)
    const t = ws.getCell(r, 1)
    t.value = titleLine(input)
    t.font = { bold: true, size: 12 }
    t.alignment = { vertical: 'middle', wrapText: true }
    t.border = border
    ws.getRow(r).height = 34
    r++

    ws.mergeCells(r, 1, r, PLAN_HEADS.length)
    const tp = ws.getCell(r, 1)
    tp.value = `Topic : ${topic.title}`
    tp.font = { bold: true }
    tp.border = border
    r++

    PLAN_HEADS.forEach((h, i) => {
      const c = ws.getCell(r, i + 1)
      c.value = h.label
      c.font = { bold: true }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      c.border = border
    })
    ws.getRow(r).height = 32
    r++

    const rows = topic.rows.length ? topic.rows : [{}, {}, {}, {}]
    rows.forEach((row, idx) => {
      PLAN_HEADS.forEach((h, i) => {
        const c = ws.getCell(r, i + 1)
        const value = (row as any)[h.key] ?? (h.key === 'slNo' && topic.rows.length ? String(idx + 1) : '')
        c.value = value === null ? '' : value
        c.alignment = { vertical: 'top', wrapText: true }
        c.border = border
      })
      r++
    })
    r++ // blank line between topics
  }
  return wb
}

/** pdfmake document for the same layout. */
export function buildPlanPdfDefinition(input: PlanDocumentInput, logo?: string | null): any {
  const content: any[] = []
  const topics = input.topics.length ? input.topics : [{ title: '', rows: [] }]

  topics.forEach((topic, index) => {
    const body: any[][] = [
      PLAN_HEADS.map((h) => ({ text: h.label, bold: true, fillColor: '#e5e7eb', alignment: 'center', fontSize: 8 })),
    ]
    const rows = topic.rows.length ? topic.rows : [{}, {}, {}, {}]
    rows.forEach((row, idx) => {
      body.push(
        PLAN_HEADS.map((h) => ({
          text: String((row as any)[h.key] ?? (h.key === 'slNo' && topic.rows.length ? idx + 1 : '') ?? ''),
          fontSize: 8,
        }))
      )
    })

    if (index > 0) content.push({ text: '', pageBreak: 'before' })
    if (logo && index === 0) content.push({ image: logo, width: 46, alignment: 'left', margin: [0, 0, 0, 4] })
    content.push({ text: titleLine(input), bold: true, fontSize: 10, margin: [0, 0, 0, 4] })
    content.push({ text: `Topic : ${topic.title}`, bold: true, fontSize: 9, margin: [0, 0, 0, 4] })
    content.push({
      table: {
        headerRows: 1,
        widths: PLAN_HEADS.map((h) => h.width * 2.4),
        body,
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
    })
  })

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [24, 24, 24, 24],
    defaultStyle: { font: 'Roboto', fontSize: 8 },
    content,
  }
}

// ─────────────────────────── progress ───────────────────────────

/**
 * Recalculate what has been covered, from the diary logs. Derived data, so a deleted or edited log
 * automatically reverses its effect.
 *  - a plan row is covered when at least one log lists it
 *  - a topic's logged hours is the sum of its logs; it is complete when all its rows are covered
 *    (or, for a topic without rows, when its hours are reached)
 */
export async function recalculateProgress(templateId: number): Promise<void> {
  const topics = await NonLectureTemplateTopic.query().where('template_id', templateId)
  if (topics.length === 0) return
  const logs = await NonLectureLog.query().where('template_id', templateId).orderBy('date', 'asc').orderBy('id', 'asc')

  for (const topic of topics) {
    const topicLogs = logs.filter((l) => l.topicId === topic.id)
    const rows = await NonLecturePlanRow.query().where('topic_id', topic.id)
    const rowIdsOfTopic = new Set(rows.map((x) => x.id))

    // the latest log that covered each row supplies its conclusion and reference book
    const coveredBy = new Map<number, NonLectureLog>()
    for (const log of logs) {
      for (const id of log.rowIds || []) {
        if (rowIdsOfTopic.has(Number(id))) coveredBy.set(Number(id), log)
      }
    }

    for (const row of rows) {
      const log = coveredBy.get(row.id)
      const covered = !!log
      const wanted = {
        isCompleted: covered,
        completedHours: covered ? Number(row.requiredHours) : 0,
        conclusion: log?.conclusion ?? null,
        referenceBook: log?.referenceBook ?? null,
      }
      if (
        row.isCompleted !== wanted.isCompleted ||
        Number(row.completedHours) !== wanted.completedHours ||
        (row.conclusion ?? null) !== wanted.conclusion ||
        (row.referenceBook ?? null) !== wanted.referenceBook
      ) {
        row.merge(wanted)
        await row.save()
      }
    }

    const logged = Math.round(topicLogs.reduce((sum, l) => sum + Number(l.hoursSpent || 0), 0) * 100) / 100
    const complete = rows.length > 0 ? rows.every((x) => coveredBy.has(x.id)) : logged >= Number(topic.hours) - 0.01
    if (Number(topic.completedHours) !== logged || topic.isCompleted !== complete) {
      topic.merge({ completedHours: logged, isCompleted: complete })
      await topic.save()
    }
  }
}
