import Base from '#models/base'
import { column, hasOne, manyToMany } from '@adonisjs/lucid/orm'
import Schools from '#models/Schools'
import * as relations from '@adonisjs/lucid/types/relations'
import Students from './Students.js'

export default class AcademicSession extends Base {
  static table = 'academic_sessions'

  @column()
  declare school_id: number

  @column()
  declare session_name: string 

  @column()
  declare start_month: string

  @column()
  declare end_month: string

  @column()
  declare start_year: string

  @column()
  declare end_year: string

  @column()
  declare is_active: boolean

  @hasOne(() => Schools, {
    localKey: 'school_id',
    foreignKey: 'id',
  })
  declare school: relations.HasOne<typeof Schools>

  @manyToMany(() => Students, {
    pivotTable: 'student_enrollments',
    pivotForeignKey: 'academic_session_id',
    pivotRelatedForeignKey: 'student_id',
  })
  declare students: relations.ManyToMany<typeof Students>
}