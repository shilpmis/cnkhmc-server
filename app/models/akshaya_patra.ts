import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

/** Record of one encrypted file held in object storage. See services/kavacha_cipher.ts. */
export default class AkshayaPatra extends BaseModel {
  static table = 'akshaya_patras'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare uuid: string

  @column()
  declare school_id: number

  @column()
  declare category: string

  @column()
  declare owner_type: string | null

  @column()
  declare owner_id: number | null

  @column({ serializeAs: null })
  declare object_key: string

  @column()
  declare original_name: string | null

  @column()
  declare content_type: string | null

  @column()
  declare size_bytes: number

  // Explicit column name: Lucid's naming strategy would turn "sha256" into "sha_256".
  @column({ columnName: 'plaintext_sha256', serializeAs: null })
  declare plaintext_sha256: string

  @column({ serializeAs: null })
  declare wrapped_key: string

  @column({ serializeAs: null })
  declare iv: string

  @column({ serializeAs: null })
  declare tag: string

  @column({ serializeAs: null })
  declare salt: string

  @column({ serializeAs: null })
  declare key_version: number

  @column()
  declare is_cloud: boolean

  @column()
  declare uploaded_by: number | null

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
