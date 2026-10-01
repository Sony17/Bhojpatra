$matches = Select-String -Path 'mockups/vendor-registration-v2/index.html' -Pattern 'box'
Write-Host "Total matches in index.html: $($matches.Count)"
$matches | Select-Object -First 50 | ForEach-Object {
    Write-Host "$($_.LineNumber): $($_.Line.Trim())"
}

$scriptMatches = Select-String -Path 'mockups/vendor-registration-v2/script.js' -Pattern 'box'
Write-Host "Total matches in script.js: $($scriptMatches.Count)"
$scriptMatches | Select-Object -First 50 | ForEach-Object {
    Write-Host "$($_.LineNumber): $($_.Line.Trim())"
}
