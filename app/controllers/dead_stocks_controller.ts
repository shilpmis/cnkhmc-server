import type { HttpContext } from '@adonisjs/core/http'
import DeadStock from '#models/dead_stock'
import DeadStockTransaction from '#models/dead_stock_transaction'
import InventoryDepartment from '#models/inventory_department'
import { createDeadStockValidator } from '#validators/dead_stock'
import { DateTime } from 'luxon'
import ExcelJS from 'exceljs'
import app from '@adonisjs/core/services/app'
import path from 'node:path'
import fs from 'node:fs'

export default class DeadStocksController {
  async index({ response }: HttpContext) {
    const stocks = await DeadStock.query().orderBy('created_at', 'desc')
    return response.ok({ data: stocks })
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createDeadStockValidator)
    
    // Automatically set available quantity to total quantity on creation
    const stockData = {
      ...payload,
      purchaseDate: payload.purchaseDate ? DateTime.fromJSDate(payload.purchaseDate) : undefined,
      expiryDate: payload.expiryDate ? DateTime.fromJSDate(payload.expiryDate) : undefined,
      totalAmount: payload.unitPrice * payload.totalQuantity,
      availableQuantity: payload.totalQuantity
    }

    const stock = await DeadStock.create(stockData)
    return response.created({ message: 'Dead stock entry created successfully', data: stock })
  }

  async downloadTemplate({ response }: HttpContext) {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Dead Stock Template')

    worksheet.columns = [
      { header: 'Item Name *', key: 'itemName', width: 25 },
      { header: 'Department Name', key: 'departmentName', width: 24 },
      { header: 'Invoice Number', key: 'invoiceNumber', width: 18 },
      { header: 'Supplier Name', key: 'supplierName', width: 22 },
      { header: 'Purchase Date (YYYY-MM-DD)', key: 'purchaseDate', width: 24 },
      { header: 'Unit Price (INR)', key: 'unitPrice', width: 16 },
      { header: 'Total Quantity *', key: 'totalQuantity', width: 16 },
      { header: 'Expiry Date (YYYY-MM-DD)', key: 'expiryDate', width: 24 },
    ]

    // Sample rows showing both unassigned (Central Store) and department-assigned items
    worksheet.addRow({
      itemName: 'Microscope Model X1',
      departmentName: 'Pathology Department',
      invoiceNumber: 'INV-2026-001',
      supplierName: 'LabEquip Supplies Ltd',
      purchaseDate: '2026-01-15',
      unitPrice: 15000,
      totalQuantity: 5,
      expiryDate: ''
    })

    worksheet.addRow({
      itemName: 'Epson Projector EB-X06',
      departmentName: 'Anatomy Lecture Hall',
      invoiceNumber: 'INV-2026-002',
      supplierName: 'Visiontech Systems',
      purchaseDate: '2026-02-10',
      unitPrice: 35000,
      totalQuantity: 2,
      expiryDate: ''
    })

    worksheet.addRow({
      itemName: 'Office Executive Chairs',
      departmentName: '', // Central Store
      invoiceNumber: 'INV-2026-003',
      supplierName: 'Godrej Office Solutions',
      purchaseDate: '2026-03-01',
      unitPrice: 4500,
      totalQuantity: 10,
      expiryDate: ''
    })

    // Styling table header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E293B' }
    }

    response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response.header('Content-Disposition', 'attachment; filename="Dead_Stock_Import_Template.xlsx"')
    
    const buffer = await workbook.xlsx.writeBuffer()
    return response.send(buffer)
  }

  async importExcel({ request, response }: HttpContext) {
    const file = request.file('file', {
      extnames: ['xlsx', 'xls', 'csv'],
      size: '20mb',
    })

    if (!file) {
      return response.badRequest({ message: 'No file uploaded.' })
    }

    const uploadDir = path.join(app.tmpPath(), 'uploads')
    await file.move(uploadDir)

    if (!file.isValid) {
      return response.badRequest({ message: file.errors })
    }

    const filePath = path.join(uploadDir, file.clientName)
    const workbook = new ExcelJS.Workbook()
    
    if (file.extname === 'csv') {
      await workbook.csv.readFile(filePath)
    } else {
      await workbook.xlsx.readFile(filePath)
    }

    const worksheet = workbook.getWorksheet(1)
    if (!worksheet) {
      return response.badRequest({ message: 'Worksheet is empty' })
    }

    const headers: Record<number, string> = {}
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.text ? cell.text.trim() : `Col_${colNumber}`
    })

    const parseDate = (val: any): DateTime | null => {
      if (!val) return null
      if (val instanceof Date) return DateTime.fromJSDate(val)
      if (typeof val === 'number') {
        return DateTime.fromMillis((val - 25569) * 86400 * 1000)
      }
      if (typeof val === 'string') {
        const trimmed = val.trim()
        let dt = DateTime.fromISO(trimmed)
        if (dt.isValid) return dt
        dt = DateTime.fromFormat(trimmed, 'yyyy-MM-dd')
        if (dt.isValid) return dt
        dt = DateTime.fromFormat(trimmed, 'dd-MM-yyyy')
        if (dt.isValid) return dt
        dt = DateTime.fromFormat(trimmed, 'dd/MM/yyyy')
        if (dt.isValid) return dt
      }
      return null
    }

    const cleanDepartment = (deptStr: string): string => {
      if (!deptStr) return ''
      let str = String(deptStr).trim()
      str = str.replace(/^[0-9]+\s*/, '').trim()
      if (str.toLowerCase().includes('phsiology') || str.toLowerCase().includes('physiology') || str.toLowerCase().includes('physilogy') || str.toLowerCase().includes('physology')) return 'Physiology Department'
      if (str.toLowerCase().includes('pharmacy') || str.toLowerCase().includes('pharon')) return 'Pharmacy Department'
      if (str.toLowerCase().includes('anatomy')) return 'Anatomy Department'
      if (str.toLowerCase().includes('office') || str.toLowerCase().includes('offfice')) return 'Office'
      if (str.toLowerCase().includes('hospital') || str.toLowerCase().includes('hosp')) return 'Hospital'
      if (str.toLowerCase().includes('library')) return 'Library'
      if (str.toLowerCase().includes('organon') || str.toLowerCase().includes('org')) return 'Organon Department'
      if (str.toLowerCase().includes('materia') || str.toLowerCase().includes('hmm') || str.toLowerCase().includes('m.m')) return 'Homoeopathic Materia Medica Department'
      if (str.toLowerCase().includes('repertory') || str.toLowerCase().includes('reportary') || str.toLowerCase().includes('reportry') || str.toLowerCase().includes('rep')) return 'Repertory Department'
      if (str.toLowerCase().includes('patho')) return 'Pathology Department'
      if (str.toLowerCase().includes('gynaec') || str.toLowerCase().includes('obgy') || str.toLowerCase().includes('gynac') || str.toLowerCase().includes('gynec') || str.toLowerCase().includes('obst')) return 'Gynaecology & Obstetrics Department'
      if (str.toLowerCase().includes('surgery')) return 'Surgery Department'
      if (str.toLowerCase().includes('practice') || str.toLowerCase().includes('pm') || str.toLowerCase().includes('medicine')) return 'Practice of Medicine Department'
      if (str.toLowerCase().includes('opd') || str.toLowerCase().includes('o.p.d')) return 'OPD'
      if (str.toLowerCase().includes('ipd')) return 'IPD'
      if (str.toLowerCase().includes('hostel')) return 'Hostel'
      if (str.toLowerCase().includes('psm') || str.toLowerCase().includes('community')) return 'Community Medicine (PSM) Department'
      if (str.toLowerCase().includes('fmt') || str.toLowerCase().includes('forensic')) return 'Forensic Medicine & Toxicology (FMT) Department'
      if (str.toLowerCase().includes('physio therapy') || str.toLowerCase().includes('physiotheraphy')) return 'Physiotherapy Department'
      return str
    }

    const parseDeptString = (str: string): { qty: number | null, name: string } | null => {
      if (!str) return null
      let s = String(str).trim()
      if (!s) return null
      const match = s.match(/^(\d+)\s+(.*)$/)
      if (match) {
        let qty = parseInt(match[1], 10)
        let name = match[2].trim()
        return { qty, name }
      }
      return { qty: null, name: s }
    }

    const mapField = (headerName: string): string | null => {
      const clean = headerName.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (clean.includes('dept') || clean.includes('department') || clean.includes('location') || clean.includes('issue')) return 'departmentName'
      if (clean.includes('item') || clean.includes('particular')) return 'itemName'
      if (clean.includes('invoice') || clean.includes('bill')) return 'invoiceNumber'
      if (clean.includes('supplier') || clean.includes('vendor')) return 'supplierName'
      if (clean.includes('purchasedate') || clean.includes('dateofreceive') || clean.includes('receive')) return 'purchaseDate'
      if (clean === 'amount' || clean.includes('unitprice') || clean.includes('price') || clean.includes('rate') || clean.includes('cost')) return 'unitPrice'
      if (clean.includes('totalquantity') || clean.includes('quantity') || clean.includes('qty')) return 'totalQuantity'
      if (clean.includes('expirydate') || clean.includes('expiry')) return 'expiryDate'
      return null
    }

    // Load existing inventory departments to match by name
    const existingDepartments = await InventoryDepartment.all()
    const departmentMap = new Map<string, InventoryDepartment>()
    existingDepartments.forEach(d => {
      departmentMap.set(d.name.trim().toLowerCase(), d)
    })

    const rowsToProcess: any[] = []

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return

      const rowData: Record<string, any> = {}
      const rawDeptStrings: string[] = []

      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber]
        if (!header) return
        const field = mapField(header)

        let val = cell.value
        if (val !== null && val !== undefined && typeof val === 'object' && !(val instanceof Date)) {
          if ('text' in val && typeof (val as any).text === 'string') val = (val as any).text
          else if ('result' in val) val = (val as any).result
          else if ('richText' in val && Array.isArray((val as any).richText)) val = (val as any).richText.map((r: any) => r.text).join('')
        }

        if (field === 'departmentName') {
          if (val) rawDeptStrings.push(String(val).trim())
        } else if (field) {
          rowData[field] = val
        }
      })

      if (!rowData.itemName || String(rowData.itemName).trim() === '') {
        return // skip empty rows
      }

      rowData.rawDeptStrings = rawDeptStrings
      rowsToProcess.push(rowData)
    })

    // Clean up uploaded file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch {}

    if (rowsToProcess.length === 0) {
      return response.badRequest({ message: 'No valid stock items found in the file. Please check column headers.' })
    }

    let createdCount = 0

    for (const rowData of rowsToProcess) {
      const itemName = String(rowData.itemName).trim()
      const unitPrice = Number(rowData.unitPrice) || 0
      const totalQuantity = Number(rowData.totalQuantity) > 0 ? Number(rowData.totalQuantity) : 1
      const totalAmount = unitPrice * totalQuantity
      const purchaseDate = parseDate(rowData.purchaseDate)
      const expiryDate = parseDate(rowData.expiryDate)
      const rawDeptStrings: string[] = rowData.rawDeptStrings || []

      // Parse department issue allocations
      const deptAllocations: { departmentName: string, qty: number }[] = []
      let totalAllocatedQty = 0

      for (const rawStr of rawDeptStrings) {
        const parsed = parseDeptString(rawStr)
        if (parsed) {
          const cleanedName = cleanDepartment(parsed.name)
          const qty = parsed.qty !== null ? parsed.qty : totalQuantity
          if (cleanedName) {
            deptAllocations.push({ departmentName: cleanedName, qty })
            totalAllocatedQty += qty
          }
        }
      }

      const availableQuantity = Math.max(0, totalQuantity - totalAllocatedQty)

      const stock = await DeadStock.create({
        itemName,
        invoiceNumber: rowData.invoiceNumber ? String(rowData.invoiceNumber).trim() : null,
        supplierName: rowData.supplierName ? String(rowData.supplierName).trim() : null,
        purchaseDate,
        unitPrice,
        totalQuantity,
        totalAmount,
        expiryDate,
        availableQuantity
      })

      for (const alloc of deptAllocations) {
        const deptKey = alloc.departmentName.toLowerCase()
        let department: InventoryDepartment

        if (departmentMap.has(deptKey)) {
          department = departmentMap.get(deptKey)!
        } else {
          department = await InventoryDepartment.create({
            name: alloc.departmentName,
            isActive: true
          })
          departmentMap.set(deptKey, department)
        }

        await DeadStockTransaction.create({
          deadStockId: stock.id,
          departmentId: department.id,
          transactionType: 'ISSUE',
          quantity: alloc.qty,
          transactionDate: purchaseDate || DateTime.now(),
          remark: 'Allocated during Bulk Excel Import'
        })
      }

      createdCount++
    }

    return response.ok({
      message: `Successfully imported ${createdCount} stock items with department allocations`,
      count: createdCount
    })
  }

  async show({ params, response }: HttpContext) {
    const stock = await DeadStock.query()
      .where('id', params.id)
      .preload('transactions', (query) => {
        query.preload('department').orderBy('transaction_date', 'desc')
      })
      .firstOrFail()
      
    return response.ok({ data: stock })
  }
}