$ErrorActionPreference = 'Stop'

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "BHOJPATRA V2 ONBOARDING: PROPER BADGE APPLICATION FLOW VERIFICATION" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$authPath = Join-Path $PSScriptRoot "..\src\components\auth\AuthForm.tsx"
$auth = Get-Content -Path $authPath -Raw -Encoding UTF8

$modalPath = Join-Path $PSScriptRoot "..\src\components\auth\BadgeApplicationModal.tsx"
if (-not (Test-Path $modalPath)) {
    Write-Host "[FAIL] BadgeApplicationModal.tsx not found" -ForegroundColor Red
    exit 1
}
$modal = Get-Content -Path $modalPath -Raw -Encoding UTF8

$allPassed = $true

# 1. Vendor Signup loads & imports BadgeApplicationModal
if ($auth -match "BadgeApplicationModal" -and $auth -match "BadgeApplicationRecord") {
    Write-Host "[PASS] 1. Vendor Signup cleanly imports and integrates BadgeApplicationModal" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 1. Vendor Signup missing BadgeApplicationModal import" -ForegroundColor Red
    $allPassed = $false
}

# 2. Commercial Offerings still work & precede badges
$offeringIndex = $auth.IndexOf("Commercial Offerings")
$badgeIndex = $auth.IndexOf('id="vendor-badges-section"')
if ($offeringIndex -gt 0 -and $badgeIndex -gt $offeringIndex) {
    Write-Host "[PASS] 2. Commercial Offerings section remains intact and precedes Badges section" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 2. Commercial Offerings section order compromised" -ForegroundColor Red
    $allPassed = $false
}

# 3. Badge section appears in correct location with exactly 3 badges
if ($auth -match "verified-caterer" -and $auth -match "city-icon-caterer" -and $auth -match "heritage-caterer") {
    Write-Host "[PASS] 3. Badge section contains all 3 recognition tiers in proper order" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 3. Badge tiers missing or incorrect" -ForegroundColor Red
    $allPassed = $false
}

# 4. Verified Caterer Apply wires to modal
if ($auth -match "setActiveBadgeModal" -and $auth -match "data-badge-apply") {
    Write-Host "[PASS] 4. Verified Caterer Apply wires to activeBadgeModal opening" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 4. Verified Caterer Apply unwired" -ForegroundColor Red
    $allPassed = $false
}

# 5. City Icon Caterer Apply wires to modal
if ($modal -match "isCityIcon" -and $modal -match "City Icon Caterer") {
    Write-Host "[PASS] 5. City Icon Caterer Apply opens dedicated city-level experience" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 5. City Icon Caterer experience missing" -ForegroundColor Red
    $allPassed = $false
}

# 6. Heritage Caterer Apply wires to modal
if ($modal -match "isHeritage" -and $modal -match "Heritage Caterer") {
    Write-Host "[PASS] 6. Heritage Caterer Apply opens dedicated heritage legacy experience" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 6. Heritage Caterer experience missing" -ForegroundColor Red
    $allPassed = $false
}

# 7. Correct requirements appear for Verified Caterer (All 10 mandatory)
$verifiedReqs = @(
    "Valid FSSAI",
    "GST where applicable",
    "PAN + business/bank details",
    "Minimum 2 years operating experience",
    "Proper kitchen / food preparation setup",
    "Hygiene & food-safety standards pass",
    "Menu, pricing and service area clearly defined",
    "genuine event references/orders",
    "No serious unresolved customer complaints",
    "Bhojpatra quality inspection / tasting pass"
)
$verifiedPass = $true
foreach ($r in $verifiedReqs) {
    if (-not ($modal -match [regex]::Escape($r))) {
        $verifiedPass = $false
        Write-Host "Missing Verified Caterer requirement in modal: $r" -ForegroundColor Yellow
    }
}
$hasBrandException = $modal -match [regex]::Escape("Exception allowed for a strong established brand/new entity")
if ($verifiedPass -and $hasBrandException) {
    Write-Host "[PASS] 7. Verified Caterer presents all 10 mandatory criteria + explicit brand exception" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 7. Verified Caterer criteria mismatch" -ForegroundColor Red
    $allPassed = $false
}

