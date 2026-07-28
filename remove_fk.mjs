import fs from 'fs';
import path from 'path';

function removeForeignKeys(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      removeForeignKeys(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      // Matches multi-line or single-line references to academic_sessions
      content = content.replace(/\.references\(['"]id['"]\)\s*\.inTable\(['"]academic_sessions['"]\)(\s*\.onDelete\(['"]CASCADE['"]\))?(\s*\.onUpdate\(['"]CASCADE['"]\))?/g, '');
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

removeForeignKeys(path.join(process.cwd(), 'database', 'migrations'));
