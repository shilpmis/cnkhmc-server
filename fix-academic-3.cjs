const fs = require('fs');

const files = [
  'app/controllers/TimeTableController.ts',
  'app/controllers/LeavesController.ts',
  'app/controllers/PayrollController.ts',
  'app/controllers/QuotaAllocationController.ts',
  'app/controllers/SchoolsController.ts',
  'app/controllers/StudentManagementController.ts',
  'app/controllers/FeesController.ts',
  'app/controllers/InquiriesController.ts',
  'app/controllers/StaffController.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let lines = fs.readFileSync(file, 'utf8').split('\n');
  let out = [];
  let skip = 0;
  for(let i=0; i<lines.length; i++) {
    let line = lines[i];
    if (skip > 0) {
        skip--;
        continue;
    }
    
    if (line.includes("import AcademicSession from '#models/AcademicSession'")) {
        continue;
    }
    
    if (line.trim().startsWith("academic_session_id:")) {
        continue;
    }

    if (line.includes("await AcademicSession")) {
        let j = i;
        let isMultiLine = false;
        // check if it's a multiline query
        while(j < lines.length && !lines[j].includes('first()') && !lines[j].includes('find(')) {
            j++;
            isMultiLine = true;
            if (j - i > 10) { isMultiLine = false; break; } // stop if too long, maybe not a query
        }
        if (isMultiLine) {
            skip = j - i;
            continue;
        } else {
            // single line
            continue;
        }
    }
    
    if (line.match(/if\s*\(\!\w*session\w*\)\s*\{/i) || line.match(/if\s*\(\!\w*year\w*\)\s*\{/i)) {
        if (line.includes('academic') || line.includes('session')) {
            let braces = 1;
            let j = i + 1;
            while(j < lines.length && braces > 0) {
                if (lines[j].includes('{')) braces++;
                if (lines[j].includes('}')) braces--;
                j++;
            }
            skip = j - 1 - i;
            continue;
        }
    }

    out.push(line);
  }

  let content = out.join('\n');
  
  if (file.includes('PayrollController.ts')) {
      content = content.replace(/salary_component\./g, 'salary_component!.');
      content = content.replace(/staff_salary_template\./g, 'staff_salary_template!.');
  }

  if (file.includes('StudentManagementController.ts')) {
      content = content.replace(/let school_id = ctx\.auth\.user!\.school_id/g, '// let school_id = ctx.auth.user!.school_id');
  }

  if (file.includes('SchoolsController.ts')) {
      content = content.replace(/academicSessions:\s*true,?\r?\n/g, '');
  }

  fs.writeFileSync(file, content);
}
