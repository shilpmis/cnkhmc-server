import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectAclCommand,
} from '@aws-sdk/client-s3'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs/promises'
import path from 'node:path'

export interface UploadOptions {
  key: string
  body: Buffer | Uint8Array | string
  contentType?: string
  contentDisposition?: string
  isPublic?: boolean
}

export interface UploadResult {
  key: string
  url: string
  isCloud: boolean
}

class SpacesService {
  private client: S3Client | null = null
  private bucket: string
  private endpoint: string
  private region: string
  private cdnUrl?: string

  constructor() {
    const key = env.get('DO_SPACES_KEY')
    const secret = env.get('DO_SPACES_SECRET')
    let rawEndpoint = env.get('DO_SPACES_ENDPOINT') || 'https://blr1.digitaloceanspaces.com'
    this.region = env.get('DO_SPACES_REGION') || 'blr1'
    this.bucket = env.get('DO_SPACES_BUCKET') || 'cnkhmc-spaces'
    this.cdnUrl = env.get('DO_SPACES_CDN_URL')

    // Normalize endpoint: ensure https protocol and correct digitaloceanspaces domain
    if (!rawEndpoint.startsWith('http')) {
      rawEndpoint = `https://${rawEndpoint}`
    }
    if (rawEndpoint.includes('digitalocean.com') && !rawEndpoint.includes('digitaloceanspaces.com')) {
      rawEndpoint = rawEndpoint.replace('digitalocean.com', 'digitaloceanspaces.com')
    }
    this.endpoint = rawEndpoint

    if (key && secret) {
      this.client = new S3Client({
        endpoint: this.endpoint,
        region: this.region,
        credentials: {
          accessKeyId: key,
          secretAccessKey: secret,
        },
        forcePathStyle: false,
      })
    }
  }

  /**
   * Check if Spaces credentials are configured
   */
  public isConfigured(): boolean {
    return this.client !== null
  }

  /**
   * Uploads a file buffer or string to DigitalOcean Spaces with public-read ACL.
   * If Spaces is not configured or an error occurs, gracefully falls back to local storage in public/uploads.
   */
  public async upload(options: UploadOptions): Promise<UploadResult> {
    const { key, body, contentType = 'application/octet-stream', contentDisposition, isPublic = false } = options
    const normalizedKey = key.replace(/^\/+/, '')

    const buffer = Buffer.isBuffer(body)
      ? body
      : typeof body === 'string'
        ? Buffer.from(body, 'utf-8')
        : Buffer.from(body)

    if (this.client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: normalizedKey,
          Body: buffer,
          ContentType: contentType,
          ContentDisposition: contentDisposition,
          ACL: isPublic ? 'public-read' : 'private',
        })

        await this.client.send(command)

        if (isPublic) {
          try {
            await this.client.send(
              new PutObjectAclCommand({
                Bucket: this.bucket,
                Key: normalizedKey,
                ACL: 'public-read',
              })
            )
          } catch (aclErr) {
            console.warn('[SpacesService] Notice setting public-read ACL:', aclErr)
          }
        }

