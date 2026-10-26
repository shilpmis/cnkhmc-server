import type { HttpContext } from '@adonisjs/core/http'
import AkshayaVault from '#services/akshaya_vault'
import KavachaCipher from '#services/kavacha_cipher'

/**
 * Sanjaya: the only door to protected files. Nobody reads the bucket directly.
 *  - GET vault/:uuid          needs a login, the same school, and (for exports) the uploader or an admin role
 *  - GET vault/signed/:uuid   short-lived signed link, issued only after those checks passed
 */
const ADMIN_ROLE_IDS = [1, 2, 5, 8, 11]
const INLINE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export default class SanjayaController {
  private async deliver(ctx: HttpContext, uuid: string, via: 'login' | 'signed-link', userId: number | null) {
    const { response, request } = ctx
    const record = await AkshayaVault.findActive(uuid)
    if (!record) return response.notFound({ message: 'File not found' })

    if (via === 'login') {
      const user = ctx.auth.user!
      if (Number(user.school_id) !== Number(record.school_id)) {
        return response.notFound({ message: 'File not found' })
      }
      const isPhoto = record.category.endsWith('-photo')
      const isAdmin = ADMIN_ROLE_IDS.includes(Number(user.role_id))
      if (!isPhoto && !isAdmin && Number(record.uploaded_by) !== Number(user.id)) {
        return response.forbidden({ message: 'You are not allowed to open this file' })
      }
    }

    try {
      const plain = await AkshayaVault.read(record)
      await AkshayaVault.log(record.id, record.school_id, userId, 'read', via, request.ip())

      const type = record.content_type || 'application/octet-stream'
      const inline = INLINE_TYPES.has(type)
      response.header('Content-Type', inline ? type : 'application/octet-stream')
      response.header('X-Content-Type-Options', 'nosniff')
      response.header('Cache-Control', 'private, max-age=300')
      response.header(
        'Content-Disposition',
        `${inline ? 'inline' : 'attachment'}; filename="${(record.original_name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}"`
      )
      return response.send(plain)
    } catch (error: any) {
      console.error('[Sanjaya] Failed to open file', record.uuid, error.message)
      return response.status(500).json({ message: 'Unable to open file' })
    }
  }

  async show(ctx: HttpContext) {
    return this.deliver(ctx, ctx.params.uuid, 'login', ctx.auth.user!.id)
  }

  async showSigned(ctx: HttpContext) {
    const uuid = ctx.params.uuid
    const exp = Number(ctx.request.input('exp'))
    const sig = String(ctx.request.input('sig') || '')

    let valid = false
    try {
      valid = /^[0-9a-f]+$/i.test(sig) && KavachaCipher.verifyLink(uuid, exp, sig)
    } catch {
      valid = false
    }
    if (!valid) return ctx.response.status(403).json({ message: 'Link is invalid or has expired' })

    return this.deliver(ctx, uuid, 'signed-link', null)
  }
}