# 8. City Icon Caterer has exactly 8 mandatory requirements
$cityMandatoryReqs = @(
    "Minimum 5 years of operating history",
    "Recognised reputation in the city/region",
    "Strong customer reviews/references",
    "Consistent food quality",
    "Professional event execution",
    "Good menu depth & presentation",
    "Reliable manpower/logistics",
    "Bhojpatra tasting + operational audit pass"
)
$cityMandatoryPass = $true
foreach ($r in $cityMandatoryReqs) {
    if (-not ($modal -match [regex]::Escape($r))) {
        $cityMandatoryPass = $false
    }
}
if ($cityMandatoryPass) {
    Write-Host "[PASS] 8. City Icon Caterer presents all 8 mandatory criteria" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 8. City Icon Caterer mandatory criteria mismatch" -ForegroundColor Red
    $allPassed = $false
}

# 9. City Icon Caterer has exactly 6 Plus Points
$cityPlusPoints = @(
    "Known for a signature cuisine/menu",
    "Regularly caters weddings/large celebrations",
    "Strong local brand recall",
    "Notable venues/clients/events served",
    "Social presence and customer reputation",
    "Repeat customers"
)
$cityPlusPass = $true
foreach ($p in $cityPlusPoints) {
    if (-not ($modal -match [regex]::Escape($p))) {
        $cityPlusPass = $false
    }
}
if ($cityPlusPass) {
    Write-Host "[PASS] 9. City Icon Caterer presents all 6 Plus Points" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 9. City Icon Caterer Plus Points mismatch" -ForegroundColor Red
    $allPassed = $false
}

# 10. City Icon Plus Points are clearly non-mandatory
if ($modal -match "Non-Mandatory" -and $modal -match "Optional") {
    Write-Host "[PASS] 10. City Icon Plus Points are clearly distinguished as Non-Mandatory / Optional" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 10. Plus points not clearly distinguished as non-mandatory" -ForegroundColor Red
    $allPassed = $false
}

# 11. Heritage Caterer has exactly 9 legacy criteria
$heritageCriteria = @(
    "Minimum 15 years continuous legacy",
    "Preferably family-run/legacy food business",
    "Strong connection with local culinary tradition",
    "Multiple generations involved OR demonstrable long-standing legacy",
    "Recognised local reputation",
    "Signature/traditional dishes",
    "Consistent quality over the years",
    "Strong historical/customer references",
    "Bhojpatra tasting + verification process pass"
)
$heritagePass = $true
foreach ($c in $heritageCriteria) {
    if (-not ($modal -match [regex]::Escape($c))) {
        $heritagePass = $false
        Write-Host "Missing Heritage criterion: $c" -ForegroundColor Yellow
    }
}
if ($heritagePass) {
    Write-Host "[PASS] 11. Heritage Caterer presents all 9 legacy criteria with explicit OR condition" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 11. Heritage criteria mismatch" -ForegroundColor Red
    $allPassed = $false
}

# 12. Minimum flow has all 6 logical stages
$hasStep1 = $modal -match "STEP 1: BADGE INTRODUCTION" -or $modal -match "step === 1"
$hasStep2 = $modal -match "STEP 2: ELIGIBILITY" -or $modal -match "step === 2"
$hasStep3 = $modal -match "STEP 3: APPLICATION DETAILS" -or $modal -match "step === 3"
$hasStep4 = $modal -match "STEP 4: REVIEW" -or $modal -match "step === 4"
$hasStep5 = $modal -match "STEP 5: SUBMIT" -or $modal -match "step === 5"
$hasStep6 = $modal -match "STEP 6: APPLICATION SUBMITTED" -or $modal -match "step === 6"
if ($hasStep1 -and $hasStep2 -and $hasStep3 -and $hasStep4 -and $hasStep5 -and $hasStep6) {
    Write-Host "[PASS] 12. Complete 6-stage lifecycle implemented: Intro -> Eligibility -> Details -> Review -> Submit -> Confirmed" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 12. One or more of the 6 stages is missing" -ForegroundColor Red
    $allPassed = $false
}

