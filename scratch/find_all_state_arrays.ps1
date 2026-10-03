$js = Get-Content 'mockups/vendor-registration-v2/script.js' -Raw

Write-Host "Searching for all arrays or objects in state:"
$matches = [regex]::Matches($js, '([a-zA-Z0-9_]+)\s*:\s*(\[[^\]]*\])')
foreach ($m in $matches) {
    if ($m.Groups[2].Value.Length -lt 200) {
        Write-Host "  $($m.Groups[1].Value): $($m.Groups[2].Value)"
    } else {
        Write-Host "  $($m.Groups[1].Value): [length $($m.Groups[2].Value.Length)]"
    }
}
