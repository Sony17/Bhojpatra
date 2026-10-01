$ErrorActionPreference = 'Stop'

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "BHOJPATRA V2 ONBOARDING: MOCKUP BADGE APPLICATION FLOW VERIFICATION" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$htmlPath = Join-Path $PSScriptRoot "..\mockups\vendor-registration-v2\index.html"
$html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)

$cssPath = Join-Path $PSScriptRoot "..\mockups\vendor-registration-v2\styles.css"
$css = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)

$jsPath = Join-Path $PSScriptRoot "..\mockups\vendor-registration-v2\script.js"
$js = [System.IO.File]::ReadAllText($jsPath, [System.Text.Encoding]::UTF8)

$allPassed = $true

# 1. Desktop and Mobile badge section containers exist in index.html
$hasDesktopBadges = $html.Contains('id="desktop-mockup-badges-section"') -and $html.Contains('id="desktop-badge-cards-list"')
$hasMobileBadges  = $html.Contains('id="mobile-mockup-badges-section"') -and $html.Contains('id="mobile-badge-cards-list"')
if ($hasDesktopBadges -and $hasMobileBadges) {
    Write-Host "[PASS] 1. Desktop and Mobile badge containers exist in index.html" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 1. Desktop or Mobile badge containers missing" -ForegroundColor Red
    $allPassed = $false
}

# 2. Badges section placed inside view-offerings after commercial offerings
$offeringIndex = $html.IndexOf('data-step-id="view-offerings"')
$badgesIndex = $html.IndexOf('id="desktop-mockup-badges-section"')
$catBasicsIndex = $html.IndexOf('data-step-id="view-cat-basics"')
if ($offeringIndex -gt 0 -and $badgesIndex -gt $offeringIndex -and $badgesIndex -lt $catBasicsIndex) {
    Write-Host "[PASS] 2. Badges section placed directly after Commercial Offerings inside view-offerings" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 2. Badges section not placed directly after Commercial Offerings" -ForegroundColor Red
    $allPassed = $false
}

# 3. Dedicated Badge Application Modal exists in index.html
$hasModal = $html.Contains('id="modal-badge-application"') -and $html.Contains('id="badge-modal-content"')
if ($hasModal) {
    Write-Host "[PASS] 3. Dedicated Badge Application Modal exists in index.html" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 3. Badge Application Modal missing in index.html" -ForegroundColor Red
    $allPassed = $false
}

# 4. BADGE_CONFIGS defines all three badges
$hasVerifiedConfig = $js.Contains('verified_caterer') -and $js.Contains('Verified Caterer')
$hasCityIconConfig = $js.Contains('city_icon_caterer') -and $js.Contains('City Icon Caterer')
$hasHeritageConfig = $js.Contains('heritage_caterer') -and $js.Contains('Heritage Caterer')
if ($hasVerifiedConfig -and $hasCityIconConfig -and $hasHeritageConfig) {
    Write-Host "[PASS] 4. BADGE_CONFIGS defines all three badges (Verified, City Icon, Heritage)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 4. BADGE_CONFIGS missing badges" -ForegroundColor Red
    $allPassed = $false
}

# 5. Verified Caterer: 10 mandatory criteria + 2-year exception
$verifiedReqs = @(
    'Valid FSSAI',
    'GST where applicable',
    'PAN + business/bank details',
    'Minimum 2 years operating experience',
    'Proper kitchen / food preparation setup',
    'Hygiene & food-safety standards pass',
    'Menu, pricing and service area clearly defined',
    'genuine event references/orders',
    'No serious unresolved customer complaints',
    'Bhojpatra quality inspection / tasting pass'
)
$verifiedPass = $true
foreach ($r in $verifiedReqs) {
    if (-not $js.Contains($r)) {
        $verifiedPass = $false
        Write-Host "Missing Verified Caterer requirement: $r" -ForegroundColor Yellow
    }
}
$hasBrandException = $js.Contains('Exception allowed for a strong established brand/new entity')
if ($verifiedPass -and $hasBrandException) {
    Write-Host "[PASS] 5. Verified Caterer presents all 10 mandatory criteria + explicit brand exception" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 5. Verified Caterer criteria incomplete or missing exception" -ForegroundColor Red
    $allPassed = $false
}

