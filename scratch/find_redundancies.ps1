$html = Get-Content -Raw "mockups/vendor-registration-v2/index.html"

Write-Host "=== SEARCH FOR SPECIFIC STRINGS ==="
$patterns = @(
    "Sony",
    "stakeholder",
    "Mandatory Initial Gate",
    "Bhojpatra Packages",
    "Selectable Upgrades",
    "Included Service Crew",
    "Regional Scope",
    "Vendor identity is already locked",
    "Sequential single-tier",
    "Directly populates",
    "Need help",
    "Concierge",
    "Architecture Note"
)

foreach ($pat in $patterns) {
    $matches = Select-String -Path "mockups/vendor-registration-v2/index.html" -Pattern $pat
    Write-Host ("Pattern '{0}': {1} match(es)" -f $pat, $matches.Count)
    foreach ($m in $matches) {
        Write-Host ("  Line {0}: {1}" -f $m.LineNumber, $m.Line.Trim())
    }
}
