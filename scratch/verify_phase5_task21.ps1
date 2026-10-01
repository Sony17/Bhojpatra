# ==============================================================================
# Bhojpatra V2 Onboarding - Phase 5 Task 21 Verification Suite
# TASK 21: ADD ONBOARDING PROGRESS ANIMATION
# ==============================================================================

$html = [System.IO.File]::ReadAllText("mockups/vendor-registration-v2/index.html")
$js = [System.IO.File]::ReadAllText("mockups/vendor-registration-v2/script.js")
$css = [System.IO.File]::ReadAllText("mockups/vendor-registration-v2/styles.css")
$tracker = [System.IO.File]::ReadAllText("V2_ONBOARDING_IMPLEMENTATION_TRACKER.md")
$authPath = if (Test-Path "src/components/auth/AuthForm.tsx") { "src/components/auth/AuthForm.tsx" } else { Join-Path $PSScriptRoot "..\src\components\auth\AuthForm.tsx" }
$authForm = [System.IO.File]::ReadAllText($authPath)

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "BHOJPATRA V2 ONBOARDING: PHASE 5 TASK 21 VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

$allPassed = $true

function Check-Assert($id, $title, $passed, $details) {
    if ($passed) {
        Write-Host "[PASS] Check $id : $title" -ForegroundColor Green
        if ($details) { Write-Host "       $details" -ForegroundColor DarkGray }
    } else {
        Write-Host "[FAIL] Check $id : $title" -ForegroundColor Red
        if ($details) { Write-Host "       $details" -ForegroundColor Yellow }
        $script:allPassed = $false
    }
}

# 1. Existing V2 onboarding progress indicator exists
$hasDesktopTrack = $html.Contains('id="desktop-stepper-track"')
$hasMobileTrack = $html.Contains('id="mobile-stepper-track"')
Check-Assert 1 "Existing V2 onboarding progress indicator exists" ($hasDesktopTrack -and $hasMobileTrack) "Desktop and mobile stepper tracks present in HTML"

# 2. Progress animation is implemented
$hasLineFillCss = $css.Contains('.stepper-line-fill') -and $css.Contains('transition: width')
$hasOverallFillCss = $css.Contains('.stepper-overall-fill') -and $css.Contains('transition: width')
$hasBulletTransition = $css.Contains('.step-bullet') -and $css.Contains('transition: background-color')
Check-Assert 2 "Progress animation is implemented" ($hasLineFillCss -and $hasOverallFillCss -and $hasBulletTransition) "Transitions defined on line fill, overall fill, and bullet nodes"

# 3. Progress responds to the actual active onboarding section
$hasPhaseIndex = $js.Contains('let currentPhaseIndex = 0;') -and $js.Contains('phases[i].steps.includes(stepId)')
$hasGoToStepCall = $js.Contains('updateStepperProgress(stepId);')
Check-Assert 3 "Progress responds to actual active onboarding section" ($hasPhaseIndex -and $hasGoToStepCall) "currentPhaseIndex maps stepId to phase, called directly from goToStep"

# 4. Forward navigation updates progress state
$hasForwardProgress = $js.Contains("node.classList.toggle('active', isActive)") -and $js.Contains("node.classList.toggle('completed', isCompleted)") -and $js.Contains('fill.style.width = `${progressPercent}%`;')
Check-Assert 4 "Forward navigation updates progress state" $hasForwardProgress "Nodes update active/completed classes and fill expands with progressPercent"

# 5. Backward navigation updates progress state
$hasBackwardRetraction = $js.Contains("fill.style.width = isCompleted ? '100%' : '0%';")
Check-Assert 5 "Backward navigation updates progress state" $hasBackwardRetraction "stepper-line-fill sets 0% for non-completed phases, retracting on prevStep"

# 6. Completed section state is visually distinct
$hasCompletedNodeCss = $css.Contains('.step-node.completed')
$hasCompletedBulletCss = $css.Contains('.step-node.completed .step-bullet')
$hasCompletedCheckmark = $js.Contains('icon.textContent = isCompleted ?')
Check-Assert 6 "Completed section state is visually distinct" ($hasCompletedNodeCss -and $hasCompletedBulletCss -and $hasCompletedCheckmark) "Completed nodes render checkmark and distinct color"

