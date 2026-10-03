# Test Phase 1 implementation directly on the prototype files
$html = [System.IO.File]::ReadAllText("mockups/vendor-registration-v2/index.html")
$js = [System.IO.File]::ReadAllText("mockups/vendor-registration-v2/script.js")
$css = [System.IO.File]::ReadAllText("mockups/vendor-registration-v2/styles.css")

Write-Host "=================================================="
Write-Host "BHOJPATRA V2 ONBOARDING: PHASE 1 VERIFICATION SUITE"
Write-Host "=================================================="

$allPassed = $true

# 1. Add Sign In to Cutleries
$hasSignInBtn = $html.Contains('btn-vendor-signin')
$hasSignInBanner = $html.Contains('existing-vendor-signin-banner')
$hasSignInModal = $html.Contains('id="modal-vendor-signin"')
$hasSignInJs = $js.Contains('function openVendorSignInModal') -and $js.Contains('function handleVendorSignIn')
$hasSignInCss = $css.Contains('.btn-vendor-signin') -and $css.Contains('.existing-vendor-signin-banner')
$t1 = $hasSignInBtn -and $hasSignInBanner -and $hasSignInModal -and $hasSignInJs -and $hasSignInCss

if ($t1) {
    Write-Host "[PASS] Task 1: Add Sign In to Cutleries" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 1: Add Sign In to Cutleries" -ForegroundColor Red
    $allPassed = $false
}

# 2. Remove Host Number from Dashboard
$hasHostPhoneLink = $html.Contains('host-contact-link') -or $html.Contains('+91 94511 23456')
$t2 = -not $hasHostPhoneLink

if ($t2) {
    Write-Host "[PASS] Task 2: Remove Host Number from Dashboard" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 2: Remove Host Number from Dashboard" -ForegroundColor Red
    $allPassed = $false
}

# 3. Remove Preview Storefront from Dashboard
# Target the desktop and mobile dashboard shells specifically
$dShellIndex = $html.IndexOf('id="desktop-dashboard-shell"')
$mShellIndex = $html.IndexOf('id="mobile-dashboard-shell"')

$desktopDashHtml = if ($dShellIndex -gt -1) { $html.Substring($dShellIndex, 15000) } else { "" }
$mobileDashHtml = if ($mShellIndex -gt -1) { $html.Substring($mShellIndex, 15000) } else { "" }

$hasDashPreviewInHtml = $desktopDashHtml.Contains('btn-preview-store') -or $mobileDashHtml.Contains('btn-preview-store') -or $desktopDashHtml.Contains('Preview Storefront') -or $mobileDashHtml.Contains('Preview Storefront')
$hasJsDashPreviewStore = $js.Contains('btn-preview-store')
$t3 = (-not $hasDashPreviewInHtml) -and (-not $hasJsDashPreviewStore)

if ($hasDashPreviewInHtml) {
    Write-Host "Found Preview Storefront inside dashboard shells" -ForegroundColor Yellow
}
if ($hasJsDashPreviewStore) {
    Write-Host "Found btn-preview-store in script.js" -ForegroundColor Yellow
}

if ($t3) {
    Write-Host "[PASS] Task 3: Remove Preview Storefront from Dashboard" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 3: Remove Preview Storefront from Dashboard" -ForegroundColor Red
    $allPassed = $false
}

# 4. Make Stall Identity Display Name Optional
$hasOptionalLabel = $html.Contains('Stall Display Brand Name <span class="field-optional">(Optional)</span>')
$hasRequiredStallName = $html.Contains('Stall Display Brand Name <span class="required">*</span>')
$hasJsFallback = $js.Contains('state.stall.stallName ||')
$t4 = $hasOptionalLabel -and (-not $hasRequiredStallName) -and $hasJsFallback

if ($t4) {
    Write-Host "[PASS] Task 4: Make Stall Identity Display Name Optional" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 4: Make Stall Identity Display Name Optional" -ForegroundColor Red
    $allPassed = $false
}

# 5. Remove Varied Delicacies from Stall Identity
$hasVariedCard = $html.Contains('data-format="varied"')
$hasFixedEnforced = $js.Contains("state.stall.menuType = 'fixed'")
$t5 = (-not $hasVariedCard) -and $hasFixedEnforced

if ($t5) {
    Write-Host "[PASS] Task 5: Remove Varied Delicacies from Stall Identity" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 5: Remove Varied Delicacies from Stall Identity" -ForegroundColor Red
    $allPassed = $false
}

# 6. Remove Onboarding Step Numbers
$hasStepEyebrows = [System.Text.RegularExpressions.Regex]::IsMatch($html, 'class="step-eyebrow">Step \d')
$hasPhasePrefixes = [System.Text.RegularExpressions.Regex]::IsMatch($html, '<option value="view-[^"]*">\d+[A-Z]?\.')
$hasNumberedStepsInJs = [System.Text.RegularExpressions.Regex]::IsMatch($js, "label:\s*'\d+\.")
$t6 = (-not $hasStepEyebrows) -and (-not $hasPhasePrefixes) -and (-not $hasNumberedStepsInJs)

if ($t6) {
    Write-Host "[PASS] Task 6: Remove Onboarding Step Numbers" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 6: Remove Onboarding Step Numbers (Eyebrows: $hasStepEyebrows, Prefixes: $hasPhasePrefixes, JS: $hasNumberedStepsInJs)" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "=================================================="
if ($allPassed) {
    Write-Host "ALL 6 PHASE 1 TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
} else {
    Write-Host "SOME TESTS FAILED - REVIEW REQUIRED" -ForegroundColor Red
}
Write-Host "=================================================="
