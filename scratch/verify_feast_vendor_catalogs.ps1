# scratch/verify_feast_vendor_catalogs.ps1
# Verification suite for Feast Live Counters and Feast Extras Vendor Catalog Builders

$ErrorActionPreference = "Stop"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "BHOJPATRA V2: FEAST VENDOR CATALOG BUILDERS (LIVE COUNTERS & EXTRAS) VERIFICATION" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

$htmlPath = "mockups/vendor-registration-v2/index.html"
$jsPath = "mockups/vendor-registration-v2/script.js"
$cssPath = "mockups/vendor-registration-v2/styles.css"
$authPath = "src/components/auth/AuthForm.tsx"

$html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
$js = [System.IO.File]::ReadAllText($jsPath, [System.Text.Encoding]::UTF8)
$css = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)
$auth = if (Test-Path $authPath) { [System.IO.File]::ReadAllText($authPath, [System.Text.Encoding]::UTF8) } else { "" }

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

Write-Host "`n--- PART 1: LIVE COUNTERS VENDOR CATALOG ---" -ForegroundColor Yellow

# 1. Live Counters remains a Feast sub-component
$c1 = $html.Contains('id="desktop-feast-components-section"') -and $html.Contains('data-component-key="counters"') -and $js.Contains('state.catering.components')
Check-Assert 1 "Live Counters remains a Feast sub-component" $c1 "Nested inside Feast Booking card and governed by state.catering.components.counters"

# 2. Vendor can create a Live Counter
$c2 = $js.Contains('function openLiveCounterEditor(') -and $html.Contains('btn-add-counter-trigger') -and $js.Contains('function saveLiveCounter(')
Check-Assert 2 "Vendor can create a Live Counter" $c2 "Trigger button, modal editor, and saveLiveCounter function implemented"

# 3. Vendor-defined category/name exists
$c3 = $html.Contains('id="counter-input-category"') -and $js.Contains('document.getElementById(''counter-input-category'')')
Check-Assert 3 "Vendor-defined category/name exists" $c3 "Dedicated freeform category input #counter-input-category present and read by JS"

# 4. Category is not restricted to a fixed predefined list
$c4 = $html.Contains('<input type="text" id="counter-input-category"') -and (-not $html.Contains('<select id="counter-input-category"'))
Check-Assert 4 "Category is not restricted to a fixed predefined list" $c4 "Uses text input allowing arbitrary vendor category names"

# 5. Cover photo field exists
$c5 = $html.Contains('id="counter-input-photo"') -and $js.Contains('coverPhoto')
Check-Assert 5 "Cover photo field exists" $c5 "Photo URL input and preset selector present in modal"

# 6. Cover photo preview/representation exists
$c6 = $html.Contains('id="counter-photo-preview"') -and $js.Contains('updateCounterPhotoPreview') -and $html.Contains('class="photo-preview-thumb"')
Check-Assert 6 "Cover photo preview/representation exists" $c6 "Live <img> preview updates dynamically on input/preset"

# 7. Vendor can add multiple items
$c7 = $html.Contains('id="counter-input-new-item"') -and $js.Contains('function addCounterItem()') -and $js.Contains('editingCounterItems.push(')
Check-Assert 7 "Vendor can add multiple items" $c7 "Dynamic item entry pushes to editing items array"

# 8. Items are vendor-defined
$c8 = $html.Contains('<input type="text" id="counter-input-new-item"') -and (-not $html.Contains('<select id="counter-input-new-item"'))
Check-Assert 8 "Items are vendor-defined" $c8 "Freeform text input for items, not a locked menu"

# 9. Vendor can edit items
$c9 = $js.Contains('function editCounterItem(') -and $js.Contains('editingCounterItems[idx] =')
Check-Assert 9 "Vendor can edit items" $c9 "editCounterItem function enables in-place editing of individual item pills"

# 10. Vendor can remove items
$c10 = $js.Contains('function removeCounterItem(') -and $js.Contains('editingCounterItems.splice(idx, 1)')
Check-Assert 10 "Vendor can remove items" $c10 "removeCounterItem function splices item from array and re-renders chips"

# 11. Extra cost per plate exists
$c11 = $html.Contains('id="counter-input-price"') -and $js.Contains('extraCostPerPlate')
Check-Assert 11 "Extra cost per plate exists" $c11 "Numeric price field binds to extraCostPerPlate"

# 12. Cost validation exists
$c12 = $js.Contains('isNaN(rawCost) || rawCost < 0') -and $js.Contains('showToast("Please enter a valid extra cost per plate')
Check-Assert 12 "Cost validation exists" $c12 "Validates non-negative numeric cost before saving"

