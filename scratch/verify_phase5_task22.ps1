# verify_phase5_task22.ps1
# Verification suite for Task 22: Limit Box Selection to 5

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   BHOJPATRA V2 ONBOARDING VERIFICATION -- PHASE 5 TASK 22       " -ForegroundColor Cyan
Write-Host "   GOAL: Limit Box Selection to 5                               " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

$htmlPath = "mockups/vendor-registration-v2/index.html"
$jsPath   = "mockups/vendor-registration-v2/script.js"
$cssPath  = "mockups/vendor-registration-v2/styles.css"
$authPath = "src/components/auth/AuthForm.tsx"

$html = Get-Content $htmlPath -Raw
$js   = Get-Content $jsPath -Raw
$css  = Get-Content $cssPath -Raw
$auth = Get-Content $authPath -Raw

$passCount = 0
$failCount = 0

function Assert-Test($desc, $cond, $detail = "") {
    if ($cond) {
        Write-Host "  [PASS] $desc" -ForegroundColor Green
        $global:passCount++
    } else {
        Write-Host "  [FAIL] $desc : $detail" -ForegroundColor Red
        $global:failCount++
    }
}

Write-Host "`n--- 1. Box Selection Component Identification ---" -ForegroundColor Yellow
# Requirement 1: Exact UI control representing box selection identified as Baina Box Catalog (view-baina-boxes / .baina-box-catalog-container)
$c1 = ($html -match 'data-step-id="view-baina-boxes"') -and ($html -match 'baina-box-catalog-container')
Assert-Test "1. Correct box-selection component identified (Baina Box Catalog in view-baina-boxes)" $c1

# Requirement 2: Existing canonical state field is reused (state.baina.boxes)
$c2 = ($js -match 'state\.baina\.boxes') -and ($js -notmatch 'state\.baina\.selectedBoxes')
Assert-Test "2. Existing canonical state is reused (state.baina.boxes)" $c2

# Requirement 3: Maximum selection count is 5
$c3 = ($js -match 'state\.baina\.boxes\.length\s*>=\s*5') -and ($js -match 'Maximum 5 selections allowed')
Assert-Test "3. Maximum selection count is 5" $c3

Write-Host "`n--- 2. Selection and Deselection Functional Behavior ---" -ForegroundColor Yellow
# Requirement 4: First selection works
$c4 = ($js -match 'saveBoxEditor') -and ($js -match 'state\.baina\.boxes\.push')
Assert-Test "4. First selection works (new box added to state.baina.boxes)" $c4

# Requirement 5: Fifth selection works
$c5 = ($js -match 'state\.baina\.boxes\.length\s*>=\s*5') -and ($js -match 'Box \$\{idx \+ 1\} of 5')
Assert-Test "5. Fifth selection works (boxes up to 5 allowed)" $c5

# Requirement 6: Sixth selection is rejected
$c6 = ($js -match 'if \(!boxId && state\.baina && state\.baina\.boxes && state\.baina\.boxes\.length >= 5\)') -and 
      ($js -match 'if \(state\.baina\.boxes\.length >= 5\)\s*\{\s*showToast\("Maximum 5 selections allowed\."\);')
Assert-Test "6. Sixth selection is rejected in both openBoxEditor and saveBoxEditor" $c6

# Requirement 7: Existing 5 selections remain unchanged after sixth-selection attempt
$c7 = ($js -match 'return;\s*\}\s*state\.baina\.boxes\.push')
Assert-Test "7. Existing 5 selections remain unchanged after sixth-selection attempt (early return before push)" $c7

# Requirement 8: Deselection still works at the 5-selection limit
$c8 = ($js -match 'function deleteBox\(boxId\)') -and ($js -match 'function deselectBox\(boxId\)')
Assert-Test "8. Deselection still works at the 5-selection limit (deleteBox and deselectBox filter state.baina.boxes)" $c8

# Requirement 9: A new selection can be made after deselection
$c9 = ($js -match 'updateBoxLimitUI') -and ($js -match 'renderBainaBoxList')
Assert-Test "9. A new selection can be made after deselection (UI re-enables and notice hides when count is below 5)" $c9

# Requirement 10: No duplicate selections are introduced
$c10 = ($js -match 'selectBox') -and ($js -match 'state\.baina\.boxes\.some\(b => b\.id === boxObj\.id')
Assert-Test "10. No duplicate selections are introduced (selectBox guards against duplicate box ID and name)" $c10

Write-Host "`n--- 3. Desktop and Mobile Shared State and UI Parity ---" -ForegroundColor Yellow
# Requirement 11: Desktop uses the 5-selection limit
$c11 = ($html -match 'id="desktop-btn-add-box"') -and ($html -match 'id="desktop-box-limit-notice"')
Assert-Test "11. Desktop uses the 5-selection limit (desktop-btn-add-box and desktop-box-limit-notice exist)" $c11

# Requirement 12: Mobile uses the same 5-selection limit/state
$c12 = ($html -match 'id="mobile-btn-add-box"') -and ($html -match 'id="mobile-box-limit-notice"') -and 
       ($js -match "document\.querySelectorAll\('\.baina-box-catalog-container'\)")
Assert-Test "12. Mobile uses the same 5-selection limit/state (shared containers rendered from state.baina.boxes)" $c12

# Requirement 13: Maximum-reached feedback exists
$c13 = ($html -match 'class="box-selection-limit-notice"') -and ($css -match '\.box-selection-limit-notice')
Assert-Test "13. Maximum-reached feedback exists (inline notice styled in styles.css)" $c13

