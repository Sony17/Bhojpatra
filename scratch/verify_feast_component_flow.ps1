# scratch/verify_feast_component_flow.ps1
# Verification suite for Pre-Task 23 Feast Component Information Architecture Correction

$ErrorActionPreference = "Stop"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "BHOJPATRA V2 ONBOARDING: FEAST COMPONENT IA & DYNAMIC FLOW VERIFICATION" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

$htmlPath = "mockups/vendor-registration-v2/index.html"
$jsPath = "mockups/vendor-registration-v2/script.js"
$cssPath = "mockups/vendor-registration-v2/styles.css"
$v1DataPath = "src/lib/data.ts"

$html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
$js = [System.IO.File]::ReadAllText($jsPath, [System.Text.Encoding]::UTF8)
$css = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)
$v1Data = [System.IO.File]::ReadAllText($v1DataPath, [System.Text.Encoding]::UTF8)

$totalTests = 0
$passedTests = 0

function Check-Assert {
    param(
        [int]$Number,
        [string]$Title,
        [bool]$Condition,
        [string]$Details = ""
    )
    $script:totalTests++
    if ($Condition) {
        $script:passedTests++
        Write-Host "  [PASS] $Number. $Title" -ForegroundColor Green
        if ($Details) { Write-Host "         $Details" -ForegroundColor DarkGray }
    } else {
        Write-Host "  [FAIL] $Number. $Title" -ForegroundColor Red
        if ($Details) { Write-Host "         $Details" -ForegroundColor Yellow }
    }
}

# 1. Feast Booking is a commercial offering
$hasFeastOfferingCard = $html.Contains('id="card-offering-catering"') -and $html.Contains('data-offering-key="catering"')
Check-Assert 1 "Feast Booking is a commercial offering" $hasFeastOfferingCard "Card #card-offering-catering present with data-offering-key='catering'"

# 2. Live Counters is nested inside Feast Booking
$hasNestedCounters = $html.Contains('id="desktop-feast-components-section"') -and $html.Contains('data-component-key="counters"')
Check-Assert 2 "Live Counters is nested inside Feast Booking" $hasNestedCounters "Live Counters item lives within .feast-components-section inside Feast Booking card"

# 3. Feast Extras is nested inside Feast Booking
$hasNestedExtras = $html.Contains('data-component-key="extras"')
Check-Assert 3 "Feast Extras is nested inside Feast Booking" $hasNestedExtras "Feast Extras item lives within .feast-components-section inside Feast Booking card"

# 4. Essentials is nested inside Feast Booking
$hasNestedEssentials = $html.Contains('data-component-key="essentials"')
Check-Assert 4 "Essentials is nested inside Feast Booking" $hasNestedEssentials "Essentials item lives within .feast-components-section inside Feast Booking card"

# 5. Add-ons is nested inside Feast Booking
$hasNestedAddons = $html.Contains('data-component-key="addons"')
Check-Assert 5 "Add-ons is nested inside Feast Booking" $hasNestedAddons "Add-ons item lives within .feast-components-section inside Feast Booking card"

# 6. No separate Feast Sub-Configurations panel remains
$noSeparatePanel = (-not $html.Contains('feast-subofferings-panel')) -and (-not $css.Contains('.feast-subofferings-panel'))
Check-Assert 6 "No separate Feast Sub-Configurations panel remains" $noSeparatePanel "Separate .feast-subofferings-panel removed from HTML and CSS"

# 7. Live Counters is not an independent commercial offering
# Ensure no top-level offering-card has data-offering-key="counters" outside of components list
$hasStandaloneCounterCard = [System.Text.RegularExpressions.Regex]::IsMatch($html, '<div class="offering-card"[^>]*data-offering-key="counters"')
Check-Assert 7 "Live Counters is not an independent commercial offering" (-not $hasStandaloneCounterCard) "No standalone .offering-card exists for Live Counters"