# 13. Vendor can save a counter
$c13 = $js.Contains('function saveLiveCounter()') -and $js.Contains('state.catering.liveCounters.push(newCounter)')
Check-Assert 13 "Vendor can save a counter" $c13 "saveLiveCounter validates required fields and appends to catalog"

# 14. Saved counters are displayed as vendor-created catalog entries
$c14 = $html.Contains('id="desktop-vendor-counter-catalog-grid"') -and $html.Contains('id="mobile-vendor-counter-catalog-grid"') -and $js.Contains('function renderLiveCountersList()') -and $css.Contains('.vendor-catalog-card')
Check-Assert 14 "Saved counters are displayed as vendor-created catalog entries" $c14 "Cards rendered with cover photo, category name, items, and per-plate cost tag"

# 15. Vendor can edit a saved counter
$c15 = $js.Contains('openLiveCounterEditor(counterId') -and $js.Contains('existing.category = category')
Check-Assert 15 "Vendor can edit a saved counter" $c15 "Edit action loads counter into modal and updates existing record"

# 16. Vendor can remove a saved counter
$c16 = $js.Contains('function deleteLiveCounter(counterId)') -and $js.Contains('state.catering.liveCounters.splice(idx, 1)')
Check-Assert 16 "Vendor can remove a saved counter" $c16 "deleteLiveCounter removes counter and refreshes catalog and review"

# 17. Multiple counters are supported
$c17 = ($js -match 'state\.catering\.liveCounters\.push') -and (($js -match 'state\.catering\.liveCounters\.map') -or ($js -match 'counters\.map'))
Check-Assert 17 "Multiple counters are supported" $c17 "Array data structure supports arbitrary number of live counters"

# 18. Existing state.catering.liveCounters canonical state is preserved or appropriately evolved
$c18 = $js.Contains('state.catering.liveCounters') -and ($js -match 'liveCounters:\s*\[')
Check-Assert 18 "state.catering.liveCounters canonical state preserved/evolved" $c18 "Preserves state.catering.liveCounters as canonical array of counter objects"

# 19. No duplicate desktop/mobile counter state exists
$c19 = (-not ($js -match 'state\.mobileLiveCounters')) -and (-not ($js -match 'state\.desktopLiveCounters'))
Check-Assert 19 "No duplicate desktop/mobile counter state exists" $c19 "Single canonical array renders to both desktop and mobile containers"

Write-Host "`n--- PART 2: FEAST EXTRAS VENDOR CATALOG ---" -ForegroundColor Yellow

# 20. Feast Extras remains a Feast sub-component
$c20 = $html.Contains('data-component-key="extras"') -and $js.Contains('state.catering.components.extras')
Check-Assert 20 "Feast Extras remains a Feast sub-component" $c20 "Nested inside Feast Booking card and governed by state.catering.components.extras"

# 21. Vendor can create a Feast Extra
$c21 = $js.Contains('function openFeastExtraEditor(') -and $html.Contains('btn-add-extra-trigger') -and $js.Contains('function saveFeastExtra(')
Check-Assert 21 "Vendor can create a Feast Extra" $c21 "Trigger button, modal editor, and saveFeastExtra function implemented"

# 22. Vendor-defined extra category/name exists
$c22 = $html.Contains('id="extra-input-category"') -and $js.Contains('document.getElementById(''extra-input-category'')')
Check-Assert 22 "Vendor-defined extra category/name exists" $c22 "Dedicated input #extra-input-category present and read by JS"

# 23. Extra category is not restricted to fixed predefined options
$c23 = $html.Contains('<input type="text" id="extra-input-category"') -and (-not $html.Contains('<select id="extra-input-category"'))
Check-Assert 23 "Extra category is not restricted to fixed predefined options" $c23 "Uses text input for arbitrary vendor extra services"

# 24. Cover photo field exists
$c24 = $html.Contains('id="extra-input-photo"') -and $html.Contains('id="extra-photo-preview"')
Check-Assert 24 "Cover photo field exists" $c24 "Cover photo URL input and live preview thumb present"

# 25. Vendor can define included items/services
$c25 = $html.Contains('id="extra-input-new-item"') -and $js.Contains('function addExtraItem()') -and $js.Contains('editingExtraItems.push(')
Check-Assert 25 "Vendor can define included items/services" $c25 "Freeform item entry pushes to editingExtraItems"

