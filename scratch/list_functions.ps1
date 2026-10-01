$content = Get-Content 'mockups/vendor-registration-v2/script.js' -Raw

$functionMatches = [regex]::Matches($content, 'function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)')
Write-Host "Total functions in script.js: $($functionMatches.Count)"
foreach ($m in $functionMatches) {
    Write-Host "$($m.Groups[1].Value)($($m.Groups[2].Value))"
}