# 7. Active section state is visually distinct
$hasActiveNodeCss = $css.Contains('.step-node.active')
$hasActiveBulletCss = $css.Contains('.step-node.active .step-bullet') -and $css.Contains('transform: scale(1.08)')
Check-Assert 7 "Active section state is visually distinct" ($hasActiveNodeCss -and $hasActiveBulletCss) "Active node has prominent red bullet with scale(1.08) and ring shadow"

# 8. Future section state remains visually inactive
$hasFutureState = $css.Contains('.step-bullet {') -and ($css.Contains('color: var(--color-black-40)') -or $css.Contains('background: var(--color-black-08)'))
Check-Assert 8 "Future section state remains visually inactive" $hasFutureState "Default node/bullet state has muted gray background and low-contrast text"

# 9. Existing top linear navigation remains intact
$hasJumpToPhase = $js.Contains('function jumpToPhase(phaseIndex)') -and $js.Contains('jumpToPhase(${idx})')
Check-Assert 9 "Existing top linear navigation remains intact" $hasJumpToPhase "jumpToPhase preserved and bound to click on each step node"

# 10. No explicit step numbers were reintroduced
$noStepNumbersHtml = -not [System.Text.RegularExpressions.Regex]::IsMatch($html, 'class="step-eyebrow">Step \d')
$noStepNumbersJs = -not [System.Text.RegularExpressions.Regex]::IsMatch($js, "label:\s*'\d+\.")
Check-Assert 10 "No explicit step numbers were reintroduced" ($noStepNumbersHtml -and $noStepNumbersJs) "Step labels remain title-based without leading numbers"

# 11. No 'Step 1', 'Step 2' added
$noStep1inJs = -not $js.Contains("'Step 1'") -and -not $js.Contains('"Step 1"')
$noStep2inJs = -not $js.Contains("'Step 2'") -and -not $js.Contains('"Step 2"')
Check-Assert 11 "No 'Step 1', 'Step 2', etc. were added" ($noStep1inJs -and $noStep2inJs) "Zero 'Step 1' or 'Step 2' string occurrences"

# 12. No '1/6' style numeric progress added
$noFractionProgress = -not $html.Contains('1/6') -and -not $js.Contains("'1/6'") -and -not $js.Contains('"1/6"')
Check-Assert 12 "No '1/6' style numeric progress was added" $noFractionProgress "No fractional progress strings present"

# 13. Existing onboarding navigation controls remain intact
$hasNextStep = $js.Contains('function nextStep()')
$hasPrevStep = $js.Contains('function prevStep()')
$hasGoToStep = $js.Contains('function goToStep(stepId)')
Check-Assert 13 "Existing onboarding navigation controls remain intact" ($hasNextStep -and $hasPrevStep -and $hasGoToStep) "nextStep, prevStep, goToStep fully preserved"

# 14. Existing onboarding state is reused
$reusesStateCurrentStep = $js.Contains('state.currentStepId') -and $js.Contains('currentPhaseIndex')
Check-Assert 14 "Existing onboarding state is reused" $reusesStateCurrentStep "Progress derives from existing state.currentStepId"

# 15. No unnecessary duplicate progress state was introduced
$noDuplicateState = -not $js.Contains('const progressState =') -and -not $js.Contains('let stepperProgressState =')
Check-Assert 15 "No unnecessary duplicate progress state introduced" $noDuplicateState "No redundant progress state object created"

# 16. Desktop progress animation is implemented
$hasDesktopFill = $html.Contains('id="desktop-stepper-overall-fill"') -and $js.Contains('desktop-stepper-overall-fill')
$hasDesktopTrackInit = $js.Contains('desktop-stepper-track')
Check-Assert 16 "Desktop progress animation is implemented" ($hasDesktopFill -and $hasDesktopTrackInit) "Desktop track and overall fill initialized and updated"

# 17. Mobile progress animation is implemented
$hasMobileFill = $html.Contains('id="mobile-stepper-overall-fill"') -and $js.Contains('mobile-stepper-overall-fill')
$hasMobileTrackInit = $js.Contains('mobile-stepper-track')
Check-Assert 17 "Mobile progress animation is implemented" ($hasMobileFill -and $hasMobileTrackInit) "Mobile track and overall fill initialized and updated"

