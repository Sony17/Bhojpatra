# Test Phase 3 implementation & verify Phase 1 & 2 regressions
$html = [System.IO.File]::ReadAllText("mockups/vendor-registration-v2/index.html", [System.Text.Encoding]::UTF8)
$js = [System.IO.File]::ReadAllText("mockups/vendor-registration-v2/script.js", [System.Text.Encoding]::UTF8)
$css = [System.IO.File]::ReadAllText("mockups/vendor-registration-v2/styles.css", [System.Text.Encoding]::UTF8)

Write-Host "=================================================="
Write-Host "BHOJPATRA V2 ONBOARDING: PHASE 3 VERIFICATION SUITE"
Write-Host "=================================================="

$allPassed = $true

# --- TASK 9: ADD CUSTOM CUISINE ---
$hasDesktopCuisineAdder = $html.Contains('id="desktop-input-custom-cuisine"') -and $html.Contains('btn-add-custom-cuisine')
$hasMobileCuisineAdder = $html.Contains('id="mobile-input-custom-cuisine"')
$hasPredefinedCuisines = $html.Contains('data-cuisine="Awadhi"') -and $html.Contains('data-cuisine="Mughlai"') -and $html.Contains('data-cuisine="North Indian"')
$hasAddCuisineFn = $js.Contains('function addCustomCuisine(') -and $js.Contains('state.details.cuisines.push(')
$hasReviewCuisines = $js.Contains('state.details.cuisines.join(')
$t9 = $hasDesktopCuisineAdder -and $hasMobileCuisineAdder -and $hasPredefinedCuisines -and $hasAddCuisineFn -and $hasReviewCuisines

if ($t9) {
    Write-Host "[PASS] Task 9: Add Custom Cuisine" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 9: Add Custom Cuisine" -ForegroundColor Red
    Write-Host "  Desktop adder: $hasDesktopCuisineAdder, Mobile adder: $hasMobileCuisineAdder, Predefined: $hasPredefinedCuisines, Add fn: $hasAddCuisineFn, Review: $hasReviewCuisines"
    $allPassed = $false
}

# --- TASK 10: ADD SERVICEABLE CITIES ---
$hasDesktopCityGroup = $html.Contains('id="desktop-service-cities-grid"') -and $html.Contains('id="desktop-input-custom-city"')
$hasMobileCityGroup = $html.Contains('id="mobile-service-cities-grid"') -and $html.Contains('id="mobile-input-custom-city"')
$hasPredefinedCities = $html.Contains('data-city="Lucknow"') -and $html.Contains('data-city="Kanpur"') -and $html.Contains('data-city="Ayodhya"') -and $html.Contains('data-city="Varanasi"')
$hasAddCityFn = $js.Contains('function addCustomCity(') -and $js.Contains('state.details.serviceCities.push(')
$hasReviewCities = $js.Contains('state.details.serviceCities.join(')
$t10 = $hasDesktopCityGroup -and $hasMobileCityGroup -and $hasPredefinedCities -and $hasAddCityFn -and $hasReviewCities

if ($t10) {
    Write-Host "[PASS] Task 10: Add Serviceable Cities" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 10: Add Serviceable Cities" -ForegroundColor Red
    Write-Host "  Desktop group: $hasDesktopCityGroup, Mobile group: $hasMobileCityGroup, Predefined: $hasPredefinedCities, Add fn: $hasAddCityFn, Review: $hasReviewCities"
    $allPassed = $false
}

# --- TASK 11: ADD MINIMUM PREPARATION NOTICE ---
$hasDesktopNotice = $html.Contains('id="cat-lead-hours"') -and $html.Contains('Minimum Preparation Notice')
$hasMobileNotice = $html.Contains('id="mob-cat-lead-hours"')
$hasNoticeOptions = $html.Contains('value="24"') -and $html.Contains('value="48"') -and $html.Contains('value="72"') -and $html.Contains('value="168"')
$hasNoticeBinding = $html.Contains('data-bind="catering.leadHours"')
$hasNoticeReview = $js.Contains('${state.catering.leadHours}')
$t11 = $hasDesktopNotice -and $hasMobileNotice -and $hasNoticeOptions -and $hasNoticeBinding -and $hasNoticeReview

if ($t11) {
    Write-Host "[PASS] Task 11: Add Minimum Preparation Notice" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 11: Add Minimum Preparation Notice" -ForegroundColor Red
    Write-Host "  Desktop select: $hasDesktopNotice, Mobile select: $hasMobileNotice, Options: $hasNoticeOptions, Binding: $hasNoticeBinding, Review: $hasNoticeReview"
    $allPassed = $false
}

