import Base from '#models/base'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import * as relations from '@adonisjs/lucid/types/relations'
import ChatRoom from '#models/ChatRoom'
import User from '#models/User'
import { DateTime } from 'luxon'

export default class ChatRoomMember extends Base {
  public static table = 'chat_room_members'

  @column()
  declare chat_room_id: number

  @column()
  declare user_id: number

  @column()
  declare role: 'ADMIN' | 'MEMBER'

  @column.dateTime()
  declare last_read_at: DateTime | null

  @belongsTo(() => ChatRoom, {
    foreignKey: 'chat_room_id',
  })
  declare room: relations.BelongsTo<typeof ChatRoom>

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: relations.BelongsTo<typeof User>
}
