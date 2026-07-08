$filePath = "d:\AUDIT_APP\app.js"
$lines = [System.IO.File]::ReadAllLines($filePath)
# Keep lines 1..3499 (0-indexed: 0..3498) and 3676..end (0-indexed: 3675..end)
$newLines = $lines[0..3498] + $lines[3675..($lines.Length - 1)]
[System.IO.File]::WriteAllLines($filePath, $newLines, [System.Text.Encoding]::UTF8)
Write-Host "Done. Total lines: $($newLines.Length)"