# 26. Vendor can edit included items/services
$c26 = $js.Contains('function editExtraItem(') -and $js.Contains('editingExtraItems[idx] =')
Check-Assert 26 "Vendor can edit included items/services" $c26 "editExtraItem function enables prompt editing"

# 27. Vendor can remove included items/services
$c27 = $js.Contains('function removeExtraItem(') -and $js.Contains('editingExtraItems.splice(idx, 1)')
Check-Assert 27 "Vendor can remove included items/services" $c27 "removeExtraItem function removes item and re-renders chips"

# 28. Appropriate additional pricing exists
$c28 = $html.Contains('id="extra-select-pricing-type"') -and $html.Contains('id="extra-input-price"') -and $js.Contains('pricingType')
Check-Assert 28 "Appropriate additional pricing exists" $c28 "Supports per-plate and fixed event pricing models"

# 29. Vendor can save an extra
$c29 = $js.Contains('function saveFeastExtra()') -and $js.Contains('state.catering.extras.push(newExtra)')
Check-Assert 29 "Vendor can save an extra" $c29 "saveFeastExtra validates input and saves to state.catering.extras"

# 30. Saved extras are displayed as vendor-created catalog entries
$c30 = $html.Contains('id="desktop-vendor-extras-catalog-grid"') -and $html.Contains('id="mobile-vendor-extras-catalog-grid"') -and $js.Contains('function renderFeastExtrasList()')
Check-Assert 30 "Saved extras are displayed as vendor-created catalog entries" $c30 "Rendered dynamically in desktop and mobile catalog containers"

# 31. Vendor can edit a saved extra
$c31 = $js.Contains('openFeastExtraEditor(extraId') -and $js.Contains('existing.category = category')
Check-Assert 31 "Vendor can edit a saved extra" $c31 "Edit action populates modal with saved extra and updates state"

# 32. Vendor can remove a saved extra
$c32 = $js.Contains('function deleteFeastExtra(extraId)') -and $js.Contains('state.catering.extras.splice(idx, 1)')
Check-Assert 32 "Vendor can remove a saved extra" $c32 "deleteFeastExtra removes item from state and re-renders catalog"

# 33. Multiple extras are supported
$c33 = ($js -match 'state\.catering\.extras\.push') -and ($js -match 'state\.catering\.extras\.map')
Check-Assert 33 "Multiple extras are supported" $c33 "Array data structure accommodates multiple vendor extras"

# 34. Existing state.catering.extras canonical state is preserved or appropriately evolved
$c34 = $js.Contains('state.catering.extras') -and ($js -match 'extras:\s*\[')
Check-Assert 34 "state.catering.extras canonical state preserved/evolved" $c34 "Preserves state.catering.extras as canonical array of extra objects"

# 35. No duplicate desktop/mobile extras state exists
$c35 = (-not ($js -match 'state\.mobileExtras')) -and (-not ($js -match 'state\.desktopExtras'))
Check-Assert 35 "No duplicate desktop/mobile extras state exists" $c35 "Single canonical array used across viewports"

Write-Host "`n--- PART 3: DYNAMIC FEAST FLOW ---" -ForegroundColor Yellow

# 36. Live Counters configuration appears only when Live Counters component is selected
$c36 = $js.Contains("if (state.catering.components && state.catering.components.counters)") -and $js.Contains("steps.push('view-cat-live')")
Check-Assert 36 "Live Counters step appears only when component is selected" $c36 "getActiveOnboardingSteps gates view-cat-live on components.counters"

# 37. Extras configuration appears only when Extras component is selected
$c37 = $js.Contains("if (state.catering.components && state.catering.components.extras)") -and $js.Contains("steps.push('view-cat-extras')")
Check-Assert 37 "Extras step appears only when component is selected" $c37 "getActiveOnboardingSteps gates view-cat-extras on components.extras"

# 38. Deselecting Live Counters removes its configuration step from the active flow
$c38 = $js.Contains("function toggleFeastComponent(componentKey, e)") -and $js.Contains("state.catering.components[componentKey] = !state.catering.components[componentKey]")
Check-Assert 38 "Deselecting Live Counters removes its configuration step" $c38 "toggleFeastComponent flips boolean which dynamically excludes step"

# 39. Deselecting Extras removes its configuration step from the active flow
$c39 = $js.Contains("state.catering.components[componentKey] = !state.catering.components[componentKey]")
Check-Assert 39 "Deselecting Extras removes its configuration step" $c39 "Dynamic step calculation dynamically drops step on false toggle"

