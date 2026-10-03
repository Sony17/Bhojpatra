# Test Phase 2 implementation & verify Phase 1 regressions
$html = [System.IO.File]::ReadAllText("mockups/vendor-registration-v2/index.html")
$js = [System.IO.File]::ReadAllText("mockups/vendor-registration-v2/script.js")
$css = [System.IO.File]::ReadAllText("mockups/vendor-registration-v2/styles.css")

Write-Host "=================================================="
Write-Host "BHOJPATRA V2 ONBOARDING: PHASE 2 VERIFICATION SUITE"
Write-Host "=================================================="

$allPassed = $true

# --- TASK 7: REUSE EXISTING VENDOR SIGNUP DETAILS ---
# 1. Check verified vendor account credentials block exists in HTML
$hasReusedCardDesktop = $html.Contains('vendor-account-reused-card')
$hasReusedCardMobile = $html.Contains('mobile-reused-card')
$hasReusedElements = $html.Contains('id="d-display-owner"') -and $html.Contains('id="d-display-phone"') -and $html.Contains('id="d-display-email"') -and $html.Contains('id="mob-display-owner"')

# 2. Check duplicate inputs for ownerName, phone, and email are removed from view-details
$hasDuplicateOwnerInput = $html.Contains('id="d-owner-name"') -or $html.Contains('data-bind="details.ownerName"')
$hasDuplicatePhoneInput = $html.Contains('id="d-phone"') -or $html.Contains('data-bind="details.phone"')
$hasDuplicateEmailInput = $html.Contains('id="d-email"') -or $html.Contains('data-bind="details.email"')
$noDuplicateInputs = (-not $hasDuplicateOwnerInput) -and (-not $hasDuplicatePhoneInput) -and (-not $hasDuplicateEmailInput)

# 3. Check JS state has account and syncAccountDetailsToUI function
$hasAccountState = $js.Contains('account:') -and $js.Contains('id: "VND-884291"')
$hasSyncFunction = $js.Contains('function syncAccountDetailsToUI()')
$hasReviewAccountDisplay = $js.Contains('${state.account.name}') -and $js.Contains('Linked')

$t7 = $hasReusedCardDesktop -and $hasReusedCardMobile -and $hasReusedElements -and $noDuplicateInputs -and $hasAccountState -and $hasSyncFunction -and $hasReviewAccountDisplay

if ($t7) {
    Write-Host "[PASS] Task 7: Reuse Existing Vendor Signup Details" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 7: Reuse Existing Vendor Signup Details" -ForegroundColor Red
    Write-Host "  Desktop card: $hasReusedCardDesktop, Mobile card: $hasReusedCardMobile, Elements: $hasReusedElements, No duplicate inputs: $noDuplicateInputs (Owner: $hasDuplicateOwnerInput, Phone: $hasDuplicatePhoneInput, Email: $hasDuplicateEmailInput), Account state: $hasAccountState, Sync fn: $hasSyncFunction"
    $allPassed = $false
}

# --- TASK 8: VENDOR OFFERINGS REVISION (Custom Offering Adder Removed Per User Instruction) ---
# 1. Predefined offerings preserved
$hasPredefined = $html.Contains('data-offering-key="catering"') -and $html.Contains('data-offering-key="stall"') -and $html.Contains('data-offering-key="baina"') -and $html.Contains('data-offering-key="counters"') -and $html.Contains('data-offering-key="extras"') -and $html.Contains('data-offering-key="addons"') -and $html.Contains('data-offering-key="essentials"')

# 2. Custom offering adder card removed from view-offerings HTML
$adderCardRemoved = (-not $html.Contains('custom-offering-adder-card')) -and (-not $html.Contains('id="custom-offering-title"')) -and (-not $html.Contains('id="mobile-custom-offering-title"'))

# 3. JS functions exist: addCustomOffering, removeCustomOffering, renderCustomOfferings
$hasAddFn = $js.Contains('function addCustomOffering(')
$hasRemoveFn = $js.Contains('function removeCustomOffering(')
$hasRenderFn = $js.Contains('function renderCustomOfferings()')
$hasCustomOfferingsState = $js.Contains('customOfferings: []')

# 4. Duplicate prevention logic in addCustomOffering
$hasDuplicateCheck = $js.Contains('predefinedNames.includes(title.toLowerCase())') -and $js.Contains('c.title.toLowerCase() === title.toLowerCase()')

# 5. Integration with context header and review and services hub
$hasHeaderIntegration = $js.Contains('state.customOfferings.find(')
$hasReviewIntegration = $js.Contains('Custom Service Offerings')
$hasServicesHubIntegration = $js.Contains('Append Custom Offerings')