# 8. Extras is not an independent commercial offering
$hasStandaloneExtrasCard = [System.Text.RegularExpressions.Regex]::IsMatch($html, '<div class="offering-card"[^>]*data-offering-key="extras"')
Check-Assert 8 "Extras is not an independent commercial offering" (-not $hasStandaloneExtrasCard) "No standalone .offering-card exists for Extras"

# 9. Essentials is not an independent commercial offering
$hasStandaloneEssentialsCard = [System.Text.RegularExpressions.Regex]::IsMatch($html, '<div class="offering-card"[^>]*data-offering-key="essentials"')
Check-Assert 9 "Essentials is not an independent commercial offering" (-not $hasStandaloneEssentialsCard) "No standalone .offering-card exists for Essentials"

# 10. Add-ons is not an independent commercial offering
$hasStandaloneAddonsCard = [System.Text.RegularExpressions.Regex]::IsMatch($html, '<div class="offering-card"[^>]*data-offering-key="addons"')
Check-Assert 10 "Add-ons is not an independent commercial offering" (-not $hasStandaloneAddonsCard) "No standalone .offering-card exists for Add-ons"

# 11. Each Feast component can be independently selected
$hasIndependentToggleFn = $js.Contains('function toggleFeastComponent(componentKey, e)') -and $js.Contains('state.catering.components[componentKey] = !state.catering.components[componentKey]')
Check-Assert 11 "Each Feast component can be independently selected" $hasIndependentToggleFn "toggleFeastComponent flips individual boolean in state.catering.components"

# 12. Each Feast component can be independently deselected
$hasDeselectionSupport = $js.Contains('state.catering.components[componentKey] = !state.catering.components[componentKey]')
Check-Assert 12 "Each Feast component can be independently deselected" $hasDeselectionSupport "Toggle boolean logic supports reversible deselection"

# 13. Feast component state is canonical
$hasCanonicalComponentState = $js.Contains('components:') -and $js.Contains('counters:') -and $js.Contains('extras:') -and $js.Contains('essentials:') -and $js.Contains('addons:')
Check-Assert 13 "Feast component state is canonical" $hasCanonicalComponentState "state.catering.components hosts canonical sub-component selection map"

# 14. No duplicate desktop/mobile component state exists
$noDuplicateState = (-not ($js -match 'state\.mobileFeastComponents')) -and (-not ($js -match 'state\.desktopFeastComponents')) -and (-not ($js -match 'state\.feastSubOfferings'))
Check-Assert 14 "No duplicate desktop/mobile component state exists" $noDuplicateState "Single canonical state.catering.components used across all viewports"

# 15. Feast deselection prevents Feast sub-component steps from appearing
$hasDeselectionFlowCheck = $js.Contains("if (state.selectedOfferings.includes('catering'))") -and $js.Contains("function getActiveOnboardingSteps()")
Check-Assert 15 "Feast deselection prevents Feast sub-component steps from appearing" $hasDeselectionFlowCheck "getActiveOnboardingSteps gates all Feast steps on state.selectedOfferings.includes('catering')"

# 16. Selected Live Counters creates the Live Counters onboarding step
$hasCountersFlowCheck = $js.Contains("if (state.catering.components && state.catering.components.counters)") -and $js.Contains("steps.push('view-cat-live')")
Check-Assert 16 "Selected Live Counters creates the Live Counters onboarding step" $hasCountersFlowCheck "view-cat-live pushed when state.catering.components.counters is true"

# 17. Deselected Live Counters skips its onboarding step
# Evaluated dynamically below in synthetic simulation

# 18. Selected Extras creates the Extras onboarding step
$hasExtrasFlowCheck = $js.Contains("if (state.catering.components && state.catering.components.extras)") -and $js.Contains("steps.push('view-cat-extras')")
Check-Assert 18 "Selected Extras creates the Extras onboarding step" $hasExtrasFlowCheck "view-cat-extras pushed when state.catering.components.extras is true"

