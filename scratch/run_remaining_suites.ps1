$suites = @(
  'scratch/verify_feast_vendor_catalogs.ps1',
  'scratch/verify_phase5_task21.ps1',
  'scratch/verify_phase4_task20.ps1',
  'scratch/verify_phase4_task19.ps1',
  'scratch/verify_phase4_task18.ps1',
  'scratch/verify_phase4_task17.ps1',
  'scratch/verify_phase3.ps1',
  'scratch/verify_phase2.ps1',
  'scratch/verify_phase1.ps1',
  'scratch/verify_revision_signin_onboarding.ps1'
)

foreach ($suite in $suites) {
  Write-Host "--- $suite"
  $out = powershell -ExecutionPolicy Bypass -File $suite 2>&1 | Out-String
  $lines = $out -split "`n"
  # Print last 3 lines that mention pass/fail/summary
  $summary = ($lines | Where-Object { $_ -match 'PASS|FAIL|passed|failed|summary|Passed|Failed|SUMMARY' } | Select-Object -Last 3) -join ' | '
  Write-Host $summary
  Write-Host ""
}
