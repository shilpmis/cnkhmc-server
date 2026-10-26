import env from '#start/env'
import KavachaCipher from '#services/kavacha_cipher'

/**
 * Dwarka: the one place that decides where a protected file lives in object storage.
 *
 *   {env}/s{school_id}/photos/{staff|students}/{owner_ref}/{file_uuid}.{ext}.enc
 *   {env}/s{school_id}/exports/daily-diaries/{academic_year}/{yyyy-mm}/{staff_ref}/{file_uuid}.{ext}.enc
 *   {env}/s{school_id}/exports/hostels/{academic_year}/{hostel_id}/{file_uuid}.{ext}.enc
 *   {env}/s{school_id}/exports/timetable/{academic_year}/{class_id}/{division_id}/{file_uuid}.{ext}.enc
 *   {env}/s{school_id}/exports/{folder}/{yyyy-mm}/{file_uuid}.{ext}.enc
 *
 * Paths never contain names, GR numbers or raw ids of people. Person references are opaque HMACs.
 */

export type DwarkaCategory =
  | 'staff-photo'
  | 'student-photo'
  | 'diary-export'
  | 'hostel-export'
  | 'timetable-export'
  | 'general-export'

export interface DwarkaInput {
  schoolId: number
  category: DwarkaCategory
  fileUuid: string
  ext: string
  ownerId?: number | string | null
  academicYear?: number | string | null
  month?: string | null
  hostelId?: number | string | null
  classId?: number | string | null
  divisionId?: number | string | null
  folder?: string | null
}

const SAFE = /[^a-z0-9_-]/g

class DwarkaPath {
  private seg(value: string | number | null | undefined, fallback: string): string {
    const cleaned = String(value ?? '')
      .toLowerCase()
      .replace(SAFE, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    return cleaned || fallback
  }

  private root(schoolId: number): string {
    const environment = env.get('NODE_ENV') === 'production' ? 'prod' : 'dev'
    return `${environment}/s${Math.trunc(Number(schoolId))}`
  }

  private file(fileUuid: string, ext: string): string {
    return `${this.seg(fileUuid, 'file')}.${this.seg(ext, 'bin')}.enc`
  }

  private currentMonth(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  /** Map the free-text folder that clients send to a fixed export folder. */
  exportFolder(folder: string | null | undefined): string {
    const f = this.seg(folder, 'general')
    if (f.startsWith('diar')) return 'daily-diaries'
    if (f.startsWith('hostel')) return 'hostels'
    if (f.startsWith('time')) return 'timetable'
    return f
  }

  build(input: DwarkaInput): string {
    const base = this.root(input.schoolId)
    const file = this.file(input.fileUuid, input.ext)

    switch (input.category) {
      case 'staff-photo':
      case 'student-photo': {
        const kind = input.category === 'staff-photo' ? 'staff' : 'students'
        const owner = input.ownerId ? KavachaCipher.opaqueRef(kind, input.ownerId) : 'unassigned'
        return `${base}/photos/${kind}/${owner}/${file}`
      }
      case 'diary-export': {
        const staff = input.ownerId ? KavachaCipher.opaqueRef('staff', input.ownerId) : 'unassigned'
        return `${base}/exports/daily-diaries/${this.seg(input.academicYear, 'ay')}/${this.seg(input.month || this.currentMonth(), 'month')}/${staff}/${file}`
      }
      case 'hostel-export':
        return `${base}/exports/hostels/${this.seg(input.academicYear, 'ay')}/${this.seg(input.hostelId, 'all')}/${file}`
      case 'timetable-export':
        return `${base}/exports/timetable/${this.seg(input.academicYear, 'ay')}/${this.seg(input.classId, 'class')}/${this.seg(input.divisionId, 'division')}/${file}`
      default:
        return `${base}/exports/${this.exportFolder(input.folder)}/${this.seg(input.month || this.currentMonth(), 'month')}/${file}`
    }
  }
}

export default new DwarkaPath()