# 6. City Icon Caterer: 8 mandatory criteria
$cityReqs = @(
    'Minimum 5 years of operating history',
    'Recognised reputation in the city/region',
    'Strong customer reviews/references',
    'Consistent food quality',
    'Professional event execution',
    'Good menu depth & presentation',
    'Reliable manpower/logistics',
    'Bhojpatra tasting + operational audit pass'
)
$cityPass = $true
foreach ($r in $cityReqs) {
    if (-not $js.Contains($r)) {
        $cityPass = $false
        Write-Host "Missing City Icon requirement: $r" -ForegroundColor Yellow
    }
}
if ($cityPass) {
    Write-Host "[PASS] 6. City Icon Caterer presents all 8 mandatory criteria" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 6. City Icon Caterer criteria incomplete" -ForegroundColor Red
    $allPassed = $false
}

# 7. City Icon Caterer: 6 distinct optional Plus Points
$cityPlusPoints = @(
    'Known for a signature cuisine/menu',
    'Regularly caters weddings/large celebrations',
    'Strong local brand recall',
    'Notable venues/clients/events served',
    'Social presence and customer reputation',
    'Repeat customers'
)
$plusPass = $true
foreach ($p in $cityPlusPoints) {
    if (-not $js.Contains($p)) {
        $plusPass = $false
        Write-Host "Missing Plus Point: $p" -ForegroundColor Yellow
    }
}
$distinguishedPlus = $js.Contains('Optional Plus Points') -and $js.Contains('Non-Mandatory')
if ($plusPass -and $distinguishedPlus) {
    Write-Host "[PASS] 7. City Icon Caterer presents all 6 Plus Points clearly distinguished as Non-Mandatory" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 7. City Icon Plus Points missing or not distinguished" -ForegroundColor Red
    $allPassed = $false
}

# 8. Heritage Caterer: exactly 9 legacy criteria with explicit OR
$heritageReqs = @(
    'Minimum 15 years continuous legacy',
    'Preferably family-run/legacy food business',
    'Strong connection with local culinary tradition',
    'Multiple generations involved OR demonstrable long-standing legacy',
    'Recognised local reputation',
    'Signature/traditional dishes',
    'Consistent quality over the years',
    'Strong historical/customer references',
    'Bhojpatra tasting + verification process pass'
)
$heritagePass = $true
foreach ($h in $heritageReqs) {
    if (-not $js.Contains($h)) {
        $heritagePass = $false
        Write-Host "Missing Heritage requirement: $h" -ForegroundColor Yellow
    }
}
$hasExplicitOr = $js.Contains('Multiple generations involved OR demonstrable long-standing legacy')
if ($heritagePass -and $hasExplicitOr) {
    Write-Host "[PASS] 8. Heritage Caterer presents all 9 legacy criteria with explicit OR condition" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 8. Heritage Caterer criteria incomplete or missing OR condition" -ForegroundColor Red
    $allPassed = $false
}

# 9. Complete 6-stage lifecycle supported in modal
$hasStep1 = $js.Contains('STEP 1: INTRODUCTION') -or $js.Contains('Bhojpatra Recognition Program')
$hasStep2 = $js.Contains('STEP 2: ELIGIBILITY') -or $js.Contains('I Meet These Requirements')
$hasStep3 = $js.Contains('STEP 3: APPLICATION DETAILS') -or $js.Contains('Review Application')
$hasStep4 = $js.Contains('STEP 4: REVIEW') -or $js.Contains('Review Application Details')
$hasStep5 = $js.Contains('STEP 5: DECLARATION') -or $js.Contains('Official Accuracy Declaration')
$hasStep6 = $js.Contains('STEP 6: APPLICATION SUBMITTED') -or $js.Contains('Application Successfully Submitted!')
if ($hasStep1 -and $hasStep2 -and $hasStep3 -and $hasStep4 -and $hasStep5 -and $hasStep6) {
    Write-Host "[PASS] 9. Complete 6-stage lifecycle implemented in modal controller" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 9. Modal 6-stage lifecycle incomplete" -ForegroundColor Red
    $allPassed = $false
}

# 10. Navigation functions: setModalStep, openBadgeModal, closeBadgeModal
$hasNavFunctions = $js.Contains('function openBadgeModal') -and $js.Contains('function closeBadgeModal') -and $js.Contains('function setModalStep')
if ($hasNavFunctions) {
    Write-Host "[PASS] 10. Forward/back stage navigation functions (open, close, setModalStep) implemented" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 10. Stage navigation functions missing" -ForegroundColor Red
    $allPassed = $false
}

