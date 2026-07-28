import * as ExcelJS from 'exceljs';

async function test() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('C:\\Users\\Divyam Desai\\Downloads\\SURGERY 2nd year LP 25 26 DONE.xlsx');
  const worksheet = workbook.worksheets[0];
  
  let headerRowNum = -1;
  for (let i = 1; i <= Math.min(10, worksheet.rowCount); i++) {
    const row = worksheet.getRow(i);
    let cellVals = [];
    for(let j=1; j<=20; j++) cellVals.push(row.getCell(j).value);
    if (cellVals.some(v => v && String(v).toLowerCase().includes('topic'))) {
      headerRowNum = i;
      break;
    }
  }
  
  console.log("Header row:", headerRowNum);
  if (headerRowNum === -1) return;
  
  let totalHours = 0;
  
  const colMap: any = { hours: 0 };
  const headerRow = worksheet.getRow(headerRowNum);
  for (let c = 1; c <= 20; c++) {
    const val = headerRow.getCell(c).value;
    if (val && String(val).toLowerCase().includes('hour')) colMap.hours = c;
  }
  console.log("Hours col:", colMap.hours);
  
  for (let r = headerRowNum + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const cell = row.getCell(colMap.hours);
    
    // getCellValue logic
    let raw = '';
    if (cell.type === ExcelJS.ValueType.Merge) {
      raw = '';
    } else {
      const val = cell.value;
      if (val === null || val === undefined) raw = '';
      else if (typeof val === 'string') raw = val.trim();
      else if (typeof val === 'number' || typeof val === 'boolean') raw = String(val).trim();
      else if (typeof val === 'object' && 'result' in val) raw = String((val as any).result).trim();
      else raw = String(val);
    }
    
    const hours = parseFloat(raw) || 0;
    if (hours > 0) {
      console.log(`Row ${r}: type=${cell.type}, isMerged=${cell.isMerged}, raw=${raw}, hours=${hours}`);
      totalHours += hours;
    }
  }
  
  console.log("Total Hours:", totalHours);
}
test().catch(console.error);