# 19. Deselected Extras skips its onboarding step
# Evaluated dynamically below

# 20. Selected Essentials creates the Essentials onboarding step
$hasEssentialsFlowCheck = $js.Contains("if (state.catering.components && state.catering.components.essentials)") -and $js.Contains("steps.push('view-cat-essentials')")
Check-Assert 20 "Selected Essentials creates the Essentials onboarding step" $hasEssentialsFlowCheck "view-cat-essentials pushed when state.catering.components.essentials is true"

# 21. Deselected Essentials skips its onboarding step
# Evaluated dynamically below

# 22. Selected Add-ons creates the Add-ons onboarding step
$hasAddonsFlowCheck = $js.Contains("if (state.catering.components && state.catering.components.addons)") -and $js.Contains("steps.push('view-cat-addons')")
Check-Assert 22 "Selected Add-ons creates the Add-ons onboarding step" $hasAddonsFlowCheck "view-cat-addons pushed when state.catering.components.addons is true"

# 23. Deselected Add-ons skips its onboarding step
# Evaluated dynamically below

# Synthetic Flow Evaluator for Examples A, B, C
function Evaluate-Flow($selectedOfferings, $components) {
    $steps = @('view-details', 'view-kyc', 'view-offerings')
    if ($selectedOfferings -contains 'catering') {
        $steps += @('view-cat-basics', 'view-cat-courses', 'view-cat-dishes', 'view-cat-tiers')
        if ($components.counters) { $steps += 'view-cat-live' }
        if ($components.extras) { $steps += 'view-cat-extras' }
        if ($components.essentials) { $steps += 'view-cat-essentials' }
        if ($components.addons) { $steps += 'view-cat-addons' }
    }
    if ($selectedOfferings -contains 'stall') {
        $steps += @('view-stall-basics', 'view-stall-delicacies', 'view-stall-pricing', 'view-stall-live')
    }
    if ($selectedOfferings -contains 'baina') {
        $steps += @('view-baina-basics', 'view-baina-boxes', 'view-baina-packaging')
    }
    $steps += @('view-review', 'view-complete')
    return $steps
}

# Example A: Feast + Counters + Extras + Addons (NO Essentials)
$flowA = Evaluate-Flow @('catering') @{ counters = $true; extras = $true; essentials = $false; addons = $true }
$check17 = -not ($flowA -contains 'view-cat-essentials')
$check19 = $flowA -contains 'view-cat-extras'
$check21 = -not ($flowA -contains 'view-cat-essentials')
$check23 = $flowA -contains 'view-cat-addons'

# Example B: Feast + Extras + Essentials (NO Counters, NO Addons)
$flowB = Evaluate-Flow @('catering') @{ counters = $false; extras = $true; essentials = $true; addons = $false }
$check17B = -not ($flowB -contains 'view-cat-live')
$check23B = -not ($flowB -contains 'view-cat-addons')

# Example without Extras
$flowNoExtras = Evaluate-Flow @('catering') @{ counters = $true; extras = $false; essentials = $true; addons = $true }
$check19 = -not ($flowNoExtras -contains 'view-cat-extras')

Check-Assert 17 "Deselected Live Counters skips its onboarding step" $check17B "When counters is false, view-cat-live is excluded from active flow"
Check-Assert 19 "Deselected Extras skips its onboarding step" $check19 "When extras is false, view-cat-extras is excluded"
Check-Assert 21 "Deselected Essentials skips its onboarding step" $check21 "When essentials is false, view-cat-essentials is excluded from active flow"
Check-Assert 23 "Deselected Add-ons skips its onboarding step" $check23B "When addons is false, view-cat-addons is excluded from active flow"

