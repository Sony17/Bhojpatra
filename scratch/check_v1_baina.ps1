$matches = Select-String -Path "mockups/vendor-registration/index.html" -Pattern 'baina'
Write-Host "Matches in V1 index.html: $($matches.Count)"
foreach ($m in $matches) {
    Write-Host "$($m.LineNumber): $($m.Line.Trim())"
}
