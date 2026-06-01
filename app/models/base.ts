import { DateTime } from 'luxon'
import { BaseModel, column, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'

export default class Base extends BaseModel {

  public static namingStrategy = new SnakeCaseNamingStrategy()

  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true , serializeAs : null })
  declare updatedAt: DateTime
  
  
  //@ts-ignore
  public static defaultMeta(obj = {}) {
    const defaultData = { total: 1, per_page: 0, current_page: 1, last_page: 1, first_page: 1 }
    return { ...defaultData, ...obj }
  }
  
  //@ts-ignore
  public static defaultPaginate(data) {
    return { data, meta: { per_page: data.length, total: data.length, current_page: 1, last_page: 1, first_page: 1 } }
  }
  
  //@ts-ignore  
  //yyyy-MM-dd
  public static parseDateAsSQLDate(d): string {
    return d?.constructor?.name === 'DateTime' ? d.toISODate() : d
  }
  
  //@ts-ignore  
  //yyyy-MM-dd
  public static serializeDateAsSQLDateString(d): string {
    if (d?.constructor?.name === 'DateTime') {
      return d.toISODate()
    } else if (d?.constructor?.name === 'Date') {
      return d.toISOString().split('T')[0]
    }
    return d
  }

}