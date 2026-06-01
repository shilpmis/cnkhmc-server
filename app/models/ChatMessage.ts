import Base from '#models/base'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import * as relations from '@adonisjs/lucid/types/relations'
import ChatRoom from '#models/ChatRoom'
import User from '#models/User'

export default class ChatMessage extends Base {
  public static table = 'chat_messages'

  @column()
  declare chat_room_id: number

  @column()
  declare sender_id: number

  @column()
  declare content: string

  @column()
  declare type: 'TEXT' | 'IMAGE' | 'FILE'

  @belongsTo(() => ChatRoom, {
    foreignKey: 'chat_room_id',
  })
  declare room: relations.BelongsTo<typeof ChatRoom>

  @belongsTo(() => User, {
    foreignKey: 'sender_id',
  })
  declare sender: relations.BelongsTo<typeof User>
}
