const fs = require('fs');

const controllers = [
  'LeavesController.ts',
  'PayrollController.ts',
  'QuotaAllocationController.ts',
  'SchoolsController.ts',
  'StudentManagementController.ts',
  'TimeTableController.ts',
  'FeesController.ts',
  'InquiriesController.ts'
];

for (const c of controllers) {
  const file = 'app/controllers/' + c;
  if (!fs.existsSync(file)) continue;
  let lines = fs.readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('import AcademicSession')) { lines[i] = '// ' + l; }
    else if (l.includes('AcademicSession.query')) { lines[i] = '// ' + l; }
    else if (l.includes('await AcademicSession')) { lines[i] = '// ' + l; }
    else if (l.includes('academic_session_id:')) { lines[i] = '// ' + l; }
    else if (l.match(/if\s*\(\!.*session\)/i)) { 
        lines[i] = '// ' + l;
        // if next line is a return or brace, comment it out too, up to 2 lines
        if (lines[i+1] && lines[i+1].includes('return')) {
            lines[i+1] = '// ' + lines[i+1];
            if (lines[i+2] && lines[i+2].includes('}')) {
                lines[i+2] = '// ' + lines[i+2];
            }
        }
    }
  }
  
  if (c === 'PayrollController.ts') {
      let content = lines.join('\n');
      content = content.replace(/salary_component\./g, 'salary_component!.');
      content = content.replace(/staff_salary_template\./g, 'staff_salary_template!.');
      fs.writeFileSync(file, content);
  } else {
      fs.writeFileSync(file, lines.join('\n'));
  }
}