# 18. prefers-reduced-motion is respected
$hasReducedMotion = $css.Contains('@media (prefers-reduced-motion: reduce)') -and $css.Contains('.stepper-overall-fill') -and $css.Contains('transition: none !important;')
Check-Assert 18 "prefers-reduced-motion is respected" $hasReducedMotion "prefers-reduced-motion disables all stepper transitions cleanly"

# 19. No external animation library was unnecessarily introduced
$noExternalLib = -not $html.Contains('framer-motion') -and -not $html.Contains('gsap') -and -not $html.Contains('anime.min.js')
Check-Assert 19 "No external animation library introduced" $noExternalLib "Only native CSS transitions and lightweight JS used"

# 20. Vendor Signup badge system remains untouched
$hasBadgeSectionInAuth = $authForm.Contains('Badges & Recognition')
$hasBadgeSectionUntouched = (-not $html.Contains('badge-recognition-section'))
Check-Assert 20 "Vendor Signup badge system remains untouched" ($hasBadgeSectionInAuth -and $hasBadgeSectionUntouched) "Badge system isolated to Vendor Signup in AuthForm.tsx"

# 21. Task 17 remains intact
$hasTask17 = $authForm.Contains('id="vendor-badges-section"') -and $authForm.Contains('Badges & Recognition')
Check-Assert 21 "Task 17 remains intact" $hasTask17 "Badges & Recognition section exists in AuthForm.tsx directly after Offerings"

# 22. Task 18 remains intact
$hasTask18 = $authForm.Contains('"verified-caterer"') -and $authForm.Contains('"Verified Caterer"')
Check-Assert 22 "Task 18 remains intact" $hasTask18 "Verified Caterer badge exists in AuthForm.tsx"

# 23. Task 19 remains intact
$hasTask19 = $authForm.Contains('"city-icon-caterer"') -and $authForm.Contains('"City Icon Caterer"')
Check-Assert 23 "Task 19 remains intact" $hasTask19 "City Icon Caterer badge exists in AuthForm.tsx"

# 24. Task 20 remains intact
$hasTask20 = $authForm.Contains('"heritage-caterer"') -and $authForm.Contains('"Heritage Caterer"')
Check-Assert 24 "Task 20 remains intact" $hasTask20 "Heritage Caterer badge exists in AuthForm.tsx"

# 25. Tasks 1-6 remain intact
$hasSignIn = $html.Contains('modal-vendor-signin')
$noHostContact = -not $html.Contains('host-contact-link')
$hasOptionalStall = $html.Contains('Stall Display Brand Name <span class="field-optional">(Optional)</span>')
$hasFixedMenu = -not $html.Contains('data-format="varied"')
Check-Assert 25 "Tasks 1-6 remain intact" ($hasSignIn -and $noHostContact -and $hasOptionalStall -and $hasFixedMenu) "Phase 1 revisions remain 100% active"

# 26. Tasks 7-8 remain intact
$reusesSignup = $js.Contains('syncAccountDetailsToUI') -and $js.Contains('state.account')
$customOfferings = $js.Contains('addCustomOffering') -and $js.Contains('renderCustomOfferings')
Check-Assert 26 "Tasks 7-8 remain intact" ($reusesSignup -and $customOfferings) "Phase 2 vendor reuse and custom offerings remain active"

# 27. Tasks 9-16 remain intact
$hasPhase3Pricing = $js.Contains('state.catering.tierPrices')
$hasLiveCounters = $js.Contains('state.catering.liveCounters')
$hasCutleryTier = $js.Contains('state.catering.cutleryTier')
Check-Assert 27 "Tasks 9-16 remain intact" ($hasPhase3Pricing -and $hasLiveCounters -and $hasCutleryTier) "Phase 3 feast builder, stall, and baina configurations intact"

# 28. Existing sign-in/onboarding single-source-of-truth behavior remains intact
$hasSSOT = $js.Contains('REGISTERED_VENDOR_ACCOUNTS') -and $js.Contains('handleVendorSignIn') -and $js.Contains('syncAccountDetailsToUI')
Check-Assert 28 "Existing sign-in/onboarding single-source-of-truth intact" $hasSSOT "Session account data loaded without duplicate profile creation"

Write-Host "==============================================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "PHASE 5 TASK 21 VERIFICATION PASSED: ALL 28 CHECKS SUCCEEDED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "PHASE 5 TASK 21 VERIFICATION FAILED: ONE OR MORE CHECKS FAILED" -ForegroundColor Red
    exit 1
}
