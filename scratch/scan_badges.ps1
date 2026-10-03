$lines = Get-Content "mockups/vendor-registration-v2/index.html"

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'class="[^"]*badge[^"]*"') {
        Write-Host ("Line {0}: {1}" -f ($i + 1), $lines[$i].Trim())
    }
}
