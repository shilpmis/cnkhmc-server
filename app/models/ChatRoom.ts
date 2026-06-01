import Base from '#models/base'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import * as relations from '@adonisjs/lucid/types/relations'
import Organization from '#models/Organization'
import User from '#models/User'
import ChatRoomMember from '#models/ChatRoomMember'
import ChatMessage from '#models/ChatMessage'

export default class ChatRoom extends Base {
  public static table = 'chat_rooms'

  @column()
  declare organization_id: number

  @column()
  declare name: string | null

  @column()
  declare type: 'DIRECT' | 'GROUP'

  @column()
  declare created_by: number

  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: relations.BelongsTo<typeof Organization>

  @belongsTo(() => User, {
    foreignKey: 'created_by',
  })
  declare creator: relations.BelongsTo<typeof User>

  @hasMany(() => ChatRoomMember, {
    foreignKey: 'chat_room_id',
  })
  declare members: relations.HasMany<typeof ChatRoomMember>

  @hasMany(() => ChatMessage, {
    foreignKey: 'chat_room_id',
  })
  declare messages: relations.HasMany<typeof ChatMessage>
}
