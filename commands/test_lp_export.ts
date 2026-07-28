import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/User'
import fs from 'node:fs'

export default class TestLpExport extends BaseCommand {
  static commandName = 'test:lp-export'
  static description = 'Test the lesson plan PDF export endpoint and validate binary integrity'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const user = await User.find(131)
    if (!user) {
      this.logger.error('User 131 not found')
      return
    }

    const token = await User.accessTokens.create(user)
    const tokenValue = token.value!.release()

    const url = 'http://localhost:3333/api/v1/lesson-plans/export/132/1?academicYear=44'
    this.logger.info(`GET ${url}`)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokenValue}`,
        Accept: 'application/pdf',
      },
    })

    this.logger.info(`Status: ${response.status} ${response.statusText}`)
    this.logger.info(`Content-Type: ${response.headers.get('content-type')}`)

    if (response.ok) {
      const arrayBuf = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuf)
      
      // Validate it's a real PDF
      const header = buffer.slice(0, 8).toString('ascii')
      const isValidPdf = header.startsWith('%PDF')
      
      this.logger.info(`PDF header: "${header}"`)
      this.logger.info(`Valid PDF binary: ${isValidPdf}`)
      this.logger.info(`Size: ${buffer.length} bytes`)
      
      // Check for embedded text content (PDFKit embeds text as streams)
      const pdfText = buffer.toString('latin1')
      const hasSubtopicData = pdfText.includes('Lesson Plan') || pdfText.includes('LP Number')
      this.logger.info(`Has PDF text content: ${hasSubtopicData}`)

      const outPath = 'scratch/test_export_output.pdf'
      fs.writeFileSync(outPath, buffer)
      this.logger.info(`✓ PDF written to ${outPath}`)
    } else {
      const text = await response.text()
      this.logger.error(`✗ Error body: ${text}`)
    }

    await User.accessTokens.delete(user, token.identifier)
  }
}
