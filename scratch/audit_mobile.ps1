$lines = Get-Content "mockups/vendor-registration-v2/index.html"

# Mobile starts around line 2120
for ($i = 2120; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -match 'data-step-id="([^"]+)"') {
        $stepId = $matches[1]
        $lineNum = $i + 1
        $eyebrow = ""
        $heading = ""
        $subtext = ""
        for ($j = $i; $j -lt [Math]::Min($lines.Count, $i + 12); $j++) {
            if ($lines[$j] -match 'class="step-eyebrow">([^<]+)<') { $eyebrow = $matches[1].Trim() }
            if ($lines[$j] -match 'class="step-heading">([^<]+)<') { $heading = $matches[1].Trim() }
            if ($lines[$j] -match 'class="step-subtext">([^<]+)<') { $subtext = $matches[1].Trim() }
        }
        Write-Host ("Mobile Line {0}: {1} | {2} | {3}" -f $lineNum, $stepId, $eyebrow, $heading)
        if ($subtext) { Write-Host ("       Subtext: {0}" -f $subtext) }
    }
}
