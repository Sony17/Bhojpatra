$html = Get-Content -Raw "mockups/vendor-registration-v2/index.html"
$script:passed = 0
$script:total = 0

function Check([string]$desc, [bool]$cond) {
    $script:total++
    if ($cond) {
        $script:passed++
        Write-Host ("  [PASS] {0}" -f $desc) -ForegroundColor Green
    } else {
        Write-Host ("  [FAIL] {0}" -f $desc) -ForegroundColor Red
    }
}

Write-Host "=========================================================="
Write-Host "BHOJPATRA V2 ONBOARDING: PART 2 POST-CLEANUP SANITY CHECK"
Write-Host "=========================================================="

# Check 1: No broken or obviously awkward empty containers
$emptyBadges = [bool]($html -match '<span class="badge">\s*</span>')
$emptyPills = [bool]($html -match '<span class="badge-pill">\s*</span>')
$emptyCardTitles = [bool]($html -match '<div class="card-title-row">\s*</div>')
Check "No empty badge elements remaining" (-not $emptyBadges)
Check "No empty badge-pill elements remaining" (-not $emptyPills)
Check "No empty card-title-row elements remaining" (-not $emptyCardTitles)

# Check 2: Card layouts still align correctly
$cHeader = [bool]($html -match '<div class="wizard-header-help">\s*<button type="button" class="btn-vendor-signin"')
Check "Header .wizard-header-help has valid structure" $cHeader

$cDietGrid = [bool]($html -match 'id="desktop-diet-section"[\s\S]*?class="diet-choice-grid"')
Check "Desktop diet section has valid card grid" $cDietGrid

$cCuisineGrid = [bool]($html -match 'id="desktop-cuisine-chips"[\s\S]*?class="chip-custom-adder"')
Check "Desktop cuisine section has valid chip grid" $cCuisineGrid

$cCityGrid = [bool]($html -match 'id="desktop-service-cities-grid"[\s\S]*?class="chip-custom-adder"')
Check "Desktop service cities has valid grid" $cCityGrid

$cCutleryGrid = [bool]($html -match 'cutlery-tier-grid[\s\S]*?Package A[\s\S]*?Package B[\s\S]*?Package C[\s\S]*?Package D')
Check "Feast Tableware cutlery-tier-grid has all 4 packages" $cCutleryGrid

# Check 3: Headings, labels, helper text visually associated
$cDietReq = [bool]($html -match 'Kitchen Dietary Offering <span class="required">\*</span>')
Check "Dietary section has required indicator" $cDietReq

$cCityLabel = [bool]($html -match 'for="d-city">Primary Kitchen City[\s\S]*?<select id="d-city"')
Check "Primary kitchen city has label and select" $cCityLabel

$cLeadLabel = [bool]($html -match 'for="cat-lead-hours">Minimum Preparation Notice[\s\S]*?<select id="cat-lead-hours"')
Check "Lead hours notice has label and select" $cLeadLabel

$cGstLabel = [bool]($html -match 'for="d-gst">GSTIN[\s\S]*?<input type="text" id="d-gst"')
Check "GST has label and input" $cGstLabel

$cFssaiLabel = [bool]($html -match 'for="d-fssai">FSSAI[\s\S]*?<input type="text" id="d-fssai"')
Check "FSSAI has label and input" $cFssaiLabel

# Check 4: No stakeholder / internal architecture copy
$cSony1 = [bool]($html -match 'Sony emphasized:')
Check "Zero occurrences of 'Sony emphasized:'" (-not $cSony1)

$cSony2 = [bool]($html -match 'Sony requested:')
Check "Zero occurrences of 'Sony requested:'" (-not $cSony2)

$cArchNote = [bool]($html -match 'Vendor Profile Architecture Note')
Check "Zero occurrences of 'Vendor Profile Architecture Note'" (-not $cArchNote)

$cSeqTier = [bool]($html -match 'Sequential single-tier onboarding')
Check "Zero occurrences of 'Sequential single-tier onboarding'" (-not $cSeqTier)

$cMandGate = [bool]($html -match 'Mandatory Initial Gate')
Check "Zero occurrences of 'Mandatory Initial Gate'" (-not $cMandGate)

$cPkgBadge = [bool]($html -match 'Bhojpatra Packages A')
Check "Zero occurrences of Bhojpatra Packages A" (-not $cPkgBadge)