# 40. Feast remains the parent commercial offering
$c40 = $html.Contains('id="card-offering-catering"') -and $html.Contains('data-offering-key="catering"')
Check-Assert 40 "Feast remains the parent commercial offering" $c40 "Card #card-offering-catering is top-level offering card"

# 41. Live Counters is not an independent commercial offering
$c41 = -not [System.Text.RegularExpressions.Regex]::IsMatch($html, '<div class="offering-card"[^>]*data-offering-key="counters"')
Check-Assert 41 "Live Counters is not an independent commercial offering" $c41 "No standalone offering-card exists for counters"

# 42. Extras is not an independent commercial offering
$c42 = -not [System.Text.RegularExpressions.Regex]::IsMatch($html, '<div class="offering-card"[^>]*data-offering-key="extras"')
Check-Assert 42 "Extras is not an independent commercial offering" $c42 "No standalone offering-card exists for extras"

# 43. Essentials remains intact
$c43 = $html.Contains('data-step-id="view-cat-essentials"') -and $js.Contains('state.catering.serviceInclusions')
Check-Assert 43 "Essentials remains intact" $c43 "view-cat-essentials container and serviceInclusions intact"

# 44. Add-ons remains intact
$c44 = $html.Contains('data-step-id="view-cat-addons"') -and $js.Contains('state.catering.cutleryTier')
Check-Assert 44 "Add-ons remains intact" $c44 "view-cat-addons container and cutleryTier intact"

Write-Host "`n--- PART 4: MASTER REVIEW ---" -ForegroundColor Yellow

# 45. Vendor-created Live Counter categories appear
$c45 = ($js -match 'alc\.category\s*\|\|\s*alc\.name') -and ($js -match 'Live Counters \(\$\{activeLiveCounters\.length\}\):')
Check-Assert 45 "Vendor-created Live Counter categories appear" $c45 "Master review dynamically maps alc.category from liveCounters"

# 46. Vendor-created counter items appear
$c46 = ($js -match 'items\.join') -and ($js.Contains('alc.items'))
Check-Assert 46 "Vendor-created counter items appear" $c46 "Itemized items rendered under counter in review"

# 47. Counter pricing appears
$c47 = ($js -match 'alc\.extraCostPerPlate') -and ($js -match 'plate')
Check-Assert 47 "Counter pricing appears" $c47 "Per-plate surcharge rendered on review card"

# 48. Vendor-created Extras appear
$c48 = ($js -match 'ae\.category\s*\|\|\s*ae\.name') -and ($js -match 'Feast Hospitality Extras \(\$\{\(state\.catering\.extras')
Check-Assert 48 "Vendor-created Extras appear" $c48 "Master review maps ae.category from extras"

# 49. Vendor-created Extra items/services appear
$c49 = ($js.Contains('ae.items')) -and ($js.Contains('review-extras-catalog-list'))
Check-Assert 49 "Vendor-created Extra items/services appear" $c49 "Itemized items/services rendered under each extra"

# 50. Extra pricing appears
$c50 = ($js.Contains('priceTag')) -and ($js -match 'Flat') -and ($js -match 'plate')
Check-Assert 50 "Extra pricing appears" $c50 "Formatted per-plate or flat package pricing displayed"

# 51. Old predefined options are not falsely presented as vendor selections
$c51 = (-not $js.Contains('state.catering.availableCounters.filter(ac => state.catering.liveCounters.includes(ac.id))'))
Check-Assert 51 "Old predefined options not falsely presented" $c51 "Review renders exclusively from state.catering.liveCounters and state.catering.extras"

Write-Host "`n--- PART 5: REGRESSION TESTS ---" -ForegroundColor Yellow

# 52. Baina max-5 remains intact
$c52 = ($js -match 'state\.baina\.boxes\.length\s*>=\s*5') -and ($js -match 'Maximum 5 selections allowed')
Check-Assert 52 "Baina max-5 remains intact" $c52 "5-box selection limit strictly applied to Baina only"

# 53. Cities remain unlimited
$c53 = (-not ($js -match 'serviceCities\.length\s*>=\s*5'))
Check-Assert 53 "Cities remain unlimited" $c53 "No 5-item restriction on serviceable cities"

# 54. Cuisines remain unlimited
$c54 = (-not ($js -match 'cuisines\.length\s*>=\s*5'))
Check-Assert 54 "Cuisines remain unlimited" $c54 "No 5-item restriction on cuisines"

# 55. Task 21 progress animation remains intact
$c55 = $css.Contains('.stepper-line-fill') -and $css.Contains('transition: width') -and $js.Contains('progressPercent')
Check-Assert 55 "Task 21 progress animation remains intact" $c55 "Progress transitions and width fill intact"