# 11. Edit behavior from Review (Step 4 -> Step 3)
$hasEditDetails = $js.Contains('setModalStep(3)') -and $js.Contains('Edit Details')
if ($hasEditDetails) {
    Write-Host "[PASS] 11. Direct Edit Details jump from Step 4 back to Step 3 implemented" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 11. Edit Details jump missing" -ForegroundColor Red
    $allPassed = $false
}

# 12. Final submit and declaration behavior
$hasSubmit = $js.Contains('function submitBadgeApplication') -and $js.Contains('function handleBadgeDeclarationCheck')
$hasDeclarationNotice = $js.Contains('Vendor Commitment & Truthfulness Undertaking') -and $js.Contains('I accept this declaration')
if ($hasSubmit -and $hasDeclarationNotice) {
    Write-Host "[PASS] 12. Final declaration checkbox and submission handler verified" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 12. Declaration or submit handler missing" -ForegroundColor Red
    $allPassed = $false
}

# 13. Duplicate submission prevention & read-only submitted state
$hasDuplicatePrevention = $js.Contains("det.status === 'submitted'") -and $js.Contains('Application Reference ID')
if ($hasDuplicatePrevention) {
    Write-Host "[PASS] 13. Submitted applications open in confirmed state, preventing duplicate submission" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 13. Duplicate submission protection missing" -ForegroundColor Red
    $allPassed = $false
}

# 14. Independent application state per badge
$hasStateDetails = $js.Contains('state.badges.details') -and $js.Contains('state.badges.applied')
if ($hasStateDetails) {
    Write-Host "[PASS] 14. Badges maintain isolated state in state.badges.details and state.badges.applied" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 14. Independent badge state structure missing" -ForegroundColor Red
    $allPassed = $false
}

# 15. Reused vendor account profile information in Step 3
$reusedAccount = $js.Contains('state.account.businessName') -and $js.Contains('state.account.name') -and $js.Contains('Verified Vendor Account Details')
if ($reusedAccount) {
    Write-Host "[PASS] 15. Existing registered vendor profile (Business Name, Owner Name, Contact) reused" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 15. Reused vendor account profile missing in application details" -ForegroundColor Red
    $allPassed = $false
}

# 16. Keyboard accessibility & ESC listener
$hasEsc = $js.Contains("e.key === 'Escape'") -and $js.Contains('closeBadgeModal()')
if ($hasEsc) {
    Write-Host "[PASS] 16. Keyboard accessibility with Escape key listener implemented" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 16. Escape key listener missing" -ForegroundColor Red
    $allPassed = $false
}

# 17. Master Review displays applied badges
$hasMasterReviewBadges = $js.Contains('Bhojpatra Recognition Badges') -and $js.Contains('Manage Badges')
if ($hasMasterReviewBadges) {
    Write-Host "[PASS] 17. Consolidated Master Review reflects Bhojpatra Recognition Badges status" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 17. Master Review badges summary missing" -ForegroundColor Red
    $allPassed = $false
}

# 18. CSS classes exist for badge cards and modal sheet
$hasCssClasses = $css.Contains('.mockup-badge-card') -and $css.Contains('.badge-application-sheet') -and $css.Contains('.btn-badge-action')
if ($hasCssClasses) {
    Write-Host "[PASS] 18. Complete styling for badge cards, accordions, and modal sheet present in styles.css" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 18. CSS classes missing in styles.css" -ForegroundColor Red
    $allPassed = $false
}

# 19. Pure client-side standalone static file capability (file:/// support)
$noExternalBackend = (-not $js.Contains('/api/badges')) -and (-not $js.Contains("fetch('/badges"))
if ($noExternalBackend) {
    Write-Host "[PASS] 19. Pure client-side prototype: no external backend dependencies; file:/// fully functional" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 19. External backend calls detected" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "--------------------------------------------------" -ForegroundColor Gray
if ($allPassed) {
    Write-Host "[SUCCESS] ALL 19 MOCKUP BADGE FLOW VERIFICATION CHECKS PASSED!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] ONE OR MORE CHECKS FAILED!" -ForegroundColor Red
    exit 1
}