$cCrewBadge = [bool]($html -match 'Included Service Crew')
Check "Zero occurrences of 'Included Service Crew'" (-not $cCrewBadge)

$cConcierge = [bool]($html -match 'Chat with Concierge')
Check "Zero occurrences of 'Chat with Concierge' in onboarding" (-not $cConcierge)

# Check 5: Single Stall Category & Menu flow intact
$cStallCatStep = [bool]($html -match 'data-step-id="view-stall-categories"')
Check "Single Stall categories step container present" $cStallCatStep

$cStallCatGrid = [bool]($html -match 'id="desktop-stall-categories-grid"')
Check "Single Stall categories grid container present" $cStallCatGrid

$cStallCatInput = [bool]($html -match 'id="desktop-custom-stall-cat-input"')
Check "Single Stall custom category input present" $cStallCatInput

$cStallMenuStep = [bool]($html -match 'data-step-id="view-stall-menu"')
Check "Single Stall menu step container present" $cStallMenuStep

$cStallMenuSwitch = [bool]($html -match 'id="desktop-stall-menu-cat-switcher"')
Check "Single Stall category switcher present" $cStallMenuSwitch

$cStallItemsGrid = [bool]($html -match 'id="desktop-stall-category-items-grid"')
Check "Single Stall items grid present" $cStallItemsGrid

$cStallAddBtn = [bool]($html -match 'id="desktop-btn-add-stall-item"')
Check "Single Stall item add button present" $cStallAddBtn

$cStallItemModal = [bool]($html -match 'id="modal-stall-item-editor"')
Check "Single Stall item modal present" $cStallItemModal

# Check 6: Feast configuration screens intact
$cCatBasics = [bool]($html -match 'data-step-id="view-cat-basics"')
Check "Feast Basics step present" $cCatBasics

$cCatTiers = [bool]($html -match 'data-step-id="view-cat-tiers"')
Check "Feast Tiers step present" $cCatTiers

$cCatCourses = [bool]($html -match 'data-step-id="view-cat-courses"')
Check "Feast Courses step present" $cCatCourses

$cCatDishes = [bool]($html -match 'data-step-id="view-cat-dishes"')
Check "Feast Dishes step present" $cCatDishes

$cLiveCounters = [bool]($html -match 'id="desktop-vendor-counter-catalog-grid"')
Check "Feast Live Counters catalog grid present" $cLiveCounters

$cExtras = [bool]($html -match 'id="desktop-vendor-extras-catalog-grid"')
Check "Feast Extras catalog grid present" $cExtras

$cEssentials = [bool]($html -match 'id="desktop-feast-essentials-row"')
Check "Feast Essentials row present" $cEssentials

$cAddons = [bool]($html -match 'data-step-id="view-cat-addons"')
Check "Feast Addons step present" $cAddons

# Check 7: Completion screen layout coherent
$cCompleteStep = [bool]($html -match 'data-step-id="view-complete"')
Check "Completion step present" $cCompleteStep

$cCompleteCheck = [bool]($html -match 'Registration successfully submitted!')
Check "Completion success headline present" $cCompleteCheck

$cCompleteId = [bool]($html -match 'VEN-884291')
Check "Completion vendor ID box present" $cCompleteId

$cCompleteDash = [bool]($html -match 'view-dashboard')
Check "Completion enter dashboard button present" $cCompleteDash

$cCompletePreview = [bool]($html -match 'openStorefrontPreview')
Check "Completion preview button present" $cCompletePreview

$cCompleteRestart = [bool]($html -match 'view-details')
Check "Completion restart button present" $cCompleteRestart

# Check 8: Navigation, IDs, buttons intact
$cBackBtn = [bool]($html -match 'id="btn-desktop-back"')
Check "Desktop back button present" $cBackBtn

$cNextBtn = [bool]($html -match 'id="btn-desktop-next"')
Check "Desktop next button present" $cNextBtn

$cRevContainer = [bool]($html -match 'id="master-review-content"')
Check "Master review container present" $cRevContainer

$cMobRevContainer = [bool]($html -match 'id="mobile-master-review-content"')
Check "Mobile master review container present" $cMobRevContainer

Write-Host "=========================================================="
Write-Host ("SANITY CHECK RESULT: {0} / {1} passed" -f $script:passed, $script:total)
if ($script:passed -eq $script:total) {
    Write-Host "SANITY CHECK PASSED WITH ZERO REGRESSIONS!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "SANITY CHECK FAILED!" -ForegroundColor Red
    exit 1
}