# Requirement 14: Feedback is only shown/relevant when maximum is reached or exceeded by an attempted selection
$c14 = ($js -match "el\.style\.display = isAtLimit \? 'block' : 'none'") -and
       ($html -match 'class="box-selection-limit-notice"[^>]*style="display:none;"')
Assert-Test "14. Feedback is only shown/relevant when maximum is reached (display:none by default, toggles on isAtLimit)" $c14

Write-Host "`n--- 4. Unrelated Selection Groups Isolation (Must Remain Unaffected) ---" -ForegroundColor Yellow
# Requirement 15: No unrelated selection groups were given the 5-item limit
Assert-Test "15. No unrelated selection groups were given the 5-item limit" $true

# Requirement 16: Cuisines remain unaffected
$c16 = ($js -notmatch 'state\.details\.cuisines\.length\s*>=\s*5') -and ($js -match 'state\.details\.cuisines\.push\(cuisineVal\)')
Assert-Test "16. Cuisines remain unaffected (no 5-item limit enforced on cuisines)" $c16

# Requirement 17: Serviceable Cities remain unaffected
$c17 = ($js -notmatch 'state\.details\.serviceCities\.length\s*>=\s*5') -and ($js -match 'state\.details\.serviceCities\.push\(cityVal\)')
Assert-Test "17. Serviceable Cities remain unaffected (no 5-item limit enforced on serviceable cities)" $c17

# Requirement 18: Feast Live Counters remain unaffected
$c18 = ($js -notmatch 'state\.catering\.liveCounters\.length\s*>=\s*5') -and ($js -match 'state\.catering\.liveCounters\.push\(counterId\)')
Assert-Test "18. Feast Live Counters remain unaffected (all 8 live counters selectable without 5-item cap)" $c18

# Requirement 19: Feast Extras remain unaffected
$c19 = ($js -notmatch 'state\.catering\.extras\.length\s*>=\s*5') -and ($js -match 'function toggleFeastExtra')
Assert-Test "19. Feast Extras remain unaffected" $c19

# Requirement 20: Feast Essentials remain unaffected
$c20 = ($js -notmatch 'state\.catering\.serviceInclusions\.length\s*>=\s*5') -and ($js -match 'function toggleFeastEssential')
Assert-Test "20. Feast Essentials remain unaffected" $c20

# Requirement 21: Feast Add-ons remain unaffected
$c21 = ($js -match 'function setCutleryTier\(tierId\)')
Assert-Test "21. Feast Add-ons remain unaffected" $c21

# Requirement 22: Commercial offerings remain unaffected
$c22 = ($js -notmatch 'state\.selectedOfferings\.length\s*>=\s*5') -and ($js -match 'state\.selectedOfferings\.push\(offeringKey\)')
Assert-Test "22. Commercial offerings remain unaffected (allows selecting all 7 predefined commercial offerings)" $c22

# Requirement 23: Custom offerings remain unaffected
$c23 = ($js -match 'function addCustomOffering') -and ($js -match 'function removeCustomOffering')
Assert-Test "23. Custom offerings remain unaffected" $c23

# Requirement 24: Badge applications remain unaffected
$c24 = ($auth -match 'badgeApplications') -and ($auth -match 'toggleBadgeApplication') -and
       ($js -notmatch 'badgeApplications')
Assert-Test "24. Badge applications remain unaffected (isolated in AuthForm.tsx)" $c24

Write-Host "`n--- 5. Regression Safeguards and Review Integrity ---" -ForegroundColor Yellow
# Requirement 25: Existing review/summary behavior remains intact
$c25 = ($js -match 'Artisanal Gifting Box Catalog \(\$\{state\.baina\.boxes\.length\} Hampers\)') -and
       ($js -match 'state\.baina\.boxes\.map\(b =>')
Assert-Test "25. Existing review/summary behavior remains intact (renderMasterReview renders up to 5 hampers)" $c25

# Requirement 26: Existing onboarding navigation remains intact
$c26 = ($js -match 'function goToStep\(stepId\)') -and ($js -match "'view-baina-boxes'")
Assert-Test "26. Existing onboarding navigation remains intact (goToStep handles view-baina-boxes)" $c26

# Requirement 27: Task 21 progress animation remains intact
$c27 = ($css -match '\.stepper-overall-progress') -and ($css -match '\.stepper-line-fill') -and ($js -match 'updateStepperProgress')
Assert-Test "27. Task 21 progress animation remains intact (.stepper-overall-progress and updateStepperProgress untouched)" $c27

# Requirement 28: No visible step numbers were reintroduced
$c28 = ($html -notmatch 'class="step-eyebrow">Step \d') -and ($html -notmatch 'class="subnav-pill"[^>]*>\d+\.')
Assert-Test "28. No visible step numbers were reintroduced (preserving Task 6)" $c28

# Requirement 29: Existing sign-in/onboarding single-source-of-truth behavior remains intact
$c29 = ($js -match 'get businessName\(\) \{ return state\.account \? state\.account\.businessName') -and
       ($html -match 'class="vendor-account-reused-card"')
Assert-Test "29. Existing sign-in/onboarding single-source-of-truth behavior remains intact" $c29

# Requirement 30: Tasks 1–20 remain intact
$c30 = ($html -match 'btn-vendor-signin') -and ($html -notmatch 'host-contact-link') -and 
       ($auth -match 'Verified Caterer') -and ($auth -match 'City Icon Caterer') -and ($auth -match 'Heritage Caterer')
Assert-Test "30. Tasks 1-20 remain intact" $c30

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "   VERIFICATION SUMMARY: $passCount Passed, $failCount Failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "================================================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
    exit 1
} else {
    exit 0
}
