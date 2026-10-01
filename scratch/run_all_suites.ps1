$suites = @(
  'scratch/verify_stall_category_menu_flow.ps1',
  'scratch/verify_feast_component_flow.ps1',
  'scratch/verify_feast_vendor_catalogs.ps1',
  'scratch/verify_pre_task23_corrections.ps1',
  'scratch/verify_phase5_task22.ps1',
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

$totalTests = 0
$totalPassed = 0
$totalFailed = 0

foreach ($suite in $suites) {
  $out = powershell -ExecutionPolicy Bypass -File $suite 2>&1 | Out-String
  $t = [regex]::Match($out, 'TOTAL TESTS: (\d+)').Groups[1].Value
  $p = [regex]::Match($out, 'PASSED: (\d+)').Groups[1].Value
  $f = [regex]::Match($out, 'FAILED: (\d+)').Groups[1].Value
  $ti = if ($t) { [int]$t } else { 0 }
  $pi = if ($p) { [int]$p } else { 0 }
  $fi = if ($f) { [int]$f } else { 0 }
  $totalTests += $ti
  $totalPassed += $pi
  $totalFailed += $fi
  $status = if ($fi -eq 0) { 'PASS' } else { 'FAIL' }
  Write-Host "[$status] $suite | $pi/$ti"
}

Write-Host ""
Write-Host "=================================="
Write-Host "GRAND TOTAL: $totalTests | PASSED: $totalPassed | FAILED: $totalFailed"
Write-Host "=================================="
