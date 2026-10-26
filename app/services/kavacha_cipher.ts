import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto'
import env from '#start/env'

/**
 * Kavacha: envelope encryption for files holding personal data.
 *
 *  - Every file gets its own random 256-bit data key (DEK) and is sealed with AES-256-GCM.
 *  - The DEK is wrapped (encrypted) with a key-encryption key (KEK) that is derived with
 *    HKDF-SHA256 from a master key, a random per-file salt and the school/purpose context.
 *  - Only ciphertext goes to object storage. The wrapped DEK, IV, tag, salt and key version go
 *    to the database. Master keys live in KAVACHA_KEYRING (never in the database or git).
 */

export interface KavachaContext {
  schoolId: number
  purpose: string
}

export interface KavachaSealed {
  ciphertext: Buffer
  wrappedKey: string
  iv: string
  tag: string
  salt: string
  keyVersion: number
}

export interface KavachaRecord {
  wrappedKey: string
  iv: string
  tag: string
  salt: string
  keyVersion: number
}

const KEY_LEN = 32
const IV_LEN = 12
const TAG_LEN = 16

class KavachaCipher {
  private ringCache: { ring: Map<number, Buffer>; active: number } | null = null

  private loadRing() {
    if (this.ringCache) return this.ringCache

    const raw = env.get('KAVACHA_KEYRING')
    if (!raw) {
      throw new Error('KAVACHA_KEYRING is not configured. Refusing to handle protected files without encryption.')
    }

    // Accept the JSON as-is, wrapped in stray quotes, or base64-encoded JSON (some hosting
    // dashboards strip or escape the double quotes inside a JSON value).
    const candidates = [raw.trim(), raw.trim().replace(/^['"]|['"]$/g, '')]
    candidates.push(...candidates.map((c) => Buffer.from(c, 'base64').toString('utf8')))

    let parsed: Record<string, string> | null = null
    for (const candidate of candidates) {
      try {
        const value = JSON.parse(candidate)
        if (value && typeof value === 'object') {
          parsed = value
          break
        }
      } catch {
        // try the next form
      }
    }
    if (!parsed) {
      throw new Error(
        'KAVACHA_KEYRING could not be read. Use JSON such as {"1":"<base64 32-byte key>"} or the same JSON base64-encoded.'
      )
    }

    const ring = new Map<number, Buffer>()
    for (const [version, b64] of Object.entries(parsed)) {
      const key = Buffer.from(b64, 'base64')
      if (key.length !== KEY_LEN) {
        throw new Error(`KAVACHA_KEYRING version ${version} must be a base64-encoded 32-byte key`)
      }
      ring.set(Number(version), key)
    }

    const active = env.get('KAVACHA_ACTIVE_VERSION') ?? Math.max(...ring.keys())
    if (!ring.has(Number(active))) {
      throw new Error(`KAVACHA_ACTIVE_VERSION ${active} is not present in KAVACHA_KEYRING`)
    }

    this.ringCache = { ring, active: Number(active) }
    return this.ringCache
  }

  private masterFor(version: number): Buffer {
    const key = this.loadRing().ring.get(version)
    if (!key) throw new Error(`Master key version ${version} is not available`)
    return key
  }

  private aad(ctx: KavachaContext): Buffer {
    return Buffer.from(`kavacha:${ctx.schoolId}:${ctx.purpose}`, 'utf8')
  }

  private deriveKek(master: Buffer, salt: Buffer, ctx: KavachaContext): Buffer {
    return Buffer.from(hkdfSync('sha256', master, salt, `kavacha-kek:${ctx.schoolId}:${ctx.purpose}`, KEY_LEN))
  }

  /** Encrypt a file. The returned ciphertext is safe to upload; the rest belongs in the database. */
  seal(plain: Buffer, ctx: KavachaContext): KavachaSealed {
    const { active } = this.loadRing()
    const master = this.masterFor(active)

    const dek = randomBytes(KEY_LEN)
    const iv = randomBytes(IV_LEN)
    const cipher = createCipheriv('aes-256-gcm', dek, iv)
    cipher.setAAD(this.aad(ctx))
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()])
    const tag = cipher.getAuthTag()

    const salt = randomBytes(KEY_LEN)
    const kek = this.deriveKek(master, salt, ctx)
    const wrapIv = randomBytes(IV_LEN)
    const wrapper = createCipheriv('aes-256-gcm', kek, wrapIv)
    wrapper.setAAD(this.aad(ctx))
    const wrappedDek = Buffer.concat([wrapper.update(dek), wrapper.final()])
    const wrapTag = wrapper.getAuthTag()

    dek.fill(0)
    kek.fill(0)

    return {
      ciphertext,
      wrappedKey: Buffer.concat([wrapIv, wrappedDek, wrapTag]).toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      salt: salt.toString('base64'),
      keyVersion: active,
    }
  }

  /** Decrypt a file. Throws if the data, the context or the stored seal were tampered with. */
  open(ciphertext: Buffer, record: KavachaRecord, ctx: KavachaContext): Buffer {
    const master = this.masterFor(record.keyVersion)
    const salt = Buffer.from(record.salt, 'base64')
    const kek = this.deriveKek(master, salt, ctx)

    const blob = Buffer.from(record.wrappedKey, 'base64')
    const wrapIv = blob.subarray(0, IV_LEN)
    const wrapTag = blob.subarray(blob.length - TAG_LEN)
    const wrappedDek = blob.subarray(IV_LEN, blob.length - TAG_LEN)

    const unwrapper = createDecipheriv('aes-256-gcm', kek, wrapIv)
    unwrapper.setAAD(this.aad(ctx))
    unwrapper.setAuthTag(wrapTag)
    const dek = Buffer.concat([unwrapper.update(wrappedDek), unwrapper.final()])

    const decipher = createDecipheriv('aes-256-gcm', dek, Buffer.from(record.iv, 'base64'))
    decipher.setAAD(this.aad(ctx))
    decipher.setAuthTag(Buffer.from(record.tag, 'base64'))
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])

