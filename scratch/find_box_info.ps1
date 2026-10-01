$html = Get-Content 'mockups/vendor-registration-v2/index.html' -Raw
$js = Get-Content 'mockups/vendor-registration-v2/script.js' -Raw
$css = Get-Content 'mockups/vendor-registration-v2/styles.css' -Raw

Write-Host "--- CSS classes matching 'box' ---"
$cssMatches = [regex]::Matches($css, '\.([a-zA-Z0-9_-]*box[a-zA-Z0-9_-]*)')
$cssBoxes = @{}
foreach ($m in $cssMatches) { $cssBoxes[$m.Groups[1].Value] = $true }
foreach ($k in ($cssBoxes.Keys | Sort-Object)) { Write-Host "  $k" }

Write-Host "`n--- HTML classes matching 'box' ---"
$htmlMatches = [regex]::Matches($html, 'class="([^"]*box[^"]*)"')
$htmlBoxes = @{}
foreach ($m in $htmlMatches) { $htmlBoxes[$m.Groups[1].Value] = $true }
foreach ($k in ($htmlBoxes.Keys | Sort-Object)) { Write-Host "  $k" }

Write-Host "`n--- Functions in script.js ---"
$fnMatches = [regex]::Matches($js, 'function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)')
foreach ($m in $fnMatches) {
    if ($m.Groups[1].Value -match 'toggle|set|select|add|remove|save|delete|check') {
        Write-Host "  $($m.Value)"
    }
}