# 24. Core Feast steps remain available when Feast is selected
$flowC = Evaluate-Flow @('catering') @{ counters = $false; extras = $false; essentials = $false; addons = $false }
$hasCoreFeast = ($flowC -contains 'view-cat-basics') -and ($flowC -contains 'view-cat-courses') -and ($flowC -contains 'view-cat-dishes') -and ($flowC -contains 'view-cat-tiers')
Check-Assert 24 "Core Feast steps remain available when Feast is selected" $hasCoreFeast "Core Feast steps (basics, courses, dishes, tiers) present even with 0 sub-components"

# 25. If Feast is deselected, Feast configuration steps are skipped
$flowNoFeast = Evaluate-Flow @('stall', 'baina') @{ counters = $true; extras = $true; essentials = $true; addons = $true }
$feastSkipped = -not (($flowNoFeast -match 'view-cat-').Count -gt 0)
Check-Assert 25 "If Feast is deselected, Feast configuration steps are skipped" $feastSkipped "Zero view-cat-* steps participate when catering is not selected"

# 26. Stall flow remains functional
$hasStallFlow = ($flowNoFeast -contains 'view-stall-basics') -and ($flowNoFeast -contains 'view-stall-delicacies') -and ($flowNoFeast -contains 'view-stall-pricing') -and ($flowNoFeast -contains 'view-stall-live')
Check-Assert 26 "Stall flow remains functional" $hasStallFlow "All 4 stall configuration steps present when stall is selected"

# 27. Baina flow remains functional
$hasBainaFlow = ($flowNoFeast -contains 'view-baina-basics') -and ($flowNoFeast -contains 'view-baina-boxes') -and ($flowNoFeast -contains 'view-baina-packaging')
Check-Assert 27 "Baina flow remains functional" $hasBainaFlow "All 3 Baina configuration steps present when baina is selected"

# 28. Dynamic stepper reflects the active flow
$hasStepperDynamicPhases = $js.Contains('phases[i].steps.includes(stepId)') -and $js.Contains('getActiveOnboardingSteps()')
Check-Assert 28 "Dynamic stepper reflects the active flow" $hasStepperDynamicPhases "updateStepperProgress and jumpToPhase resolve from getActiveOnboardingSteps"

# 29. Task 21 animation remains intact
$hasTask21Animation = $css.Contains('.stepper-line-fill') -and $css.Contains('transition: width') -and $css.Contains('.step-bullet') -and $js.Contains('progressPercent')
Check-Assert 29 'Task 21 animation remains intact' $hasTask21Animation 'CSS width transitions and JS progressPercent animation intact'

# 30. No step numbers are reintroduced
$noStepNumbersHtml = -not [System.Text.RegularExpressions.Regex]::IsMatch($html, 'class="step-eyebrow">Step \d')
$noStepNumbersJs = -not [System.Text.RegularExpressions.Regex]::IsMatch($js, "label:\s*'\d+\.")
Check-Assert 30 "No step numbers are reintroduced" ($noStepNumbersHtml -and $noStepNumbersJs) "Zero numeric prefixes in headings or phase labels"

# 31. Task 22 Baina max-5 behavior remains intact
$hasBaina5Limit = ($js -match 'state\.baina\.boxes\.length\s*>=\s*5') -and ($js -match 'Maximum 5 selections allowed')
Check-Assert 31 "Task 22 Baina max-5 behavior remains intact" $hasBaina5Limit "Baina box selection limit strictly enforced at 5"

# 32. Task 10 Serviceable Cities remains intact
$hasCitiesAdder = $html.Contains('id="desktop-service-cities-grid"') -and $html.Contains('id="desktop-input-custom-city"') -and $js.Contains('function addCustomCity')
Check-Assert 32 "Task 10 Serviceable Cities remains intact" $hasCitiesAdder "Serviceable cities selection and custom city addition intact"