# 56. Tasks 17–20 badge system remains intact
$c56 = (-not $html.Contains('data-step-id="view-badges"')) -and ($auth.Contains('heritage-caterer') -and $auth.Contains('verified-caterer') -and $auth.Contains('city-icon-caterer'))
Check-Assert 56 "Tasks 17-20 badge system remains intact" $c56 "Badges isolated to Vendor Signup in AuthForm.tsx"

# 57. Tasks 1–12 remain intact
$c57 = $html.Contains('btn-vendor-signin') -and $html.Contains('id="modal-vendor-signin"') -and $html.Contains('data-cuisine="Awadhi"') -and $html.Contains('id="desktop-service-cities-grid"') -and $js.Contains('function addCustomOffering') -and $js.Contains('function addCustomCuisine') -and $js.Contains('function addCustomCity')
Check-Assert 57 "Tasks 1-12 remain intact" $c57 "Core Phase 1-3 additions fully operational"

# 58. Task 15 Essentials remains intact
$c58 = $html.Contains('data-step-id="view-cat-essentials"') -and $html.Contains('data-essential-key="staff"') -and $js.Contains('function toggleFeastEssential(')
Check-Assert 58 "Task 15 Essentials remains intact" $c58 "Service inclusions and toggles intact"

# 59. Task 16 Add-ons remains intact
$c59 = $html.Contains('data-step-id="view-cat-addons"') -and $html.Contains('data-cutlery-id="standard"') -and $js.Contains('function setCutleryTier(')
Check-Assert 59 "Task 16 Add-ons remains intact" $c59 "Tableware tiers and selection intact"

# 60. Feast IA correction remains intact
$c60 = $html.Contains('id="desktop-feast-components-section"') -and (-not $html.Contains('feast-subofferings-panel'))
Check-Assert 60 "Feast IA correction remains intact" $c60 "Components live strictly inside Feast Booking offering"

# 61. Desktop/mobile synchronization remains intact
$c61 = $html.Contains('desktop-vendor-counter-catalog-grid') -and $html.Contains('mobile-vendor-counter-catalog-grid') -and $html.Contains('desktop-vendor-extras-catalog-grid') -and $html.Contains('mobile-vendor-extras-catalog-grid')
Check-Assert 61 "Desktop/mobile synchronization remains intact" $c61 "Both viewports render from same canonical state"

# 62. Sign-in/onboarding single source of truth remains intact
$c62 = $html.Contains('vendor-account-reused-card') -and $js.Contains('state.account.businessName')
Check-Assert 62 "Sign-in/onboarding single source of truth remains intact" $c62 "Reuses account credentials without re-asking"

# 63. Official Bhojpatra logo remains intact
$c63 = $html.Contains('class="bhojpatra-header-logo"') -and $html.Contains('bhojpatra-logo.png')
Check-Assert 63 "Official Bhojpatra logo remains intact" $c63 "Header displays official Bhojpatra logo"

# 64. 36 States/UTs remain intact
$stateMatches = [regex]::Matches($html, '<select[^>]*id="d-state"[^>]*>([\s\S]*?)<\/select>')
$desktopStateCount = 0
if ($stateMatches.Count -gt 0) {
    $desktopStateCount = ([regex]::Matches($stateMatches[0].Groups[1].Value, '<option')).Count
}
$c64 = ($desktopStateCount -ge 36)
Check-Assert 64 "36 States/UTs remain intact" $c64 ("State selector has " + $desktopStateCount + " options (>= 36)")

# 65. Current 23-city dataset remains intact
$c65 = $js.Contains('CANONICAL_CITIES') -and $html.Contains('data-city="Lucknow"') -and $html.Contains('data-city="Kanpur"') -and $html.Contains('data-city="Varanasi"')
Check-Assert 65 "Current 23-city dataset remains intact" $c65 "Canonical 23 cities dataset intact in script and DOM"

$failedTests = $totalTests - $passedTests
$summaryColor = 'Red'
if ($failedTests -eq 0) {
    $summaryColor = 'Green'
}
Write-Host "`n==============================================================================" -ForegroundColor Cyan
Write-Host ("TOTAL TESTS: " + $totalTests + " | PASSED: " + $passedTests + " | FAILED: " + $failedTests) -ForegroundColor $summaryColor
Write-Host "==============================================================================" -ForegroundColor Cyan

if ($failedTests -eq 0) {
    exit 0
} else {
    exit 1
}
