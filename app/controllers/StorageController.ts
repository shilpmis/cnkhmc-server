import type { HttpContext } from '@adonisjs/core/http'
import Students from '#models/Students'
import Staff from '#models/Staff'
import SpacesService from '#services/SpacesService'
import AkshayaVault from '#services/akshaya_vault'
import fs from 'node:fs/promises'
import path from 'node:path'
import app from '@adonisjs/core/services/app'

const IMAGE_SIGNATURES: { type: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { type: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: 'image/webp', ext: 'webp', test: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
  { type: 'image/gif', ext: 'gif', test: (b) => b.subarray(0, 4).toString() === 'GIF8' },
]

/** Identify an image by its content, not by the name the client gave it. */
const sniffImage = (buffer: Buffer) => IMAGE_SIGNATURES.find((sig) => sig.test(buffer)) || null

/** Drop the previous photo (vault or legacy) of a person. */
const discardOldPhoto = async (current: string | null) => {
  if (!current) return
  const uuid = AkshayaVault.parseRef(current)
  if (uuid) {
    const old = await AkshayaVault.findActive(uuid)
    if (old) await AkshayaVault.remove(old).catch(() => {})
    return
  }
  await SpacesService.delete(current).catch(() => {})
}

export default class StorageController {
  /**
   * Generic Image Upload
   * POST /api/v1/storage/upload-image
   */
  public async uploadImage({ request, response, auth }: HttpContext) {
    try {
      const image = request.file('image', {
        size: '10mb',
        extnames: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      })

      if (!image) {
        return response.badRequest({ success: false, message: 'No image file provided' })
      }

      if (!image.isValid) {
        return response.badRequest({
          success: false,
          message: 'Invalid image file',
          errors: image.errors,
        })
      }

      const folder = request.input('folder', 'photos')
      const buffer = await fs.readFile(image.tmpPath!)

      // Staff and student photos hold personal data: store them encrypted and private.
      const photoCategory =
        folder === 'photos/staff' ? 'staff-photo' : folder === 'photos/students' ? 'student-photo' : null
      if (photoCategory) {
        const sniffed = sniffImage(buffer)
        if (!sniffed) {
          return response.badRequest({ success: false, message: 'File is not a valid image' })
        }
        const record = await AkshayaVault.store({
          schoolId: Number(auth.user!.school_id),
          category: photoCategory,
          buffer,
          ext: sniffed.ext,
          contentType: sniffed.type,
          originalName: image.clientName,
          uploadedBy: auth.user!.id,
        })
        return response.ok({
          success: true,
          message: 'Image uploaded successfully',
          data: { key: AkshayaVault.ref(record.uuid), url: AkshayaVault.signedUrl(record.uuid), isCloud: record.is_cloud },
        })
      }
      const ext = image.extname || 'jpg'
      const timestamp = Date.now()
      const key = `${folder}/${timestamp}_${image.clientName.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const uploadResult = await SpacesService.upload({
        key,
        body: buffer,
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        isPublic: true,
      })

      return response.ok({
        success: true,
        message: 'Image uploaded successfully',
        data: uploadResult,
      })
    } catch (error: any) {
      console.error('[StorageController] Error in uploadImage:', error)
      return response.status(500).json({
        success: false,
        message: 'Failed to upload image',
        error: error.message,
      })
    }
  }

  /**
   * Upload Student Profile Photo
   * POST /api/v1/students/:student_id/photo
   */
  public async uploadStudentPhoto({ request, response, params, auth }: HttpContext) {
    try {
      const studentId = Number(params.student_id)
      if (!studentId || isNaN(studentId)) {
        return response.badRequest({ success: false, message: 'Invalid student ID' })
      }

      const student = await Students.find(studentId)
      if (!student) {
        return response.notFound({ success: false, message: 'Student not found' })
      }

      const image = request.file('image', {
        size: '10mb',
        extnames: ['jpg', 'jpeg', 'png', 'webp'],
      })

      if (!image) {
        return response.badRequest({ success: false, message: 'No image file uploaded' })
      }

      if (!image.isValid) {
        return response.badRequest({
          success: false,
          message: 'Invalid image file',
          errors: image.errors,
        })
      }

      const buffer = await fs.readFile(image.tmpPath!)

      const sniffed = sniffImage(buffer)
      if (!sniffed) {
        return response.badRequest({ success: false, message: 'File is not a valid image' })
      }

      await discardOldPhoto(student.profile_photo)

      const record = await AkshayaVault.store({
        schoolId: Number(auth.user!.school_id),
        category: 'student-photo',
        ownerId: studentId,
        buffer,
        ext: sniffed.ext,
        contentType: sniffed.type,
        originalName: image.clientName,
        uploadedBy: auth.user!.id,
      })
      const uploadResult = { url: AkshayaVault.signedUrl(record.uuid), isCloud: record.is_cloud }

      student.profile_photo = AkshayaVault.ref(record.uuid)
      await student.save()

      return response.ok({
        success: true,
        message: 'Student photo updated successfully',
        data: {
          url: uploadResult.url,
          isCloud: uploadResult.isCloud,
          student: student.serialize(),
        },
      })
    } catch (error: any) {
      console.error('[StorageController] Error in uploadStudentPhoto:', error)
      return response.status(500).json({
        success: false,
        message: 'Failed to upload student photo',
        error: error.message,
      })
    }
  }

  /**
   * Delete Student Profile Photo
   * DELETE /api/v1/students/:student_id/photo
   */
  public async deleteStudentPhoto({ response, params }: HttpContext) {
    try {
      const studentId = Number(params.student_id)
      const student = await Students.find(studentId)
      if (!student) {
        return response.notFound({ success: false, message: 'Student not found' })
      }

      if (student.profile_photo) {
        await discardOldPhoto(student.profile_photo)
        student.profile_photo = null
        await student.save()
      }

      return response.ok({
        success: true,
        message: 'Student photo removed successfully',
      })
    } catch (error: any) {
      return response.status(500).json({
        success: false,
        message: 'Failed to remove photo',
        error: error.message,
      })
    }
  }

  /**
   * Upload Staff Profile Photo
   * POST /api/v1/staff/:staff_id/photo
   */
  public async uploadStaffPhoto({ request, response, params, auth }: HttpContext) {
    try {
      const staffId = Number(params.staff_id)
      if (!staffId || isNaN(staffId)) {
        return response.badRequest({ success: false, message: 'Invalid staff ID' })
      }

      const staff = await Staff.find(staffId)
      if (!staff) {
        return response.notFound({ success: false, message: 'Staff member not found' })
      }

      const image = request.file('image', {
        size: '10mb',
        extnames: ['jpg', 'jpeg', 'png', 'webp'],
      })

      if (!image) {
        return response.badRequest({ success: false, message: 'No image file uploaded' })
      }

      if (!image.isValid) {
        return response.badRequest({
          success: false,
          message: 'Invalid image file',
          errors: image.errors,
        })
      }

      const buffer = await fs.readFile(image.tmpPath!)

      const sniffed = sniffImage(buffer)
      if (!sniffed) {
        return response.badRequest({ success: false, message: 'File is not a valid image' })
      }

      await discardOldPhoto(staff.profile_photo)

      const record = await AkshayaVault.store({
        schoolId: Number(auth.user!.school_id),
        category: 'staff-photo',
        ownerId: staffId,
        buffer,
        ext: sniffed.ext,
        contentType: sniffed.type,
        originalName: image.clientName,
        uploadedBy: auth.user!.id,
      })
      const uploadResult = { url: AkshayaVault.signedUrl(record.uuid), isCloud: record.is_cloud }

      staff.profile_photo = AkshayaVault.ref(record.uuid)
      await staff.save()

      return response.ok({
        success: true,
        message: 'Staff photo updated successfully',
        data: {
          url: uploadResult.url,
          isCloud: uploadResult.isCloud,
          staff: staff.serialize(),
        },
      })
    } catch (error: any) {
      console.error('[StorageController] Error in uploadStaffPhoto:', error)
      return response.status(500).json({
        success: false,
        message: 'Failed to upload staff photo',
        error: error.message,
      })
    }
  }

  /**
   * Delete Staff Profile Photo
   * DELETE /api/v1/staff/:staff_id/photo
   */
  public async deleteStaffPhoto({ response, params }: HttpContext) {
    try {
      const staffId = Number(params.staff_id)
      const staff = await Staff.find(staffId)
      if (!staff) {
        return response.notFound({ success: false, message: 'Staff member not found' })
      }

      if (staff.profile_photo) {
        await discardOldPhoto(staff.profile_photo)
        staff.profile_photo = null
        await staff.save()
      }

      return response.ok({
        success: true,
        message: 'Staff photo removed successfully',
      })
    } catch (error: any) {
      return response.status(500).json({
        success: false,
        message: 'Failed to remove photo',
        error: error.message,
      })
    }
  }

  /**
   * Upload and Archive Exported File (PDF or Excel)
   * POST /api/v1/storage/upload-export
   */
  public async uploadExport({ request, response, auth }: HttpContext) {
    try {
      const folder = request.input('folder', 'general')
      const fileName = request.input('file_name')
      const file = request.file('file', {
        size: '50mb',
        extnames: ['xlsx', 'xls', 'pdf', 'csv'],
      })

      let buffer: Buffer
      let finalFileName: string
      let mimeType: string | undefined

      if (file) {
        if (!file.isValid) {
          return response.badRequest({
            success: false,
            message: 'Invalid export file',
            errors: file.errors,
          })
        }
        buffer = await fs.readFile(file.tmpPath!)
        finalFileName = fileName || file.clientName
        mimeType = file.headers?.['content-type']
      } else {
        const { file_content, file_type = 'xlsx' } = request.body()
        if (!file_content) {
          return response.badRequest({ success: false, message: 'No file provided' })
        }
        buffer = Buffer.isBuffer(file_content)
          ? file_content
          : Buffer.from(file_content, typeof file_content === 'string' && file_content.startsWith('data:') ? 'base64' : 'utf-8')
        finalFileName = fileName || `export_${Date.now()}.${file_type}`
      }

      // Exports contain personal data: store them encrypted and private.
      const cleanName = String(finalFileName).replace(/[^a-zA-Z0-9._-]/g, '_')
      const exportExt = cleanName.includes('.') ? cleanName.split('.').pop()!.toLowerCase() : 'bin'
      const exportTypes: Record<string, string> = {
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xls: 'application/vnd.ms-excel',
        pdf: 'application/pdf',
        csv: 'text/csv',
      }
      const record = await AkshayaVault.store({
        schoolId: Number(auth.user!.school_id),
        category: 'general-export',
        folder,
        buffer,
        ext: exportExt,
        contentType: mimeType || exportTypes[exportExt] || 'application/octet-stream',
        originalName: cleanName,
        uploadedBy: auth.user!.id,
      })
      const uploadResult = {
        key: AkshayaVault.ref(record.uuid),
        url: AkshayaVault.signedUrl(record.uuid),
        isCloud: record.is_cloud,
      }

      return response.ok({
        success: true,
        message: 'Export saved to cloud storage',
        data: uploadResult,
      })
    } catch (error: any) {
      console.error('[StorageController] Error in uploadExport:', error)
      return response.status(500).json({
        success: false,
        message: 'Failed to save export',
        error: error.message,
      })
    }
  }

  /**
   * Proxy image to provide CORS-safe access for PDF generation (react-pdf)
   * GET /api/v1/storage/proxy-image?url=...
   */
  public async proxyImage({ request, response }: HttpContext) {
    try {
      const imageUrl = request.input('url')
      if (!imageUrl || typeof imageUrl !== 'string') {
        return response.badRequest({ message: 'Missing url query parameter' })
      }

      // If it's a relative local upload path
      if (imageUrl.startsWith('/uploads/')) {
        const localPath = path.join(app.publicPath(), imageUrl)
        return response.download(localPath)
      }

      // Fetch remote image
      const res = await fetch(imageUrl)
      if (!res.ok) {
        return response.status(res.status).send('Failed to fetch image')
      }

      const contentType = res.headers.get('content-type') || 'image/jpeg'
      const arrayBuffer = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      response.header('Content-Type', contentType)
      response.header('Cache-Control', 'public, max-age=86400')
      response.header('Access-Control-Allow-Origin', '*')
      return response.send(buffer)
    } catch (err: any) {
      console.error('[StorageController] proxyImage error:', err)
      return response.status(500).send('Error proxying image')
    }
  }
}