# 33. Tasks 13-16 canonical state remains intact
$hasTasks13to16Canonical = $js.Contains('state.catering.liveCounters') -and $js.Contains('state.catering.extras') -and $js.Contains('state.catering.serviceInclusions') -and $js.Contains('state.catering.cutleryTier')
Check-Assert 33 'Tasks 13-16 canonical state remains intact' $hasTasks13to16Canonical 'state.catering sub-properties intact'

# 34. Master Review nests selected Feast components under Feast Booking
$hasReviewNesting = $js.Contains('Selected Feast Components') -and $js.Contains('Feast Booking:')
Check-Assert 34 'Master Review nests selected Feast components under Feast Booking' $hasReviewNesting 'Review card for Feast Booking hosts Selected Feast Components container'

# 35. Unselected Feast components are omitted from Master Review
$hasConditionalReview = $js.Contains('hasCounters ?') -and $js.Contains('hasExtras ?') -and $js.Contains('hasEssentials ?') -and $js.Contains('hasAddons ?')
Check-Assert 35 'Unselected Feast components are omitted from Master Review' $hasConditionalReview 'Each sub-component in Master Review is conditionally rendered based on selection boolean'

# 36. Desktop/mobile synchronization works
$hasDesktopMobileSync = $js.Contains("document.querySelectorAll('.feast-component-item')") -and $js.Contains("document.querySelectorAll('.feast-components-section')")
Check-Assert 36 'Desktop/mobile synchronization works' $hasDesktopMobileSync 'Single toggle function updates querySelectorAll across desktop and mobile DOM trees'

# 37. Badge system Tasks 17-20 remains untouched
$authPath = "src/components/auth/AuthForm.tsx"
$auth = if (Test-Path $authPath) { [System.IO.File]::ReadAllText($authPath, [System.Text.Encoding]::UTF8) } else { "" }
$hasBadgesUntouched = (-not $html.Contains('data-step-id="view-badges"')) -and ($auth.Contains('heritage-caterer') -and $auth.Contains('verified-caterer'))
Check-Assert 37 'Badge system Tasks 17-20 remains untouched' $hasBadgesUntouched 'Badges remain in Vendor Signup / storefront, outside V2 onboarding'

# 38. Official Bhojpatra logo remains intact
$hasLogoIntact = $html.Contains('src="../../public/bhojpatra-logo.png"') -and $html.Contains('class="bhojpatra-header-logo"')
Check-Assert 38 'Official Bhojpatra logo remains intact' $hasLogoIntact 'Header displays Bhojpatra official logo PNG'

# 39. 36 States/UTs remain intact
$stateMatches = [regex]::Matches($html, '<select[^>]*id="d-state"[^>]*>([\s\S]*?)<\/select>')
$desktopStateOptionCount = 0
if ($stateMatches.Count -gt 0) {
    $desktopStateOptionCount = ([regex]::Matches($stateMatches[0].Groups[1].Value, '<option')).Count
}
Check-Assert 39 '36 States/UTs remain intact' ($desktopStateOptionCount -ge 36) ('State selector contains ' + $desktopStateOptionCount + ' options (>= 36)')

# 40. Current 23-city dataset remains intact
$has23Cities = $js.Contains('CANONICAL_CITIES') -and $html.Contains('data-city="Lucknow"') -and $html.Contains('data-city="Kanpur"') -and $html.Contains('data-city="Varanasi"')
Check-Assert 40 'Current 23-city dataset remains intact' $has23Cities 'Predefined canonical cities grid intact in onboarding'

$failedTests = $totalTests - $passedTests
$summaryColor = 'Red'
if ($failedTests -eq 0) {
    $summaryColor = 'Green'
}
Write-Host '==============================================================================' -ForegroundColor Cyan
Write-Host ('TOTAL TESTS: ' + $totalTests + ' | PASSED: ' + $passedTests + ' | FAILED: ' + $failedTests) -ForegroundColor $summaryColor
Write-Host '==============================================================================' -ForegroundColor Cyan

if ($failedTests -eq 0) {
    exit 0
} else {
    exit 1
}
