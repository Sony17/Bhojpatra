# ==============================================================================
# Focused Verification Script: Bhojpatra V2 Single Stall Menus Consolidation
# Validates all 20 required criteria from Section 24 of Sony Single Stall spec
# ==============================================================================

$htmlPath = "c:\Users\Zeeshaan\Bhojpatra\mockups\vendor-registration-v2\index.html"
$jsPath   = "c:\Users\Zeeshaan\Bhojpatra\mockups\vendor-registration-v2\script.js"
$cssPath  = "c:\Users\Zeeshaan\Bhojpatra\mockups\vendor-registration-v2\styles.css"
$tsPath   = "c:\Users\Zeeshaan\Bhojpatra\src\lib\vendorMenus.ts"

$html = Get-Content $htmlPath -Raw
$js   = Get-Content $jsPath -Raw
$css  = Get-Content $cssPath -Raw
$ts   = Get-Content $tsPath -Raw

$allPassed = $true
$results = @()

function Test-Check($num, $name, $condition, $failMsg) {
    if ($condition) {
        $global:results += [PSCustomObject]@{ Check = $num; Name = $name; Status = "PASS"; Details = "Verified successfully" }
        Write-Host " [PASS] Check $num : $name" -ForegroundColor Green
    } else {
        $global:allPassed = $false
        $global:results += [PSCustomObject]@{ Check = $num; Name = $name; Status = "FAIL"; Details = $failMsg }
        Write-Host " [FAIL] Check $num : $name - $failMsg" -ForegroundColor Red
    }
}

Write-Host "`n=== RUNNING 20-POINT SINGLE STALL VERIFICATION ===`n" -ForegroundColor Cyan

# 1. Menus exists (view-stall-menu)
$c1 = ($html -match 'data-step-id="view-stall-menu"') -and ($js -match 'view-stall-menu')
Test-Check 1 "Menus exists (view-stall-menu)" $c1 "view-stall-menu step missing from index.html or script.js"

# 2. Stall category selection exists
$c2 = ($html -match 'id="desktop-stall-categories-grid"') -and ($js -match 'function renderStallCategoriesUI')
Test-Check 2 "Stall category selection exists" $c2 "Category selection grid or renderStallCategoriesUI missing"

# 3. Multiple stall categories supported
$c3 = ($js -match 'PREDEFINED_STALL_CATEGORIES') -and ($js -match 'selectedCategories') -and ($js -match 'submitCustomStallCategory')
Test-Check 3 "Multiple stall categories supported" $c3 "Predefined list, selectedCategories array, or custom adder missing"

# 4. Per-category menu state exists
$c4 = ($js -match 'menus:\s*\{') -and ($js -match 'categoryPricing:\s*\{')
Test-Check 4 "Per-category menu state exists" $c4 "state.stall.menus or state.stall.categoryPricing missing"

# 5. Dish image field exists
$c5 = ($html -match 'id="stall-item-input-photo"') -and ($html -match 'Photo URL')
Test-Check 5 "Dish image field exists" $c5 "Dish photo input missing in item editor modal"

# 6. Dish name field exists
$c6 = ($html -match 'id="stall-item-input-name"') -and ($html -match 'Dish Name')
Test-Check 6 "Dish name field exists" $c6 "Dish name input missing in item editor modal"

# 7. Dish description field exists
$c7 = ($html -match 'id="stall-item-input-desc"') -and ($html -match 'Dish Description')
Test-Check 7 "Dish description field exists" $c7 "Dish description input missing in item editor modal"

# 8. Dish per-plate price exists
$c8 = ($html -match 'id="stall-item-input-price"') -and ($html -match 'dish cost') -and ($js -match '/ plate')
Test-Check 8 "Dish per-plate price exists" $c8 "Dish per-plate price input or formatting missing"

# 9. Veg/Non-Veg selection exists
$c9 = ($html -match 'id="stall-item-input-diet"') -and ($html -match 'value="veg"') -and ($html -match 'value="non-veg"')
Test-Check 9 "Veg/Non-Veg selection exists" $c9 "Dietary select input missing in item editor modal"

# 10. Add/Edit/Delete dish functionality represented
$c10 = ($js -match 'function openStallItemEditor') -and ($js -match 'function saveStallItemEditor') -and ($js -match 'function deleteStallMenuItem')
Test-Check 10 "Add/Edit/Delete dish functionality represented" $c10 "openStallItemEditor, saveStallItemEditor, or deleteStallMenuItem missing"

