$js = [System.IO.File]::ReadAllText('mockups/vendor-registration-v2/script.js')
$hasDef = $js.Contains('function setupEventListeners()')
$hasDelegator = $js.Contains("e.target.closest('.choice-chip')")
$hasToggle = $js.Contains('toggleChoiceChip(chip);')
$hasKeydown = $js.Contains("e.key === 'Enter'")

Write-Host "setupEventListeners defined: $hasDef"
Write-Host "Click Delegator present: $hasDelegator"
Write-Host "toggleChoiceChip called: $hasToggle"
Write-Host "Keyboard Delegator present: $hasKeydown"

if ($hasDef -and $hasDelegator -and $hasToggle) {
    Write-Host "ALL CHIP EVENT LISTENER CHECKS PASSED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "CHECK FAILED" -ForegroundColor Red
    exit 1
}