    dek.fill(0)
    kek.fill(0)
    return plain
  }

  /**
   * Encrypt a short value (Aadhaar, account number, PAN...) for a database column.
   * Format: enc1.<keyVersion>.<iv>.<tag>.<ciphertext> (base64url). `ref` is "table.column" and is
   * bound into the key and the authenticated data, so a value cannot be moved to another column.
   */
  sealField(plain: string, ref: string): string {
    const { active } = this.loadRing()
    const key = this.deriveAux(this.masterFor(active), `field:${ref}`)
    const iv = randomBytes(IV_LEN)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    cipher.setAAD(Buffer.from(`kavacha-field:${ref}`, 'utf8'))
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    key.fill(0)
    const b64 = (b: Buffer) => b.toString('base64url')
    return `enc1.${active}.${b64(iv)}.${b64(tag)}.${b64(ct)}`
  }

  isSealedField(value: unknown): boolean {
    return typeof value === 'string' && value.startsWith('enc1.')
  }

  openField(value: string, ref: string): string {
    const [, version, iv, tag, ct] = value.split('.')
    const key = this.deriveAux(this.masterFor(Number(version)), `field:${ref}`)
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
    decipher.setAAD(Buffer.from(`kavacha-field:${ref}`, 'utf8'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    const plain = Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8')
    key.fill(0)
    return plain
  }

  /**
   * Keyed hash used to find or de-duplicate a value without decrypting every row.
   * It uses one fixed key version (KAVACHA_INDEX_VERSION, default: the oldest key) so that
   * rotating the active master key does not change any index.
   */
  blindIndex(ref: string, normalized: string): string {
    const { ring } = this.loadRing()
    const version = env.get('KAVACHA_INDEX_VERSION') ?? Math.min(...ring.keys())
    const key = this.deriveAux(this.masterFor(version), `index:${ref}`)
    return createHmac('sha256', key).update(normalized).digest('hex')
  }

  /** Derive an auxiliary key (URL signing, opaque path references) from a master key. */
  private deriveAux(master: Buffer, info: string): Buffer {
    return Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), `kavacha-aux:${info}`, KEY_LEN))
  }

  /** Stable, unguessable reference for an internal id, used to keep ids and names out of paths. */
  opaqueRef(kind: string, id: number | string): string {
    const key = this.deriveAux(this.masterFor(this.loadRing().active), 'path-ref')
    return createHmac('sha256', key).update(`${kind}:${id}`).digest('hex').slice(0, 24)
  }

  /** Signature for short-lived download links. */
  signLink(fileUuid: string, expiresAt: number): string {
    const key = this.deriveAux(this.masterFor(this.loadRing().active), 'signed-link')
    return createHmac('sha256', key).update(`${fileUuid}.${expiresAt}`).digest('hex')
  }

  verifyLink(fileUuid: string, expiresAt: number, signature: string): boolean {
    if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false
    const given = Buffer.from(signature, 'hex')
    for (const master of this.loadRing().ring.values()) {
      const key = this.deriveAux(master, 'signed-link')
      const expected = createHmac('sha256', key).update(`${fileUuid}.${expiresAt}`).digest()
      if (given.length === expected.length && timingSafeEqual(given, expected)) return true
    }
    return false
  }
}

export default new KavachaCipher()
