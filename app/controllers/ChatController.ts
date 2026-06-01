import type { HttpContext } from '@adonisjs/core/http'
import ChatRoom from '#models/ChatRoom'
import ChatRoomMember from '#models/ChatRoomMember'
import ChatMessage from '#models/ChatMessage'
import User from '#models/User'
import { CreateRoomValidator, CreateMessageValidator, AddMembersValidator } from '#validators/Chat'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class ChatController {
  private async resolveOrganizationId(user: User): Promise<number | null> {
    if (user.organization_id) {
      return user.organization_id
    }
    if (user.school_id) {
      const school = await db.from('schools').where('id', user.school_id).select('organization_id').first()
      if (school) {
        return school.organization_id
      }
    }
    return null
  }

  /**
   * Get all colleagues in the same organization
   */
  async indexColleagues({ auth, response }: HttpContext) {
    const orgId = await this.resolveOrganizationId(auth.user!)
    if (!orgId) {
      return response.badRequest({ message: 'User is not associated with an organization' })
    }

    const colleagues = await User.query()
      .where((builder) => {
        builder.where('organization_id', orgId)
          .orWhereHas('school', (sb) => sb.where('organization_id', orgId))
      })
      .whereNot('id', auth.user!.id)
      .preload('role')
      .orderBy('name', 'asc')

    return response.json(colleagues)
  }

  /**
   * List all chat rooms the user belongs to within the organization
   */
  async indexRooms({ auth, response }: HttpContext) {
    const orgId = await this.resolveOrganizationId(auth.user!)
    if (!orgId) {
      return response.badRequest({ message: 'User is not associated with an organization' })
    }

    const rooms = await ChatRoom.query()
      .where('organization_id', orgId)
      .whereHas('members', (builder) => {
        builder.where('user_id', auth.user!.id)
      })
      .preload('members', (builder) => {
        builder.preload('user', (u) => {
          u.select('id', 'name', 'email', 'username', 'role_id').preload('role')
        })
      })
      .preload('creator', (u) => u.select('id', 'name'))
      .preload('messages', (builder) => {
        builder.orderBy('created_at', 'desc').limit(1).preload('sender', (s) => s.select('id', 'name'))
      })
      .orderBy('updated_at', 'desc')

    // Compute unread counts per room for the current user
    const roomsJson = rooms.map((room) => {
      const roomData = room.toJSON()
      const currentMember = room.members.find((m) => m.user_id === auth.user!.id)
      const lastReadAt = currentMember?.last_read_at

      // Count messages created after last_read_at (or all if never read)
      let unreadCountPromise: Promise<number>
      if (lastReadAt) {
        unreadCountPromise = ChatMessage.query()
          .where('chat_room_id', room.id)
          .where('created_at', '>', lastReadAt.toISO()!)
          .whereNot('sender_id', auth.user!.id)
          .count('* as total')
          .then((result) => Number((result[0] as any).$extras.total || 0))
      } else {
        unreadCountPromise = ChatMessage.query()
          .where('chat_room_id', room.id)
          .whereNot('sender_id', auth.user!.id)
          .count('* as total')
          .then((result) => Number((result[0] as any).$extras.total || 0))
      }

      return { ...roomData, unreadCountPromise }
    })

    // Resolve all unread count promises in parallel
    const roomsWithUnread = await Promise.all(
      roomsJson.map(async (roomData) => {
        const unread_count = await roomData.unreadCountPromise
        const { unreadCountPromise, ...rest } = roomData
        return { ...rest, unread_count }
      })
    )

    return response.json(roomsWithUnread)
  }

  /**
   * Create a chat room (DIRECT or GROUP)
   */
  async createRoom({ auth, request, response }: HttpContext) {
    const orgId = await this.resolveOrganizationId(auth.user!)
    if (!orgId) {
      return response.badRequest({ message: 'User is not associated with an organization' })
    }

    const payload = await request.validateUsing(CreateRoomValidator)
    const { type, name, user_ids } = payload

    if (type === 'DIRECT') {
      const otherUserId = user_ids[0]
      if (otherUserId === auth.user!.id) {
        return response.badRequest({ message: 'Cannot start a direct message with yourself' })
      }

      // Check if other user exists and belongs to the same organization
      const otherUser = await User.query()
        .where('id', otherUserId)
        .where((builder) => {
          builder.where('organization_id', orgId)
            .orWhereHas('school', (sb) => sb.where('organization_id', orgId))
        })
        .first()
      if (!otherUser) {
        return response.badRequest({ message: 'User not found in your organization' })
      }

      // Check if DM room already exists between the two users
      const existingRoom = await ChatRoom.query()
        .where('organization_id', orgId)
        .where('type', 'DIRECT')
        .whereHas('members', (builder) => {
          builder.where('user_id', auth.user!.id)
        })
        .whereHas('members', (builder) => {
          builder.where('user_id', otherUserId)
        })
        .preload('members', (builder) => {
          builder.preload('user', (u) => u.select('id', 'name', 'email', 'username', 'role_id').preload('role'))
        })
        .preload('creator', (u) => u.select('id', 'name'))
        .first()

      if (existingRoom) {
        return response.json(existingRoom)
      }

      // Create new DM room
      const trx = await db.transaction()
      try {
        const room = await ChatRoom.create(
          {
            organization_id: orgId,
            type: 'DIRECT',
            created_by: auth.user!.id,
          },
          { client: trx }
        )

        await ChatRoomMember.createMany(
          [
            { chat_room_id: room.id, user_id: auth.user!.id, role: 'MEMBER' },
            { chat_room_id: room.id, user_id: otherUserId, role: 'MEMBER' },
          ],
          { client: trx }
        )

        await trx.commit()

        await room.load('members', (builder) => {
          builder.preload('user', (u) => u.select('id', 'name', 'email', 'username', 'role_id').preload('role'))
        })
        await room.load('creator', (u) => u.select('id', 'name'))

        return response.status(201).json(room)
      } catch (error) {
        await trx.rollback()
        return response.status(500).json({ message: 'Failed to create DM room', error: error.message })
      }
    } else {
      // GROUP room
      const user = auth.user!
      await user.load('role')
      const isAdmin = ['ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN', 'DEVELOPER'].includes(user.role.role)
      if (!isAdmin) {
        return response.forbidden({ message: 'Only organization administrators can create group chats' })
      }

      if (!name) {
        return response.badRequest({ message: 'Group name is required' })
      }

      const uniqueUserIds = [...new Set(user_ids)].filter((id) => id !== auth.user!.id)

      // Verify all users belong to the organization
      if (uniqueUserIds.length > 0) {
        const users = await User.query()
          .whereIn('id', uniqueUserIds)
          .where((builder) => {
            builder.where('organization_id', orgId)
              .orWhereHas('school', (sb) => sb.where('organization_id', orgId))
          })
        if (users.length !== uniqueUserIds.length) {
          return response.badRequest({
            message: 'One or more selected users are invalid or not in your organization',
          })
        }
      }

      const trx = await db.transaction()
      try {
        const room = await ChatRoom.create(
          {
            organization_id: orgId,
            type: 'GROUP',
            name,
            created_by: auth.user!.id,
          },
          { client: trx }
        )

        const membersData = [
          { chat_room_id: room.id, user_id: auth.user!.id, role: 'ADMIN' as const },
          ...uniqueUserIds.map((userId) => ({
            chat_room_id: room.id,
            user_id: userId,
            role: 'MEMBER' as const,
          })),
        ]

        await ChatRoomMember.createMany(membersData, { client: trx })

        await trx.commit()

        await room.load('members', (builder) => {
          builder.preload('user', (u) => u.select('id', 'name', 'email', 'username', 'role_id').preload('role'))
        })
        await room.load('creator', (u) => u.select('id', 'name'))

        return response.status(201).json(room)
      } catch (error) {
        await trx.rollback()
        return response.status(500).json({ message: 'Failed to create group room', error: error.message })
      }
    }
  }

  /**
   * Get paginated messages for a chat room
   */
  async indexMessages({ auth, params, request, response }: HttpContext) {
    const orgId = await this.resolveOrganizationId(auth.user!)
    if (!orgId) {
      return response.badRequest({ message: 'User is not associated with an organization' })
    }

    const room = await ChatRoom.query()
      .where('id', params.id)
      .where('organization_id', orgId)
      .first()

    if (!room) {
      return response.notFound({ message: 'Chat room not found' })
    }

    // Verify membership
    const isMember = await ChatRoomMember.query()
      .where('chat_room_id', room.id)
      .where('user_id', auth.user!.id)
      .first()

    if (!isMember) {
      return response.forbidden({ message: 'You are not a member of this chat room' })
    }

    const page = request.input('page', 1)
    const limit = request.input('limit', 50)

    const messages = await ChatMessage.query()
      .where('chat_room_id', room.id)
      .preload('sender', (s) => s.select('id', 'name', 'email', 'username'))
      .orderBy('created_at', 'desc')
      .paginate(page, limit)

    return response.json(messages)
  }

  /**
   * Post a new message in a chat room
   */
  async createMessage({ auth, params, request, response }: HttpContext) {
    const orgId = await this.resolveOrganizationId(auth.user!)
    if (!orgId) {
      return response.badRequest({ message: 'User is not associated with an organization' })
    }

    const room = await ChatRoom.query()
      .where('id', params.id)
      .where('organization_id', orgId)
      .first()

    if (!room) {
      return response.notFound({ message: 'Chat room not found' })
    }

    // Verify membership
    const isMember = await ChatRoomMember.query()
      .where('chat_room_id', room.id)
      .where('user_id', auth.user!.id)
      .first()

    if (!isMember) {
      return response.forbidden({ message: 'You are not a member of this chat room' })
    }

    const payload = await request.validateUsing(CreateMessageValidator)

    const message = await ChatMessage.create({
      chat_room_id: room.id,
      sender_id: auth.user!.id,
      content: payload.content,
      type: payload.type || 'TEXT',
    })

    // Update the room's updated_at timestamp so it floats to the top of active chats lists
    room.updatedAt = DateTime.now()
    await room.save()

    await message.load('sender', (s) => s.select('id', 'name', 'email', 'username'))

    return response.status(201).json(message)
  }

  /**
   * Add members to a GROUP chat room
   */
  async addMembers({ auth, params, request, response }: HttpContext) {
    const orgId = await this.resolveOrganizationId(auth.user!)
    if (!orgId) {
      return response.badRequest({ message: 'User is not associated with an organization' })
    }

    const room = await ChatRoom.query()
      .where('id', params.id)
      .where('organization_id', orgId)
      .where('type', 'GROUP')
      .first()

    if (!room) {
      return response.notFound({ message: 'Group chat room not found' })
    }

    // Verify requesting user is an ADMIN in the chat room
    const requestingMember = await ChatRoomMember.query()
      .where('chat_room_id', room.id)
      .where('user_id', auth.user!.id)
      .first()

    if (!requestingMember || requestingMember.role !== 'ADMIN') {
      return response.forbidden({ message: 'Only chat administrators can add members to this group' })
    }

    const payload = await request.validateUsing(AddMembersValidator)
    const { user_ids } = payload

    const existingMembers = await ChatRoomMember.query()
      .where('chat_room_id', room.id)
      .whereIn('user_id', user_ids)
    const existingUserIds = existingMembers.map((m) => m.user_id)
    const newMembersUserIds = [...new Set(user_ids)].filter((id) => !existingUserIds.includes(id))

    if (newMembersUserIds.length === 0) {
      return response.badRequest({ message: 'All selected users are already members of this room' })
    }

    // Verify new users belong to the organization
    const users = await User.query()
      .whereIn('id', newMembersUserIds)
      .where((builder) => {
        builder.where('organization_id', orgId)
          .orWhereHas('school', (sb) => sb.where('organization_id', orgId))
      })
    if (users.length !== newMembersUserIds.length) {
      return response.badRequest({
        message: 'One or more users do not exist or are outside your organization',
      })
    }

    await ChatRoomMember.createMany(
      newMembersUserIds.map((userId) => ({
        chat_room_id: room.id,
        user_id: userId,
        role: 'MEMBER' as const,
      }))
    )

    const updatedMembers = await ChatRoomMember.query()
      .where('chat_room_id', room.id)
      .preload('user', (u) => u.select('id', 'name', 'email', 'username', 'role_id').preload('role'))

    return response.json(updatedMembers)
  }

  /**
   * Remove a member from a GROUP chat room (or leave the room)
   */
  async removeMember({ auth, params, response }: HttpContext) {
    const orgId = await this.resolveOrganizationId(auth.user!)
    if (!orgId) {
      return response.badRequest({ message: 'User is not associated with an organization' })
    }

    const room = await ChatRoom.query()
      .where('id', params.id)
      .where('organization_id', orgId)
      .where('type', 'GROUP')
      .first()

    if (!room) {
      return response.notFound({ message: 'Group chat room not found' })
    }

    const targetUserId = Number(params.userId)
    const selfRemoval = auth.user!.id === targetUserId

    if (!selfRemoval) {
      // Must be an admin of the chat room to remove someone else
      const requestingMember = await ChatRoomMember.query()
        .where('chat_room_id', room.id)
        .where('user_id', auth.user!.id)
        .first()

      if (!requestingMember || requestingMember.role !== 'ADMIN') {
        return response.forbidden({ message: 'Only chat administrators can remove members from this group' })
      }
    }

    const memberToRemove = await ChatRoomMember.query()
      .where('chat_room_id', room.id)
      .where('user_id', targetUserId)
      .first()

    if (!memberToRemove) {
      return response.notFound({ message: 'User is not a member of this chat room' })
    }

    // If removing an admin, ensure they are not the last admin
    if (memberToRemove.role === 'ADMIN') {
      const otherAdminsCount = await ChatRoomMember.query()
        .where('chat_room_id', room.id)
        .where('role', 'ADMIN')
        .whereNot('user_id', targetUserId)
        .count('* as total')

      const totalAdmins = Number((otherAdminsCount[0] as any).$extras.total || 0)

      if (totalAdmins === 0) {
        return response.badRequest({
          message: 'Cannot remove the last administrator of the group. Promote another member to admin first.',
        })
      }
    }

    await memberToRemove.delete()

    return response.json({ message: 'Member removed successfully' })
  }

  /**
   * Mark messages in a chat room as read (updates last_read_at)
   */
  async markRead({ auth, params, response }: HttpContext) {
    const orgId = await this.resolveOrganizationId(auth.user!)
    if (!orgId) {
      return response.badRequest({ message: 'User is not associated with an organization' })
    }

    const room = await ChatRoom.query()
      .where('id', params.id)
      .where('organization_id', orgId)
      .first()

    if (!room) {
      return response.notFound({ message: 'Chat room not found' })
    }

    const membership = await ChatRoomMember.query()
      .where('chat_room_id', room.id)
      .where('user_id', auth.user!.id)
      .first()

    if (!membership) {
      return response.forbidden({ message: 'You are not a member of this chat room' })
    }

    membership.last_read_at = DateTime.now()
    await membership.save()

    return response.json({ message: 'Messages marked as read' })
  }
}
