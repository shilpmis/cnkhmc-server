import fs from 'fs';
import path from 'path';

function removeAcademicSessionImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      removeAcademicSessionImports(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      // Remove imports
      content = content.replace(/^import\s+.*?AcademicSession.*?(?:'|");?\r?\n/gm, '');
      // Remove any trailing empty imports just in case
      content = content.replace(/^import\s+{\s*}\s+from\s+.*?AcademicSession.*?(?:'|");?\r?\n/gm, '');
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

removeAcademicSessionImports(path.join(process.cwd(), 'app'));
removeAcademicSessionImports(path.join(process.cwd(), 'database'));
removeAcademicSessionImports(path.join(process.cwd(), 'bin'));
// also do it for any file in root directory like test-query.ts
const rootFiles = fs.readdirSync(process.cwd());
for (const file of rootFiles) {
  if (file.endsWith('.ts') && fs.statSync(file).isFile()) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    content = content.replace(/^import\s+.*?AcademicSession.*?(?:'|");?\r?\n/gm, '');
    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log(`Updated root file ${file}`);
    }
  }
}
