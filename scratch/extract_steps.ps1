$lines = Get-Content "mockups/vendor-registration-v2/index.html"

# Function to get step slice
function Get-StepSlice($startStep, $endStep) {
    $recording = $false
    $output = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "data-step-id=`"$startStep`"") {
            $recording = $true
        }
        if ($recording) {
            $output += ("{0,4}: {1}" -f ($i+1), $lines[$i])
        }
        if ($recording -and $lines[$i] -match "data-step-id=`"$endStep`"" -and $startStep -ne $endStep) {
            break
        }
    }
    return $output
}

# View 1: view-details
Get-StepSlice "view-details" "view-kyc" | Select-Object -First 100 | Out-File -FilePath "scratch/step_details.txt" -Encoding utf8
Write-Host "Wrote step_details.txt"
