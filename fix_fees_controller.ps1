$file = 'e:\Internship\CNKHMC\cnkhmc-server\app\controllers\FeesController.ts'
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# 1. Replace all `academic_session_id` DB column references to `academic_year`
#    (in .where/.andWhere/.andWhereIn chains inside the controller logic)
$content = $content -replace "\.andWhere\('academic_session_id',\s*academicSession\.id\)", ".andWhere('academic_year', academic_year)"
$content = $content -replace "\.where\('academic_session_id',\s*academicSession\.id\)", ".where('academic_year', academic_year)"
$content = $content -replace "academic_session_id:\s*academicSession\.id", "academic_year: academic_year"

# 2. Replace remaining academic_session_id column references in .andWhere with their var equivalents
$content = $content -replace "\.andWhere\('academic_session_id',\s*academic_session_id\s+as\s+number\)", ".andWhere('academic_year', academic_year as number)"
$content = $content -replace "\.andWhere\('academic_session_id',\s*academic_session_id\)", ".andWhere('academic_year', academic_year)"
$content = $content -replace "\.where\('academic_session_id',\s*academic_session_id\s+as\s+number\)", ".where('academic_year', academic_year as number)"
$content = $content -replace "\.where\('academic_session_id',\s*academic_session_id\)", ".where('academic_year', academic_year)"

# 3. Rename input variable declarations:
#    academic_session_id -> academic_year (for ctx.request.input('academic_session') and 'academic_session_id')
$content = $content -replace "let academic_session_id = ctx\.request\.input\('academic_session'\)", "let academic_year = ctx.request.input('academic_year')"
$content = $content -replace "let academic_session_id = ctx\.request\.input\('academic_session_id'\)", "let academic_year = ctx.request.input('academic_year')"
$content = $content -replace "let academic_years = ctx\.request\.input\('academic_session'\)", "let academic_year = ctx.request.input('academic_year')"

# 4. Rename AcademicSession.query() var declarations to use academic_year
$content = $content -replace "let academic_years = await AcademicSession\.query\(\)", "// AcademicSession removed - let academic_year = ctx.request.input('academic_year') // was: let academic_years = await AcademicSession.query()"
$content = $content -replace "let academic_session = await AcademicSession\.query\(\)", "// AcademicSession removed // was: let academic_session = await AcademicSession.query()"
$content = $content -replace "let acadamic_session = await AcademicSession\.query\(\)", "// AcademicSession removed // was: let acadamic_session = await AcademicSession.query()"
$content = $content -replace "let academic_year = await AcademicSession\.query\(\)", "// AcademicSession removed // was: let academic_year = await AcademicSession.query()"
$content = $content -replace "let academicSession = await AcademicSession\.query\(\)", "// AcademicSession removed // was: let academicSession = await AcademicSession.query()"
$content = $content -replace "academicSession = await AcademicSession\.query\(\)", "// AcademicSession removed // was: academicSession = await AcademicSession.query()"
$content = $content -replace "let academic_session_id = await AcademicSession\.query\(\)", "// AcademicSession removed // was: let academic_session_id = await AcademicSession.query()"

# 5. Remove type annotation on academicSession variable
$content = $content -replace "let academicSession: AcademicSession \| null = null", "let academic_year = ctx.request.input('academic_year')"

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "Done processing FeesController.ts"