# --- TASK 12: ADD NEW CATEGORY TO STALL IDENTITY ---
$hasDesktopNewCatBtn = $html.Contains('id="btn-desktop-new-cat"') -and $html.Contains('NEW CATEGORY')
$hasMobileNewCatBtn = $html.Contains('id="btn-mobile-new-cat"')
$hasSpecialtySelect = $html.Contains('id="desktop-stall-specialty"') -and $html.Contains('id="mobile-stall-specialty"')
$hasCatAdderBox = $html.Contains('id="desktop-new-cat-box"') -and $html.Contains('id="mobile-new-cat-box"')
$hasNewCatFns = $js.Contains('function submitNewStallCategory(') -and $js.Contains('function toggleNewCategoryBox(')
$isIsolatedFromOfferings = $js.Contains('state.stall.customCategories.push(') -and (-not ($js.Contains('state.customOfferings.push(catName)')))
$hasReviewSpecialty = $js.Contains('${state.stall.specialty}')
$t12 = $hasDesktopNewCatBtn -and $hasMobileNewCatBtn -and $hasSpecialtySelect -and $hasCatAdderBox -and $hasNewCatFns -and $isIsolatedFromOfferings -and $hasReviewSpecialty

if ($t12) {
    Write-Host "[PASS] Task 12: Add New Category to Stall Identity" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 12: Add New Category to Stall Identity" -ForegroundColor Red
    Write-Host "  Desktop btn: $hasDesktopNewCatBtn, Mobile btn: $hasMobileNewCatBtn, Select: $hasSpecialtySelect, Adder box: $hasCatAdderBox, Fns: $hasNewCatFns, Isolated: $isIsolatedFromOfferings, Review: $hasReviewSpecialty"
    $allPassed = $false
}

# --- TASK 13: ADD LIVE COUNTERS TO FEAST ---
$hasDesktopLiveView = $html.Contains('data-step-id="view-cat-live"') -and $html.Contains('Select live food & beverage counters for feast')
$hasMobileLiveView = $html.Contains('data-counter-id="chinese"') -and $html.Contains('data-counter-id="dessert"')
$hasCountersCatalog = $html.Contains('data-counter-id="chaat"') -and $html.Contains('data-counter-id="live"') -and $html.Contains('data-counter-id="pan"') -and $html.Contains('data-counter-id="pizza"')
$hasLiveCounterToggle = $js.Contains('function toggleLiveCounter(') -and $js.Contains('state.catering.liveCounters')
$hasFeastLiveReview = $js.Contains('Live Counters (${activeLiveCounters.length}):')
$t13 = $hasDesktopLiveView -and $hasMobileLiveView -and $hasCountersCatalog -and $hasLiveCounterToggle -and $hasFeastLiveReview

if ($t13) {
    Write-Host "[PASS] Task 13: Add Live Counters to Feast" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 13: Add Live Counters to Feast" -ForegroundColor Red
    Write-Host "  Desktop view: $hasDesktopLiveView, Mobile view: $hasMobileLiveView, Counters: $hasCountersCatalog, Toggle fn: $hasLiveCounterToggle, Feast Review: $hasFeastLiveReview"
    $allPassed = $false
}

# --- TASK 14: ADD EXTRAS TO FEAST ---
$hasDesktopExtrasView = $html.Contains('Feast Hospitality Extras') -and $html.Contains('data-extra-id="mocktail"') -and $html.Contains('data-extra-id="hi-tea"') -and $html.Contains('data-extra-id="decor"') -and $html.Contains('data-extra-id="sound"')
$hasMobileExtrasView = $html.Contains('toggleFeastExtra(')
$hasExtrasFn = $js.Contains('function toggleFeastExtra(') -and $js.Contains('state.catering.extras')
$hasFeastExtrasReview = $js.Contains('Feast Hospitality Extras (${(state.catering.extras')
$t14 = $hasDesktopExtrasView -and $hasMobileExtrasView -and $hasExtrasFn -and $hasFeastExtrasReview

if ($t14) {
    Write-Host "[PASS] Task 14: Add Extras to Feast" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 14: Add Extras to Feast" -ForegroundColor Red
    Write-Host "  Desktop view: $hasDesktopExtrasView, Mobile view: $hasMobileExtrasView, Toggle fn: $hasExtrasFn, Feast Review: $hasFeastExtrasReview"
    $allPassed = $false
}

# --- TASK 15: ADD ESSENTIALS TO FEAST ---
$hasDesktopEssentials = $html.Contains('data-essential-key="staff"') -and $html.Contains('data-essential-key="buffetTables"') -and $html.Contains('data-essential-key="foodLabels"') -and $html.Contains('data-essential-key="handwashStation"') -and $html.Contains('data-essential-key="wasteBins"') -and $html.Contains('data-essential-key="hygieneCrew"')
$hasMobileEssentials = $html.Contains('id="mobile-feast-essentials-row"')
$hasEssentialsFn = $js.Contains('function toggleFeastEssential(') -and $js.Contains('state.catering.serviceInclusions')
$hasFeastEssentialsReview = $js.Contains('Service Crew & Hygiene Essentials:')
$t15 = $hasDesktopEssentials -and $hasMobileEssentials -and $hasEssentialsFn -and $hasFeastEssentialsReview

