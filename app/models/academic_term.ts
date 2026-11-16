import Base from '#models/base'
import { column } from '@adonisjs/lucid/orm'

/** A term of an academic session for one class (year level). Dates are YYYY-MM-DD. */
export default class AcademicTerm extends Base {
  static table = 'academic_terms'

  @column()
  declare academic_year: number

  @column()
  declare class_id: number

  @column()
  declare term_number: number

  @column()
  declare name: string

  @column({ serialize: (v) => Base.serializeDateAsSQLDateString(v) })
  declare start_date: string

  @column({ serialize: (v) => Base.serializeDateAsSQLDateString(v) })
  declare end_date: string
}
