$html = Get-Content -Raw "mockups/vendor-registration-v2/index.html"
$lines = Get-Content "mockups/vendor-registration-v2/index.html"

Write-Host "Total lines in index.html:" $lines.Count

# Find all step containers with line numbers
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -match 'data-step-id="([^"]+)"') {
        $stepId = $matches[1]
        $lineNum = $i + 1
        # Check next 10 lines for eyebrow, heading, subtext
        $eyebrow = ""
        $heading = ""
        $subtext = ""
        for ($j = $i; $j -lt [Math]::Min($lines.Count, $i + 12); $j++) {
            if ($lines[$j] -match 'class="step-eyebrow">([^<]+)<') { $eyebrow = $matches[1].Trim() }
            if ($lines[$j] -match 'class="step-heading">([^<]+)<') { $heading = $matches[1].Trim() }
            if ($lines[$j] -match 'class="step-subtext">([^<]+)<') { $subtext = $matches[1].Trim() }
        }
        Write-Host ("Line {0}: Step ID: {1} | Eyebrow: {2} | Heading: {3}" -f $lineNum, $stepId, $eyebrow, $heading)
        if ($subtext) {
            Write-Host ("         Subtext: {0}" -f $subtext)
        }
    }
}