if ($t15) {
    Write-Host "[PASS] Task 15: Add Essentials to Feast" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 15: Add Essentials to Feast" -ForegroundColor Red
    Write-Host "  Desktop view: $hasDesktopEssentials, Mobile view: $hasMobileEssentials, Toggle fn: $hasEssentialsFn, Feast Review: $hasFeastEssentialsReview"
    $allPassed = $false
}

# --- TASK 16: ADD ADD-ONS TO FEAST ---
$hasCutleryTiers = $html.Contains('data-cutlery-id="essential"') -and $html.Contains('data-cutlery-id="standard"') -and $html.Contains('data-cutlery-id="premium"') -and $html.Contains('data-cutlery-id="ultra"')
$hasCutleryFn = $js.Contains('function setCutleryTier(') -and $js.Contains('state.catering.cutleryTier')
$hasFeastAddonsReview = $js.Contains('Tableware Presentation Add-on:')
$t16 = $hasCutleryTiers -and $hasCutleryFn -and $hasFeastAddonsReview

if ($t16) {
    Write-Host "[PASS] Task 16: Add Add-ons to Feast" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task 16: Add Add-ons to Feast" -ForegroundColor Red
    Write-Host "  Tiers: $hasCutleryTiers, Cutlery fn: $hasCutleryFn, Feast Review: $hasFeastAddonsReview"
    $allPassed = $false
}

# --- REGRESSION CHECK: PHASE 1 & 2 (TASKS 1-8) ---
Write-Host "--- Checking Phase 1 & 2 Regressions ---"
$t1 = $html.Contains('btn-vendor-signin') -and $html.Contains('existing-vendor-signin-banner') -and $html.Contains('id="modal-vendor-signin"') -and $js.Contains('function openVendorSignInModal')
$t2 = (-not $html.Contains('host-contact-link')) -and (-not $html.Contains('+91 94511 23456'))
$dShellIndex = $html.IndexOf('id="desktop-dashboard-shell"')
$mShellIndex = $html.IndexOf('id="mobile-dashboard-shell"')
$desktopDashHtml = if ($dShellIndex -gt -1) { $html.Substring($dShellIndex, 15000) } else { "" }
$mobileDashHtml = if ($mShellIndex -gt -1) { $html.Substring($mShellIndex, 15000) } else { "" }
$hasDashPreview = $desktopDashHtml.Contains('btn-preview-store') -or $mobileDashHtml.Contains('btn-preview-store') -or $desktopDashHtml.Contains('Preview Storefront') -or $mobileDashHtml.Contains('Preview Storefront')
$t3 = (-not $hasDashPreview) -and (-not $js.Contains('btn-preview-store'))
$t4 = $html.Contains('Stall Display Brand Name <span class="field-optional">(Optional)</span>')
$t5 = (-not $html.Contains('data-format="varied"')) -and $js.Contains("state.stall.menuType = 'fixed'")
$t6 = (-not $html.Contains('Step 1 ·')) -and (-not $html.Contains('01.')) -and (-not $html.Contains('5A.'))
$t7 = $html.Contains('vendor-account-reused-card') -and $html.Contains('id="d-display-owner"') -and (-not $html.Contains('id="d-owner-name"')) -and $js.Contains('function syncAccountDetailsToUI()')
$t8 = $html.Contains('id="desktop-custom-offerings-container"') -and $html.Contains('id="custom-offering-title"') -and $js.Contains('function addCustomOffering(')

$regressionsPassed = $t1 -and $t2 -and $t3 -and $t4 -and $t5 -and $t6 -and $t7 -and $t8
Write-Host ('Phase 1 Task 1 (Sign In): ' + ($(if ($t1) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t1) { 'Green' } else { 'Red' }))
Write-Host ('Phase 1 Task 2 (No Host Phone): ' + ($(if ($t2) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t2) { 'Green' } else { 'Red' }))
Write-Host ('Phase 1 Task 3 (No Dash Preview): ' + ($(if ($t3) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t3) { 'Green' } else { 'Red' }))
Write-Host ('Phase 1 Task 4 (Stall Name Optional): ' + ($(if ($t4) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t4) { 'Green' } else { 'Red' }))
Write-Host ('Phase 1 Task 5 (No Varied Delicacies): ' + ($(if ($t5) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t5) { 'Green' } else { 'Red' }))
Write-Host ('Phase 1 Task 6 (No Step Numbers): ' + ($(if ($t6) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t6) { 'Green' } else { 'Red' }))
Write-Host ('Phase 2 Task 7 (Reused Signup Details): ' + ($(if ($t7) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t7) { 'Green' } else { 'Red' }))
Write-Host ('Phase 2 Task 8 (Custom Offerings): ' + ($(if ($t8) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($t8) { 'Green' } else { 'Red' }))

if (-not $regressionsPassed) { $allPassed = $false }

Write-Host "--------------------------------------------------"
if ($allPassed) {
    Write-Host "ALL PHASE 3 TASKS & REGRESSIONS PASSED!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "SOME VERIFICATION CHECKS FAILED!" -ForegroundColor Red
    exit 1
}
