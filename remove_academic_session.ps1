$files = @(
  'e:\Internship\CNKHMC\cnkhmc-server\app\controllers\InquiriesController.ts',
  'e:\Internship\CNKHMC\cnkhmc-server\app\controllers\QuotaAllocationController.ts',
  'e:\Internship\CNKHMC\cnkhmc-server\app\controllers\PayrollController.ts',
  'e:\Internship\CNKHMC\cnkhmc-server\app\controllers\FeesController.ts'
)

foreach ($file in $files) {
  $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
  
  # Remove the AcademicSession import line (handle both CRLF and LF)
  $content = $content -replace "import AcademicSession from '#models/AcademicSession'\r\n", ''
  $content = $content -replace "import AcademicSession from '#models/AcademicSession'\n", ''
  
  [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
  Write-Host "Processed: $file"
}

Write-Host "Done. Import lines removed from all 4 files."
