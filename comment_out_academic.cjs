const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // For models, remove belongsTo and hasMany relations related to AcademicSession
  if (filePath.includes(path.join('app', 'models'))) {
    content = content.replace(/@belongsTo\(\(\) => AcademicSession.*?\}\)/gs, '');
    content = content.replace(/declare academic_session: .*?AcademicSession>/g, '');
    content = content.replace(/@hasMany\(\(\) => AcademicSession.*?\}\)/gs, '');
    content = content.replace(/declare academicSessions: .*?AcademicSession>/g, '');
  }

  // Comment out lines containing AcademicSession in controllers and models
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('AcademicSession') && !lines[i].trim().startsWith('//')) {
      // Find where the statement ends (rudimentary check for multi-line queries)
      lines[i] = '// ' + lines[i];
      let j = i + 1;
      while (j < lines.length && (lines[j].trim().startsWith('.') || lines[j].trim().startsWith('// .'))) {
        if (!lines[j].trim().startsWith('//')) {
          lines[j] = '// ' + lines[j];
        }
        j++;
      }
    }
  }
  content = lines.join('\n');

  // Specific fix for duplicate academic_year declarations that might be caused by commenting out
  // This is a naive approach but works for many of the issues.
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

traverse(path.join(process.cwd(), 'app'));