$t8 = $hasPredefined -and $adderCardRemoved -and $hasAddFn -and $hasRemoveFn -and $hasRenderFn -and $hasCustomOfferingsState -and $hasDuplicateCheck -and $hasHeaderIntegration -and $hasReviewIntegration -and $hasServicesHubIntegration

if ($t8) {
    Write-Host "[PASS] Task 8: Vendor Offerings Revision (Custom Offering Adder Removed)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 8: Vendor Offerings Revision" -ForegroundColor Red
    Write-Host "  Predefined: $hasPredefined, Adder card removed: $adderCardRemoved, Add fn: $hasAddFn, Remove fn: $hasRemoveFn, Render fn: $hasRenderFn, State: $hasCustomOfferingsState, Duplicate check: $hasDuplicateCheck, Header: $hasHeaderIntegration, Review: $hasReviewIntegration, ServicesHub: $hasServicesHubIntegration"
    $allPassed = $false
}

# --- REGRESSION CHECK: PHASE 1 TASKS 1-6 ---
Write-Host "--- Checking Phase 1 Regressions ---"

# Task 1: Sign in to cutleries
$t1 = $html.Contains('btn-vendor-signin') -and $html.Contains('existing-vendor-signin-banner') -and $html.Contains('id="modal-vendor-signin"') -and $js.Contains('function openVendorSignInModal')
Write-Host ('Phase 1 Task 1 (Sign In): ' + ($(if ($t1) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t1) { 'Green' } else { 'Red' }))

# Task 2: Remove host number
$t2 = (-not $html.Contains('host-contact-link')) -and (-not $html.Contains('+91 94511 23456'))
Write-Host ('Phase 1 Task 2 (No Host Phone): ' + ($(if ($t2) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t2) { 'Green' } else { 'Red' }))

# Task 3: Remove preview storefront from dashboard
$dShellIndex = $html.IndexOf('id="desktop-dashboard-shell"')
$mShellIndex = $html.IndexOf('id="mobile-dashboard-shell"')
$desktopDashHtml = if ($dShellIndex -gt -1) { $html.Substring($dShellIndex, 15000) } else { "" }
$mobileDashHtml = if ($mShellIndex -gt -1) { $html.Substring($mShellIndex, 15000) } else { "" }
$hasDashPreview = $desktopDashHtml.Contains('btn-preview-store') -or $mobileDashHtml.Contains('btn-preview-store') -or $desktopDashHtml.Contains('Preview Storefront') -or $mobileDashHtml.Contains('Preview Storefront')
$t3 = (-not $hasDashPreview) -and (-not $js.Contains('btn-preview-store'))
Write-Host ('Phase 1 Task 3 (No Dash Preview): ' + ($(if ($t3) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t3) { 'Green' } else { 'Red' }))

# Task 4: Stall name optional
$t4 = $html.Contains('Stall Display Brand Name <span class="field-optional">(Optional)</span>') -and (-not $html.Contains('Stall Display Brand Name <span class="required">*</span>'))
Write-Host ('Phase 1 Task 4 (Stall Name Optional): ' + ($(if ($t4) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t4) { 'Green' } else { 'Red' }))

# Task 5: Remove varied delicacies
$t5 = (-not $html.Contains('data-format="varied"')) -and $js.Contains("state.stall.menuType = 'fixed'")
Write-Host ('Phase 1 Task 5 (No Varied Delicacies): ' + ($(if ($t5) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t5) { 'Green' } else { 'Red' }))

# Task 6: Remove step numbers
$hasStepEyebrows = [System.Text.RegularExpressions.Regex]::IsMatch($html, 'class="step-eyebrow">Step \d')
$hasPhasePrefixes = [System.Text.RegularExpressions.Regex]::IsMatch($html, '<option value="view-[^"]*">\d+[A-Z]?\.')
$hasNumberedStepsInJs = [System.Text.RegularExpressions.Regex]::IsMatch($js, "label:\s*'\d+\.")
$t6 = (-not $hasStepEyebrows) -and (-not $hasPhasePrefixes) -and (-not $hasNumberedStepsInJs)
Write-Host ('Phase 1 Task 6 (No Step Numbers): ' + ($(if ($t6) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t6) { 'Green' } else { 'Red' }))

$p1Passed = $t1 -and $t2 -and $t3 -and $t4 -and $t5 -and $t6
if (-not $p1Passed) { $allPassed = $false }

Write-Host "=================================================="
if ($allPassed) {
    Write-Host "ALL PHASE 2 AND REGRESSION TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "SOME TESTS FAILED - REVIEW REQUIRED" -ForegroundColor Red
}
Write-Host "=================================================="
