$mapping = Select-String -Path "mockups/vendor-registration-v2/STOREFRONT_ONBOARDING_MAPPING.md" -Pattern 'box' -CaseSensitive:$false
Write-Host "STOREFRONT_ONBOARDING_MAPPING.md:"
foreach ($m in $mapping) {
    Write-Host "  $($m.LineNumber): $($m.Line.Trim())"
}

$decisions = Select-String -Path "mockups/vendor-registration-v2/DESIGN_DECISIONS.md" -Pattern 'box' -CaseSensitive:$false
Write-Host "`nDESIGN_DECISIONS.md:"
foreach ($m in $decisions) {
    Write-Host "  $($m.LineNumber): $($m.Line.Trim())"
}