        // Build Spaces URL
        let fileUrl: string
        if (this.cdnUrl) {
          fileUrl = `${this.cdnUrl.replace(/\/+$/, '')}/${normalizedKey}`
        } else {
          const host = this.endpoint.replace(/^https?:\/\//, '')
          fileUrl = `https://${this.bucket}.${host}/${normalizedKey}`
        }

        return {
          key: normalizedKey,
          url: fileUrl,
          isCloud: true,
        }
      } catch (err) {
        console.error('[SpacesService] Error uploading to DigitalOcean Spaces, falling back to local storage:', err)
      }
    }

    // Fallback: Local storage in public/uploads
    const localDir = path.join(app.publicPath(), 'uploads', path.dirname(normalizedKey))
    await fs.mkdir(localDir, { recursive: true })
    const localFilePath = path.join(app.publicPath(), 'uploads', normalizedKey)
    await fs.writeFile(localFilePath, buffer)

    return {
      key: normalizedKey,
      url: `/uploads/${normalizedKey}`,
      isCloud: false,
    }
  }

  /**
   * Store an already-encrypted object. Always private. Without Spaces credentials it falls back to
   * storage/vault, which is outside the publicly served folder.
   */
  public async putPrivateObject(key: string, body: Buffer): Promise<{ key: string; isCloud: boolean }> {
    const normalizedKey = key.replace(/^\/+/, '')

    if (this.client) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: normalizedKey,
          Body: body,
          ContentType: 'application/octet-stream',
          ACL: 'private',
        })
      )
      return { key: normalizedKey, isCloud: true }
    }

    const localFilePath = app.makePath('storage', 'vault', normalizedKey)
    await fs.mkdir(path.dirname(localFilePath), { recursive: true })
    await fs.writeFile(localFilePath, body)
    return { key: normalizedKey, isCloud: false }
  }

  /** Read back an object stored with putPrivateObject. */
  public async getPrivateObject(key: string, isCloud: boolean): Promise<Buffer> {
    const normalizedKey = key.replace(/^\/+/, '')

    if (isCloud) {
      if (!this.client) throw new Error('Object storage is not configured')
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: normalizedKey }))
      const bytes = await res.Body!.transformToByteArray()
      return Buffer.from(bytes)
    }

    return fs.readFile(app.makePath('storage', 'vault', normalizedKey))
  }

  /** Remove an object stored with putPrivateObject. */
  public async deletePrivateObject(key: string, isCloud: boolean): Promise<void> {
    const normalizedKey = key.replace(/^\/+/, '')

    if (isCloud) {
      if (!this.client) return
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: normalizedKey }))
      return
    }

    await fs.unlink(app.makePath('storage', 'vault', normalizedKey)).catch(() => {})
  }

  /**
   * Upload an export file (PDF or Excel) to a designated folder in Spaces
   */
  public async uploadExport(folder: string, fileName: string, buffer: Buffer, mimeType?: string): Promise<UploadResult> {
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '')
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `exports/${cleanFolder}/${cleanFileName}`

    let contentType = mimeType
    if (!contentType) {
      if (cleanFileName.endsWith('.xlsx')) {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } else if (cleanFileName.endsWith('.pdf')) {
        contentType = 'application/pdf'
      } else if (cleanFileName.endsWith('.csv')) {
        contentType = 'text/csv'
      } else {
        contentType = 'application/octet-stream'
      }
    }

    return this.upload({
      key,
      body: buffer,
      contentType,
      contentDisposition: `attachment; filename="${cleanFileName}"`,
      isPublic: true,
    })
  }

  /**
   * Upload an image file (e.g., student or staff photo)
   */
  public async uploadPhoto(target: 'students' | 'staff', identifier: number | string, fileBuffer: Buffer, ext = 'jpg'): Promise<UploadResult> {
    const timestamp = Date.now()
    const cleanExt = ext.replace(/^\./, '').toLowerCase()
    const key = `photos/${target}/${target}_${identifier}_${timestamp}.${cleanExt}`

    let contentType = 'image/jpeg'
    if (cleanExt === 'png') contentType = 'image/png'
    else if (cleanExt === 'webp') contentType = 'image/webp'
    else if (cleanExt === 'gif') contentType = 'image/gif'

    return this.upload({
      key,
      body: fileBuffer,
      contentType,
      isPublic: true,
    })
  }

  /**
   * Delete a file from DigitalOcean Spaces (or local storage fallback)
   */
  public async delete(keyOrUrl: string): Promise<boolean> {
    try {
      // Extract key from URL if full URL is passed
      let key = keyOrUrl
      if (keyOrUrl.startsWith('http')) {
        const urlObj = new URL(keyOrUrl)
        key = urlObj.pathname.replace(/^\/+/, '')
      } else if (keyOrUrl.startsWith('/uploads/')) {
        key = keyOrUrl.replace(/^\/uploads\//, '')
      }

      const normalizedKey = key.replace(/^\/+/, '')

      if (this.client) {
        try {
          await this.client.send(
            new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: normalizedKey,
            })
          )
          return true
        } catch (e) {
          console.error('[SpacesService] Error deleting from Spaces:', e)
        }
      }

      // Check local file deletion
      const localFilePath = path.join(app.publicPath(), 'uploads', normalizedKey)
      try {
        await fs.unlink(localFilePath)
      } catch {}

      return true
    } catch (err) {
      console.error('[SpacesService] Failed to delete file:', err)
      return false
    }
  }
}

export default new SpacesService()
