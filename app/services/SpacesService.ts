import { S3Client, PutObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3'
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
    this.endpoint = env.get('DO_SPACES_ENDPOINT') || 'https://blr1.digitalocean.com'
    this.bucket = env.get('DO_SPACES_BUCKET') || 'cnkhmc-spaces'
    this.region = env.get('DO_SPACES_REGION') || 'blr1'
    this.cdnUrl = env.get('DO_SPACES_CDN_URL')

    if (key && secret) {
      this.client = new S3Client({
        endpoint: this.endpoint.startsWith('http') ? this.endpoint : `https://${this.endpoint}`,
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
   * If Spaces is not configured, gracefully falls back to local storage in public/uploads.
   */
  public async upload(options: UploadOptions): Promise<UploadResult> {
    const { key, body, contentType = 'application/octet-stream', contentDisposition, isPublic = true } = options
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
          ACL: isPublic ? ObjectCannedACL.public_read : ObjectCannedACL.private,
        })

        await this.client.send(command)

        // Build Spaces URL
        let fileUrl: string
        if (this.cdnUrl) {
          fileUrl = `${this.cdnUrl.replace(/\/+$/, '')}/${normalizedKey}`
        } else {
          // Format: https://<bucket>.<region>.digitalocean.com/<key>
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
}

export default new SpacesService()
