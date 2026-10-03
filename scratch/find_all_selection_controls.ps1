$html = Get-Content 'mockups/vendor-registration-v2/index.html' -Raw

Write-Host "=== All classes with card, select, chip, box, check ==="
$matches = [regex]::Matches($html, 'class="([^"]*(?:card|select|chip|check|box|option|pill|item)[^"]*)"')
$classes = @{}
foreach ($m in $matches) {
    $c = $m.Groups[1].Value
    $classes[$c] = ($classes[$c] + 1)
}
$classes.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 40 | ForEach-Object {
    Write-Host "$($_.Key): $($_.Value)"
}
