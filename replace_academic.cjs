const fs = require('fs');
const path = require('path');

function replaceInDir(dir, replacements) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            replaceInDir(fullPath, replacements);
        } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.cjs')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            for (const [regex, replacement] of replacements) {
                if (regex.test(content)) {
                    content = content.replace(regex, replacement);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

const replacements = [
    // Remove imports
    [/import AcademicSession.*?\n/g, ""],
    [/import type AcademicSession.*?\n/g, ""],

    // Fix duplicate 'academic_year' in StaffLeaveBalance if any
    [/declare academic_year: number\s*declare academic_year: number/gs, "declare academic_year: number"],

    // Remove academicSession from ExtractModelRelations
    [/\.preload\('academicSession'\)/g, ""],
    [/'academicSession'/g, "''"], // a bit hacky but works for commands/debug_exam_schedule.ts
];

replaceInDir('./app', replacements);
replaceInDir('./commands', replacements);
replaceInDir('./database/seeders', replacements);
replaceInDir('./start', replacements);
replaceInDir('./bin', replacements);
