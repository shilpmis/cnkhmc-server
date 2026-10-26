import { createHash, randomUUID } from 'node:crypto'
import env from '#start/env'
import AkshayaPatra from '#models/akshaya_patra'
import db from '@adonisjs/lucid/services/db'
import KavachaCipher from '#services/kavacha_cipher'
import DwarkaPath, { type DwarkaInput } from '#services/dwarka_path'
import SpacesService from '#services/SpacesService'

/**
 * Akshaya Vault: stores personal-data files encrypted and private.
 * Hierarchy comes from DwarkaPath, cryptography from KavachaCipher, transport from SpacesService.
 */

export interface VaultStoreInput extends Omit<DwarkaInput, 'fileUuid' | 'ext'> {
  buffer: Buffer
  ext: string
  contentType: string
  originalName?: string | null
  uploadedBy?: number | null
}

const LINK_TTL_SECONDS = 10 * 60
const VAULT_REF_PREFIX = 'vault:'
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

class AkshayaVault {
  private purposeFor(category: string): string {
    return category.endsWith('-photo') ? 'photos' : 'exports'
  }

  async store(input: VaultStoreInput): Promise<AkshayaPatra> {
    const { buffer, contentType, originalName, uploadedBy, ...pathInput } = input
    const fileUuid = randomUUID()
    const objectKey = DwarkaPath.build({ ...pathInput, fileUuid })

    const sealed = KavachaCipher.seal(buffer, {
      schoolId: input.schoolId,
      purpose: this.purposeFor(input.category),
    })
    const stored = await SpacesService.putPrivateObject(objectKey, sealed.ciphertext)

    const ownerType = input.category.startsWith('staff')
      ? 'staff'
      : input.category.startsWith('student')
        ? 'student'
        : null

    return AkshayaPatra.create({
      uuid: fileUuid,
      school_id: input.schoolId,
      category: input.category,
      owner_type: ownerType,
      owner_id: input.ownerId ? Number(input.ownerId) : null,
      object_key: stored.key,
      original_name: originalName || null,
      content_type: contentType,
      size_bytes: buffer.length,
      plaintext_sha256: createHash('sha256').update(buffer).digest('hex'),
      wrapped_key: sealed.wrappedKey,
      iv: sealed.iv,
      tag: sealed.tag,
      salt: sealed.salt,
      key_version: sealed.keyVersion,
      is_cloud: stored.isCloud,
      uploaded_by: uploadedBy ?? null,
    })
  }

  /** Download, decrypt and integrity-check a file. */
  async read(record: AkshayaPatra): Promise<Buffer> {
    const ciphertext = await SpacesService.getPrivateObject(record.object_key, record.is_cloud)
    const plain = KavachaCipher.open(
      ciphertext,
      {
        wrappedKey: record.wrapped_key,
        iv: record.iv,
        tag: record.tag,
        salt: record.salt,
        keyVersion: record.key_version,
      },
      { schoolId: record.school_id, purpose: this.purposeFor(record.category) }
    )

    if (createHash('sha256').update(plain).digest('hex') !== record.plaintext_sha256) {
      throw new Error('Integrity check failed for stored file')
    }
    return plain
  }

  /** Delete the object and mark the record deleted. The key material is wiped from the record. */
  async remove(record: AkshayaPatra): Promise<void> {
    await SpacesService.deletePrivateObject(record.object_key, record.is_cloud).catch(() => {})
    record.merge({ deleted_at: new Date() as any, wrapped_key: '', iv: '', tag: '', salt: '' })
    await record.save()
  }

  async findActive(uuid: string): Promise<AkshayaPatra | null> {
    return AkshayaPatra.query().where('uuid', uuid).whereNull('deleted_at').first()
  }

  /** Value kept in a business column such as students.profile_photo. */
  ref(uuid: string): string {
    return `${VAULT_REF_PREFIX}${uuid}`
  }

  /** Accepts a stored ref or a signed link that was echoed back by a client; returns the file uuid. */
  parseRef(value: string | null | undefined): string | null {
    if (!value) return null
    if (value.startsWith(VAULT_REF_PREFIX)) return value.slice(VAULT_REF_PREFIX.length)
    if (value.includes('/vault/signed/')) return value.match(UUID_RE)?.[0] ?? null
    return null
  }

  private apiBase(): string {
    const configured = env.get('PUBLIC_API_URL')
    if (configured) return configured.replace(/\/+$/, '')
    const host = env.get('HOST')
    return `http://${host === '0.0.0.0' ? 'localhost' : host}:${env.get('PORT')}`
  }

  /** Short-lived link that works in plain <img> tags. Access is decided when the link is issued. */
  signedUrl(uuid: string, ttlSeconds = LINK_TTL_SECONDS): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds
    const sig = KavachaCipher.signLink(uuid, exp)
    return `${this.apiBase()}/api/v1/vault/signed/${uuid}?exp=${exp}&sig=${sig}`
  }

  /** Turn a stored column value into something a browser can load. Legacy URLs pass through. */
  toClientUrl(value: string | null | undefined): string | null {
    const uuid = this.parseRef(value)
    if (!uuid) return value ?? null
    try {
      return this.signedUrl(uuid)
    } catch {
      return null
    }
  }

  /** Turn a client-provided value back into what should be stored. */
  toStoredValue(value: string | null | undefined): string | null | undefined {
    const uuid = this.parseRef(value)
    return uuid ? this.ref(uuid) : value
  }

  async log(fileId: number, schoolId: number | null, userId: number | null, action: string, via: string, ip?: string) {
    await db.table('akshaya_patra_access_logs').insert({
      file_id: fileId,
      school_id: schoolId,
      user_id: userId,
      action,
      via,
      ip_address: ip ?? null,
      created_at: new Date(),
    })
  }
}

export default new AkshayaVault()