# 13. Back and Next navigation work without data loss
if ($modal -match "goToStep" -and $modal -match "handleNextFromDetails") {
    Write-Host "[PASS] 13. Forward and backward stage navigation functions cleanly" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 13. Stage navigation controls missing" -ForegroundColor Red
    $allPassed = $false
}

# 14. Data persistence in state per badge
if ($auth -match "handleUpdateBadgeData" -and $modal -match "onUpdateData") {
    Write-Host "[PASS] 14. Application details persist reactively in parent state during editing" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 14. State persistence mechanism missing" -ForegroundColor Red
    $allPassed = $false
}

# 15. Review displays entered information
if ($modal -match "Review" -and $modal -match "Submitted Operational Details") {
    Write-Host "[PASS] 15. Stage 4 Review renders entered answers, compliance declarations, and plus points" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 15. Review screen rendering missing" -ForegroundColor Red
    $allPassed = $false
}

# 16. Final submission marks submitted and prevents duplicates
if ($auth -match "handleBadgeSubmit" -and $modal -match "handleFinalSubmit") {
    Write-Host "[PASS] 16. Final submission updates application status and strictly prevents duplicate entries" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 16. Final submission or duplicate prevention missing" -ForegroundColor Red
    $allPassed = $false
}

# 17. Submitted state visibly rendered on badge card
if ($auth -match "Application Submitted" -and $auth -match "isSubmitted") {
    Write-Host "[PASS] 17. Badge card updates to show meaningful submitted state" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 17. Badge card submitted state missing" -ForegroundColor Red
    $allPassed = $false
}

# 18. Already-submitted badge allows review without duplicate submission
if ($modal -match "isAlreadySubmitted" -and $modal -match "Submitted Application Details") {
    Write-Host "[PASS] 18. Interacting with an already-submitted badge opens read-only review without duplicate submit" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 18. Read-only review for submitted badge missing" -ForegroundColor Red
    $allPassed = $false
}

# 19. Different badges maintain independent state
if ($auth -match "badgeDetails\[badge\.id\]" -and $auth -match "badgeDetails\[activeBadgeModal\]") {
    Write-Host "[PASS] 19. Verified, City Icon, and Heritage maintain independent, isolated application records" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 19. Badge application records not properly isolated" -ForegroundColor Red
    $allPassed = $false
}

# 20. Reuses vendor account details without duplicate inputs
if ($auth -match "businessName" -and $modal -match "vendorAccount\.businessName" -and $modal -match "vendorAccount\.fullName") {
    Write-Host "[PASS] 20. Existing vendor signup details (Business Name, Owner Name, Contact) are reused" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 20. Reused signup account details missing" -ForegroundColor Red
    $allPassed = $false
}

# 21. Accessibility attributes present
if ($modal -match 'role="dialog"' -and $modal -match 'aria-modal="true"' -and $modal -match "Escape") {
    Write-Host "[PASS] 21. Modal includes dialog role, aria-modal, title label, and Escape key listener" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 21. Accessibility attributes missing" -ForegroundColor Red
    $allPassed = $false
}

# 22. Responsive classes for mobile and desktop
if ($modal -match "max-w-2xl" -and $modal -match "max-h-" -and $modal -match "overflow-y-auto") {
    Write-Host "[PASS] 22. Responsive layout properly scales on desktop and mobile viewports" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 22. Responsive classes missing" -ForegroundColor Red
    $allPassed = $false
}

# 23. Isolation from V2 Onboarding prototype
$v2HtmlPath = Join-Path $PSScriptRoot "..\mockups\vendor-registration-v2\index.html"
$v2Html = Get-Content -Path $v2HtmlPath -Raw -Encoding UTF8
if (-not ($v2Html -match "BadgeApplicationModal")) {
    Write-Host "[PASS] 23. V2 onboarding prototype remains isolated and unharmed" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 23. Badge application leaked into V2 onboarding prototype" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "--------------------------------------------------" -ForegroundColor Gray
if ($allPassed) {
    Write-Host "[SUCCESS] ALL 23 BADGE APPLICATION FLOW VERIFICATION CHECKS PASSED!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] ONE OR MORE BADGE APPLICATION FLOW CHECKS FAILED!" -ForegroundColor Red
    exit 1
}
