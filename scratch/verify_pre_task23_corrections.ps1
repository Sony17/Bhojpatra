# scratch/verify_pre_task23_corrections.ps1
# Verification script for Pre-Task-23 Functional/Content Correction Pass

$ErrorActionPreference = "Stop"

Write-Host "=================================================="
Write-Host "RUNNING PRE-TASK-23 CORRECTIONS VERIFICATION SUITE"
Write-Host "=================================================="

$htmlPath = "mockups/vendor-registration-v2/index.html"
$jsPath = "mockups/vendor-registration-v2/script.js"
$cssPath = "mockups/vendor-registration-v2/styles.css"
$v1DataPath = "src/lib/data.ts"
$authPath = "src/components/auth/AuthForm.tsx"

$html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
$js = [System.IO.File]::ReadAllText($jsPath, [System.Text.Encoding]::UTF8)
$css = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)
$v1Data = [System.IO.File]::ReadAllText($v1DataPath, [System.Text.Encoding]::UTF8)
$auth = [System.IO.File]::ReadAllText($authPath, [System.Text.Encoding]::UTF8)

$totalTests = 0
$passedTests = 0

function Assert-Condition {
    param(
        [string]$TestName,
        [bool]$Condition,
        [string]$Details = ""
    )
    $script:totalTests++
    if ($Condition) {
        $script:passedTests++
        Write-Host "  [PASS] $TestName" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $TestName" -ForegroundColor Red
        if ($Details) {
            Write-Host "         $Details" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n--- GEOGRAPHY TESTS (Items 1-7) ---"

# 1. Canonical state/UT data source identified in V1
$hasV1States = $v1Data.Contains("indianStates") -and $v1Data.Contains("Uttar Pradesh") -and $v1Data.Contains("Maharashtra")
$hasV2States = $js.Contains("INDIAN_STATES") -and $js.Contains("Uttar Pradesh")
Assert-Condition "1. Canonical state/UT data source identified in V1 data.ts" `
    ($hasV1States -and $hasV2States)

# 2. All 36 Indian States/UTs are available where state selection is required
$stateMatches = [regex]::Matches($html, '<select[^>]*id="d-state"[^>]*>([\s\S]*?)<\/select>')
$desktopStateOptionCount = 0
if ($stateMatches.Count -gt 0) {
    $desktopStateOptionCount = ([regex]::Matches($stateMatches[0].Groups[1].Value, '<option')).Count
}
$hasMobileStateSelect = $html.Contains('id="m-state"')
$hasStateSync = $js.Contains('INDIAN_STATES') -and $js.Contains('state.details.state')
Assert-Condition "2. All Indian States/UTs available in state selectors (Found $desktopStateOptionCount options in d-state, mobile m-state present, synced)" `
    ($desktopStateOptionCount -ge 36 -and $hasMobileStateSelect -and $hasStateSync)

# 3. Major city options are available where city selection is required
$cityMatches = [regex]::Matches($html, '<select[^>]*id="d-city"[^>]*>([\s\S]*?)<\/select>')
$desktopCityOptionCount = 0
if ($cityMatches.Count -gt 0) {
    $desktopCityOptionCount = ([regex]::Matches($cityMatches[0].Groups[1].Value, '<option')).Count
}
$hasCanonicalCities = $js.Contains("CANONICAL_CITIES") -and $js.Contains("Lucknow") -and $js.Contains("Delhi") -and $js.Contains("Bengaluru")
Assert-Condition "3. Major city options available in city selectors (Found $desktopCityOptionCount options in d-city, >= 20 canonical cities)" `
    ($desktopCityOptionCount -ge 20 -and $hasCanonicalCities)

# 4. V1 location data is reused where an authoritative source exists
$v1HasCities = $v1Data.Contains("Lucknow") -and $v1Data.Contains("Kanpur") -and $v1Data.Contains("Delhi") -and $v1Data.Contains("Mumbai")
$v2HasCities = $html.Contains('data-city="Lucknow"') -and $html.Contains('data-city="Kanpur"') -and $html.Contains('data-city="Delhi NCR"') -and $html.Contains('data-city="Mumbai"')
Assert-Condition "4. V1 location data reused from authoritative source" `
    ($v1HasCities -and $v2HasCities)

# 5. Desktop and mobile use the same location data
$desktopCitiesGrid = $html.Contains('id="desktop-service-cities-grid"')
$mobileCitiesGrid = $html.Contains('id="mobile-service-cities-grid"')
$citySyncLogic = $js.Contains('renderPhase3StateToUI') -and $js.Contains('state.details.serviceCities')
Assert-Condition "5. Desktop and mobile selectors use identical canonical data and sync" `
    ($desktopCitiesGrid -and $mobileCitiesGrid -and $citySyncLogic)

# 6. Serviceable Cities custom-city functionality remains intact
$hasCustomCityAdder = $html.Contains('id="desktop-input-custom-city"') -and $html.Contains('id="mobile-input-custom-city"') -and $js.Contains('function addCustomCity')
Assert-Condition "6. Serviceable Cities custom-city functionality remains intact" `
    $hasCustomCityAdder

# 7. City selection is NOT limited to 5
$noCity5Limit = (-not ($js -match 'serviceCities\.length\s*>=\s*5')) -and (-not ($js -match 'operatingCities\.length\s*>=\s*5'))
Assert-Condition "7. City selection is NOT limited to 5" `
    $noCity5Limit

Write-Host "`n--- FEAST STRUCTURE TESTS (Items 8-19) ---"

# 8. Feast remains the parent service/flow
$hasFeastFlow = $html.Contains('data-step-id="view-cat-basics"') -and $html.Contains('data-step-id="view-cat-courses"') -and $html.Contains('data-step-id="view-cat-dishes"') -and $html.Contains('data-step-id="view-cat-tiers"')
Assert-Condition "8. Feast remains the parent service/flow (cat-basics, courses, dishes, tiers, live, extras)" `
    $hasFeastFlow

# 9. Live Counters represented as a Feast sub-part
$hasLiveSubpart = $html.Contains('data-step-id="view-cat-live"') -and $html.Contains('Select Feast Components') -and $html.Contains('data-component-key="counters"')
Assert-Condition "9. Live Counters represented as a Feast sub-part" `
    $hasLiveSubpart

# 10. Extras represented as a Feast sub-part
$hasExtrasSubpart = $html.Contains('data-step-id="view-cat-extras"') -and $html.Contains('Feast Hospitality Extras') -and $html.Contains('toggleFeastExtra(')
Assert-Condition "10. Extras represented as a Feast sub-part" `
    $hasExtrasSubpart

# 11. Essentials represented as a Feast sub-part
$hasEssentialsSubpart = ($html.Contains('id="desktop-feast-essentials-row"') -or $html.Contains('id="mobile-feast-essentials-row"')) -and $html.Contains('toggleFeastEssential(')
Assert-Condition "11. Essentials represented as a Feast sub-part" `
    $hasEssentialsSubpart

# 12. Add-ons represented as a Feast sub-part
$hasAddonsSubpart = $html.Contains('Tableware Add-on') -and $html.Contains('setCutleryTier(')
Assert-Condition "12. Add-ons represented as a Feast sub-part" `
    $hasAddonsSubpart

# 13. state.catering.liveCounters remains canonical
$hasCanonicalLiveState = $js.Contains('state.catering.liveCounters')
Assert-Condition "13. state.catering.liveCounters remains canonical" `
    $hasCanonicalLiveState

# 14. state.catering.extras remains canonical
$hasCanonicalExtrasState = $js.Contains('state.catering.extras')
Assert-Condition "14. state.catering.extras remains canonical" `
    $hasCanonicalExtrasState

# 15. state.catering.serviceInclusions remains canonical
$hasCanonicalEssentialsState = $js.Contains('state.catering.serviceInclusions')
Assert-Condition "15. state.catering.serviceInclusions remains canonical" `
    $hasCanonicalEssentialsState

# 16. state.catering.cutleryTier remains canonical
$hasCanonicalAddonsState = $js.Contains('state.catering.cutleryTier')
Assert-Condition "16. state.catering.cutleryTier remains canonical" `
    $hasCanonicalAddonsState

# 17. No duplicate parallel state introduced
$noParallelExtras = -not ($js -match 'state\.feastExtras\s*=')
$noParallelAddons = -not ($js -match 'state\.feastAddons\s*=')
$noParallelCounters = -not ($js -match 'state\.liveCounterSelections\s*=')
Assert-Condition "17. No duplicate parallel state introduced" `
    ($noParallelExtras -and $noParallelAddons -and $noParallelCounters)

# 18. Commercial Offerings cleanly host Feast Sub-Components inside Feast Booking offering card
$hasOfferingSeparation = $html.Contains('feast-components-section') -and $html.Contains('Select Feast Components') -and (-not $html.Contains('feast-subofferings-panel'))
Assert-Condition "18. Commercial Offerings cleanly host Feast Sub-Components inside Feast Booking card without separate external panel" `
    $hasOfferingSeparation

# 19. Feast Master Review still includes the relevant sub-configurations
$hasFeastReviewSubparts = $js.Contains('Live Counters (${activeLiveCounters.length}):') -and `
                          $js.Contains('Feast Hospitality Extras (${(state.catering.extras') -and `
                          $js.Contains('Service Crew & Hygiene Essentials:') -and `
                          $js.Contains('Tableware Presentation Add-on:')
Assert-Condition "19. Feast Master Review nests sub-configurations under Feast Booking" `
    $hasFeastReviewSubparts

Write-Host "`n--- LOGO TESTS (Items 20-25) ---"

# 20. Existing Bhojpatra logo asset was located in repository
$logoExistsInPublic = Test-Path "public/bhojpatra-logo.png"
$logoExistsInMockup = Test-Path "mockups/vendor-registration-v2/bhojpatra-logo.png"
Assert-Condition "20. Existing Bhojpatra logo asset exists in public/bhojpatra-logo.png" `
    ($logoExistsInPublic -and $logoExistsInMockup)

# 21. V2 onboarding header uses the existing logo asset
$headerUsesLogo = $html.Contains('src="../../public/bhojpatra-logo.png"') -and $html.Contains('class="bhojpatra-header-logo"')
Assert-Condition "21. V2 onboarding header uses existing logo asset" `
    $headerUsesLogo

# 22. Logo is not recreated with plain text
$hasImgLogo = $html.Contains('<img src="../../public/bhojpatra-logo.png" alt="Bhojpatra" class="bhojpatra-header-logo"')
$noTextBrand = -not $html.Contains('<div class="brand-text">Bhojpatra</div>')
Assert-Condition "22. Logo is an img element, not plain text" `
    ($hasImgLogo -and $noTextBrand)

# 23. Logo aspect ratio is preserved (object-fit: contain, width: auto)
$cssPreservesRatio = $css.Contains('object-fit: contain') -and $css.Contains('width: auto')
Assert-Condition "23. Logo aspect ratio preserved in CSS (width: auto, object-fit: contain)" `
    $cssPreservesRatio

# 24. Desktop header logo is valid
$desktopHeaderLogo = ($html -match 'id="desktop-onboarding-shell"[\s\S]*?class="bhojpatra-header-logo"')
Assert-Condition "24. Desktop header logo is present" `
    $desktopHeaderLogo

# 25. Mobile header logo is valid
$mobileHeaderLogo = ($html -match 'id="mobile-onboarding-shell"[\s\S]*?class="bhojpatra-header-logo"')
$mobileLogoCss = $css.Contains('.bhojpatra-header-logo')
Assert-Condition "25. Mobile header logo is present" `
    ($mobileHeaderLogo -and $mobileLogoCss)

Write-Host "`n--- REGRESSION TESTS (Items 26-32) ---"

# 26. Task 21 progress animation remains intact
$animIntact = $css.Contains('.stepper-line-fill') -and $css.Contains('.stepper-overall-fill') -and $js.Contains('updateStepperProgress(stepId);')
Assert-Condition "26. Task 21 progress animation remains intact" `
    $animIntact

# 27. Task 22 Baina Box max-5 behavior remains intact
$bainaMax5Intact = ($js -match 'state\.baina\.boxes\.length\s*>=\s*5') -and ($js -match 'Maximum 5 selections allowed')
Assert-Condition "27. Task 22 Baina Box max-5 behavior remains intact" `
    $bainaMax5Intact

# 28. Tasks 17-20 badge system remains intact
$badgeSystemIntact = $auth.Contains('Verified Caterer') -and $auth.Contains('City Icon Caterer') -and $auth.Contains('Heritage Caterer')
Assert-Condition "28. Tasks 17-20 badge system in AuthForm.tsx remains intact" `
    $badgeSystemIntact

# 29. Tasks 1-16 key features remain intact
$featuresIntact = $html.Contains('id="modal-vendor-signin"') -and `
                  $html.Contains('btn-vendor-signin') -and `
                  $html.Contains('data-cuisine="Awadhi"') -and `
                  $html.Contains('id="desktop-service-cities-grid"') -and `
                  $html.Contains('data-step-id="view-cat-live"') -and `
                  $html.Contains('data-step-id="view-cat-extras"')
Assert-Condition "29. Tasks 1-16 key features remain intact" `
    $featuresIntact

# 30. Sign-in/onboarding single-source-of-truth behavior remains intact
$authFlowIntact = $js.Contains('REGISTERED_VENDOR_ACCOUNTS') -and $js.Contains('syncAccountDetailsToUI') -and $js.Contains('state.account')
Assert-Condition "30. Sign-in/onboarding single-source-of-truth remains intact" `
    $authFlowIntact

# 31. No visible onboarding step numbers were reintroduced
$noVisibleStepNumbers = (-not $html.Contains('<span class="step-number">1</span>')) -and `
                        (-not ($html -match 'Step\s+[1-9]\s+of'))
Assert-Condition "31. No visible onboarding step numbers reintroduced" `
    $noVisibleStepNumbers

# 32. No unrelated selection limits were introduced
$noUnrelatedLimits = (-not ($js -match 'state\.details\.cuisines\.length\s*>=\s*5')) -and `
                     (-not ($js -match 'state\.catering\.liveCounters\.length\s*>=\s*5'))
Assert-Condition "32. No unrelated selection limits introduced" `
    $noUnrelatedLimits

Write-Host "`n=================================================="
Write-Host "SUMMARY: $passedTests / $totalTests tests passed"
Write-Host "=================================================="

if ($passedTests -eq $totalTests) {
    Write-Host "ALL PRE-TASK-23 CORRECTION TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "SOME TESTS FAILED! PLEASE REVIEW." -ForegroundColor Red
    exit 1
}