# 11. Stall-level pricing exists inside each stall configuration
$c11 = ($html -match 'id="desktop-stall-fixed-rate"') -and ($html -match 'id="desktop-stall-pricing-pax-card"') -and ($js -match 'getStallPricing')
Test-Check 11 "Stall-level pricing exists inside each stall configuration" $c11 "Fixed per-plate rate input or card missing in view-stall-menu"

# 12. Pax exists inside each stall configuration
$c12 = ($html -match 'id="desktop-stall-min-pax"') -and ($js -match 'minPaxGuarantee')
Test-Check 12 "Pax exists inside each stall configuration" $c12 "Minimum pax guarantee input missing in view-stall-menu"

# 13. Dish information appears before stall pricing/Pax
$idxDishes = $html.IndexOf('id="desktop-stall-category-items-grid"')
$idxPricing = $html.IndexOf('id="desktop-stall-pricing-pax-card"')
$c13 = ($idxDishes -gt 0) -and ($idxPricing -gt 0) -and ($idxDishes -lt $idxPricing)
Test-Check 13 "Dish information appears before stall pricing/Pax" $c13 "Dishes grid ($idxDishes) is not positioned before pricing card ($idxPricing)"

# 14. No global/total Single Stall Pricing & Pax section
$c14 = ($js -notmatch "'view-stall-pricing'") -and ($js -notmatch '"view-stall-pricing"')
Test-Check 14 "No global/total Single Stall Pricing & Pax section" $c14 "view-stall-pricing still referenced in step sequence"

# 15. Stall Identity is no longer an active onboarding step
$c15 = ($js -notmatch "'view-stall-basics'") -and ($js -notmatch '"view-stall-basics"')
Test-Check 15 "Stall Identity is no longer an active onboarding step" $c15 "view-stall-basics still referenced in step sequence"

# 16. Delicacies Catalog is no longer an active onboarding step
$c16 = ($js -notmatch "'view-stall-delicacies'") -and ($js -notmatch '"view-stall-delicacies"')
Test-Check 16 "Delicacies Catalog is no longer an active onboarding step" $c16 "view-stall-delicacies still referenced in step sequence"

# 17. Pricing & Pax Total/Global is no longer an active onboarding step
$jumpOptions = $html -match '<option value="view-stall-pricing"'
$c17 = (-not $jumpOptions)
Test-Check 17 "Pricing & Pax Total/Global is no longer in jump dropdown" $c17 "view-stall-pricing still present in prototype-step-jump dropdown"

# 18. Menus transitions directly to Live & Cutlery
$c18 = ($js -match "if \(cur === 'view-stall-menu'\) \{[\s\S]*?goToStep\('view-stall-live'\);") -and
       ($js -match "if \(cur === 'view-stall-live'\) \{ goToStep\('view-stall-menu'\);")
Test-Check 18 "Menus transitions directly to Live & Cutlery" $c18 "view-stall-menu does not transition directly to/from view-stall-live"

# 19. Live & Cutlery remains present and unchanged
$c19 = ($html -match 'data-step-id="view-stall-live"') -and ($html -match 'Live Cooking Equipment Included') -and ($html -match 'Stall Tableware & Disposables Inclusions')
Test-Check 19 "Live & Cutlery remains present and unchanged" $c19 "view-stall-live content missing or modified in index.html"

# 20. Category-specific data structures remain independent
$c20 = ($ts -match 'export interface SingleStallCategoryPricing') -and 
       ($ts -match 'export type SingleStallCategoryPricingMap') -and
       ($ts -match 'export interface SingleStallCategoryConfig') -and
       ($js -match 'state\.stall\.categoryPricing\[catName\]')
Test-Check 20 "Category-specific data structures remain independent" $c20 "TypeScript types or independent categoryPricing storage missing"

Write-Host "`n================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host " ALL 20 CRITERIA PASSED! CONSOLIDATION VERIFIED." -ForegroundColor Green
} else {
    Write-Host " SOME CHECKS FAILED. PLEASE REVIEW ABOVE." -ForegroundColor Red
}
Write-Host "================================================`n" -ForegroundColor Cyan

exit $(if ($allPassed) { 0 } else { 1 })
