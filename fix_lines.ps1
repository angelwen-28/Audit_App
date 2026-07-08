$filePath = "d:\AUDIT_APP\app.js"
$lines = [System.IO.File]::ReadAllLines($filePath)
# Remove lines 3613..4005 (1-indexed) = indices 3612..4004 (0-indexed)
$newLines = $lines[0..3611] + $lines[4005..($lines.Length - 1)]
[System.IO.File]::WriteAllLines($filePath, $newLines, [System.Text.Encoding]::UTF8)
Write-Host "Done. Total lines: $($newLines.Length)"
