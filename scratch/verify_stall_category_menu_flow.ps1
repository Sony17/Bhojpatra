# ==============================================================================
# Bhojpatra V2 Vendor Partner Onboarding — Single Stall Dynamic Flow Verification
# Tests Category Selection, Dedicated Menus, Persistence, Validation, & Review Grouping
# ==============================================================================

$ErrorActionPreference = "Stop"

$htmlPath = "mockups/vendor-registration-v2/index.html"
$cssPath  = "mockups/vendor-registration-v2/styles.css"
$jsPath   = "mockups/vendor-registration-v2/script.js"
$tsPath   = "src/lib/vendorMenus.ts"

if (!(Test-Path $htmlPath) -or !(Test-Path $cssPath) -or !(Test-Path $jsPath) -or !(Test-Path $tsPath)) {
    Write-Error "Required files missing for verification."
    exit 1
}

$html = Get-Content $htmlPath -Raw
$css  = Get-Content $cssPath -Raw
$js   = Get-Content $jsPath -Raw
$ts   = Get-Content $tsPath -Raw

$passed = 0
$failed = 0
$total = 0

function Check-Assert($id, $desc, $condition, $detail) {
    $script:total++
    if ($condition) {
        $script:passed++
        Write-Host "  [PASS] Test $id : $desc" -ForegroundColor Green
    } else {
        $script:failed++
        Write-Host "  [FAIL] Test $id : $desc" -ForegroundColor Red
        Write-Host "         Detail: $detail" -ForegroundColor Yellow
    }
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  RUNNING BHOJPATRA V2 SINGLE STALL CATEGORY & MENU VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# ── 1. TypeScript Types Verification ──
$t1 = $ts.Contains("interface SingleStallCategory") -and $ts.Contains("interface SingleStallMenuItem") -and $ts.Contains("type SingleStallMenuMap")
Check-Assert 1 "Single Stall TypeScript Interfaces Exported" $t1 "vendorMenus.ts must export SingleStallCategory, SingleStallMenuItem, and SingleStallMenuMap"

# ── 2. Mockup HTML Step Containers ──
$t2_desktop_cat = $html.Contains('id="desktop-stall-categories-grid"') -and $html.Contains('data-step-id="view-stall-categories"')
Check-Assert 2 "Desktop Stall Categories Container Present" $t2_desktop_cat "index.html has desktop container for view-stall-categories"

$t2_desktop_menu = $html.Contains('id="desktop-stall-menu-cat-switcher"') -and $html.Contains('id="desktop-stall-category-items-grid"')
Check-Assert 3 "Desktop Stall Menu Builder Container Present" $t2_desktop_menu "index.html has desktop switcher and items grid for stall menu"

$t2_mobile_cat = $html.Contains('id="mobile-stall-categories-grid"') -and $html.Contains('id="mobile-custom-stall-cat-input"')
Check-Assert 4 "Mobile Stall Categories Container Present" $t2_mobile_cat "index.html has mobile container and custom category input"

$t2_mobile_menu = $html.Contains('id="mobile-stall-menu-cat-switcher"') -and $html.Contains('id="mobile-stall-category-items-grid"')
Check-Assert 5 "Mobile Stall Menu Builder Container Present" $t2_mobile_menu "index.html has mobile switcher and items grid for stall menu"

$t2_modal = $html.Contains('id="modal-stall-item-editor"') -and $html.Contains('id="stall-item-input-name"') -and $html.Contains('id="stall-item-input-price"')
Check-Assert 6 "Stall Menu Item Editor Modal Present" $t2_modal "index.html has modal-stall-item-editor with name and price fields"

$t2_jump = $html.Contains('value="view-stall-categories"') -and $html.Contains('value="view-stall-menu"')
Check-Assert 7 "Prototype Jump Dropdown Options Present" $t2_jump "index.html step jump dropdown includes view-stall-categories and view-stall-menu"

# ── 3. Mockup CSS Styling ──
$t3_css = $css.Contains('.stall-categories-grid') -and $css.Contains('.stall-category-card') -and $css.Contains('.stall-menu-cat-switcher') -and $css.Contains('.stall-menu-item-card')
Check-Assert 8 "Single Stall CSS Stylesheet Rules Present" $t3_css "styles.css contains rules for categories grid, category cards, menu switcher, and item cards"

# ── 4. JavaScript State Model ──
$t4_state = $js.Contains('customStallCategories:') -and $js.Contains('selectedCategories:') -and $js.Contains('menus:')
Check-Assert 9 "State Stall Data Model Configured" $t4_state "state.stall contains customStallCategories, selectedCategories, and menus mapping"

# ── 5. Predefined Categories & Slug Helpers ──
$t5_predefined = $js.Contains('const PREDEFINED_STALL_CATEGORIES =') -and $js.Contains('function slugifyCategory(') -and $js.Contains('function resolveCategoryFromStepId(')
Check-Assert 10 "Predefined Categories and Slug Resolution Functions" $t5_predefined "script.js defines PREDEFINED_STALL_CATEGORIES, slugifyCategory, resolveCategoryFromStepId"

# ── 6. Category Selection Functions ──
$t6_cat_fn = $js.Contains('function toggleStallCategory(') -and $js.Contains('function submitCustomStallCategory(') -and $js.Contains('function removeCustomStallCategory(') -and $js.Contains('function renderStallCategoriesUI(')
Check-Assert 11 "Category Selection Controller Functions Present" $t6_cat_fn "script.js defines toggleStallCategory, submitCustomStallCategory, removeCustomStallCategory, and renderStallCategoriesUI"

# ── 7. Menu Item Management Functions ──
$t7_menu_fn = $js.Contains('function openStallItemEditor(') -and $js.Contains('function closeStallItemEditor(') -and $js.Contains('function saveStallItemEditor(') -and $js.Contains('function deleteStallMenuItem(') -and $js.Contains('function renderStallCategoryMenuUI(')
Check-Assert 12 "Menu Item CRUD Controller Functions Present" $t7_menu_fn "script.js defines openStallItemEditor, closeStallItemEditor, saveStallItemEditor, deleteStallMenuItem, and renderStallCategoryMenuUI"

# ── 8. Dynamic Step Routing in getActiveOnboardingSteps ──
$t8_active_steps = $js.Contains("if (state.selectedOfferings.includes('stall'))") -and $js.Contains("steps.push('view-stall-categories')") -and $js.Contains("view-stall-menu-${slugifyCategory(cat)}")
Check-Assert 13 "Dynamic getActiveOnboardingSteps Resolution" $t8_active_steps "Single Stall dynamically generates view-stall-categories and view-stall-menu for each selected category"

# ── 9. Validation Gates in nextStep ──
$t9_cat_gate = $js.Contains("if (cur === 'view-stall-categories')") -and $js.Contains("!state.stall.selectedCategories || state.stall.selectedCategories.length === 0")
Check-Assert 14 "Category Selection Gate (>= 1 Category Required)" $t9_cat_gate "nextStep blocks progression if 0 categories are selected"

$t9_menu_gate = $js.Contains("if (cur.startsWith('view-stall-menu'))") -and $js.Contains("catItems.length === 0")
Check-Assert 15 "Category Menu Gate (>= 1 Item Required Per Category)" $t9_menu_gate "nextStep blocks progression if the active category menu has 0 items"

# ── 10. Consolidated Master Review Itemized Grouping ──
$t10_review = $js.Contains("Single Stall Menus by Category") -and $js.Contains("stall-review-cat-card") -and $js.Contains("state.stall.selectedCategories.map(cat =>")
Check-Assert 16 "Master Review Itemized Category-Menu Grouping" $t10_review "renderMasterReview renders an itemized Category to Menu Items grouping for Single Stall"

# ── 11. Initial Lifecycle Sync in renderAllViews ──
$t11_render = $js.Contains("renderStallCategoriesUI();") -and $js.Contains("renderStallCategoryMenuUI();")
Check-Assert 17 "Lifecycle Initialization Sync in renderAllViews" $t11_render "renderAllViews invokes renderStallCategoriesUI and renderStallCategoryMenuUI"

# ── 12. Stepper & Breadcrumb Integration ──
$t12_stepper = $js.Contains("'view-stall-categories', 'view-stall-menu'") -and $js.Contains("stepId.startsWith('view-stall-menu')")
Check-Assert 18 "Stepper & Breadcrumbs Phase Integration" $t12_stepper "updateStepperProgress and updateSubnavBreadcrumbs map stall category and menu steps to phase-builder"

# ── 13. Duplicate Category Prevention Check ──
$t13_dup = $js.Contains("allExisting.includes(name.toLowerCase())")
Check-Assert 19 "Duplicate Category Prevention Enforced" $t13_dup "submitCustomStallCategory checks case-insensitive duplicate against predefined and existing custom categories"

# ── 14. Data Retention on Category Deselection Check ──
$t14_retention = $js.Contains("state.stall.selectedCategories.splice(idx, 1)") -and (-not $js.Contains("delete state.stall.menus[catName]"))
Check-Assert 20 "Category Deselection Data Retention" $t14_retention "toggleStallCategory removes category from selectedCategories without deleting its menu data"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "TOTAL TESTS: $total | PASSED: $passed | FAILED: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "======================================================================" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
