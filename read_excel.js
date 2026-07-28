import ExcelJS from 'exceljs';

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('C:\\Users\\Divyam Desai\\Downloads\\Dead Stock Register.xlsx');
  
  workbook.eachSheet(function(worksheet, sheetId) {
    console.log(`Sheet: ${worksheet.name}`);
    
    // Read first 5 rows
    for (let i = 1; i <= 5; i++) {
        const row = worksheet.getRow(i).values;
        if (row && row.length > 0) {
            console.log(`Row ${i}: ${JSON.stringify(row)}`);
        }
    }
    console.log('---');
  });
}

main().catch(console.error);
