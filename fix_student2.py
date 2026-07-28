import sys
import re

file_path = 'app/controllers/StudentManagementController.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove import
content = re.sub(r'import AcademicSession from \'#models/AcademicSession\'\r?\n', '', content)

# 2. Update schema from source_academic_session_id to source_academic_year
content = re.sub(r'source_academic_session_id:\s*schema\.number\(\)', 'source_academic_year: schema.number()', content)
content = re.sub(r'target_academic_session_id:\s*schema\.number\(\)', 'target_academic_year: schema.number()', content)
content = re.sub(r'academic_session_id:\s*schema\.number\(\)', 'academic_year: schema.number()', content)

# 3. Rename any query implicitly has 'any' type in the .if statements
content = re.sub(r'\(query\) => query\.where\(\'school_id\'', '(query: any) => query.where(\'school_id\'', content)

# 4. Remove active_academic_session checks
content = re.sub(
    r'let active_academic_session = await AcademicSession\.query\(\)[\s\S]*?\.first\(\)[\s\S]*?if \(!active_academic_session\) \{[\s\S]*?\}',
    'let active_academic_session = { id: 2026 };',
    content
)

# 5. Remove check_academic_session blocks
content = re.sub(
    r'let check_academic_session = await AcademicSession\.query\(\)[\s\S]*?\.first\(\)[\s\S]*?if \(!check_academic_session\) \{[\s\S]*?\}',
    '',
    content
)

# 6. Remove AcademicSession.query() from Promise.all in promote/demote functions
content = re.sub(
    r'AcademicSession\.query\(\)\s*\.where\(\'id\', payload\.source_academic_year\)\s*\.if\(school_id !== undefined, \(query: any\) => query\.where\(\'school_id\', school_id!\)\)\s*\.first\(\),',
    '',
    content
)
content = re.sub(
    r'AcademicSession\.query\(\)\s*\.where\(\'id\', payload\.target_academic_year\)\s*\.if\(school_id !== undefined, \(query: any\) => query\.where\(\'school_id\', school_id!\)\)\s*\.first\(\),',
    '',
    content
)
content = re.sub(
    r'AcademicSession\.query\(\)\s*\.where\(\'id\', payload\.source_academic_year\)\s*\.andWhere\(\'school_id\', school_id!\)\s*\.first\(\),',
    '',
    content
)
content = re.sub(
    r'AcademicSession\.query\(\)\s*\.where\(\'id\', payload\.target_academic_year\)\s*\.andWhere\(\'school_id\', school_id!\)\s*\.first\(\),',
    '',
    content
)
content = re.sub(
    r'const session = await AcademicSession\.query\(\)[\s\S]*?\.first\(\)[\s\S]*?if \(!session\) \{[\s\S]*?\}',
    '',
    content
)
content = re.sub(
    r'const targetSession = await AcademicSession\.query\(\)[\s\S]*?\.first\(\)[\s\S]*?if \(!targetSession\) \{[\s\S]*?\}',
    '',
    content
)
# Cleanup the Promise.all destructuring
content = re.sub(
    r'const \[sourceSession, targetSession, sourceDivision, targetDivision\] = await Promise\.all\(\[',
    'const [sourceDivision, targetDivision] = await Promise.all([',
    content
)
content = re.sub(
    r'const \[sourceSession, targetSession\] = await Promise\.all\(\[',
    'const [] = await Promise.all([',
    content
)
content = re.sub(r'if \(!sourceSession\) return response\.badRequest\(\{ message: \'Source session not found\' \}\)', '', content)
content = re.sub(r'if \(!targetSession\) return response\.badRequest\(\{ message: \'Target session not found\' \}\)', '', content)

# 7. Update student_enrollment fields
content = content.replace('student_enrollment.academic_session_id', 'student_enrollment.academic_year')
content = content.replace('.where(\'academic_session_id\'', '.where(\'academic_year\'')
content = content.replace('.andWhere(\'academic_session_id\'', '.andWhere(\'academic_year\'')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updates completed successfully.")
