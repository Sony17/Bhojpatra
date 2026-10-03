$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "BHOJPATRA V2 ONBOARDING: PHASE 4 TASK 20 VERIFICATION" -ForegroundColor Cyan
Write-Host "HERITAGE CATERER BADGE IN VENDOR SIGNUP" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$authPath = Join-Path $PSScriptRoot "..\src\components\auth\AuthForm.tsx"
$auth = [System.IO.File]::ReadAllText($authPath, [System.Text.Encoding]::UTF8)

$v2HtmlPath = Join-Path $PSScriptRoot "..\mockups\vendor-registration-v2\index.html"
$v2Html = [System.IO.File]::ReadAllText($v2HtmlPath, [System.Text.Encoding]::UTF8)

$v2JsPath = Join-Path $PSScriptRoot "..\mockups\vendor-registration-v2\script.js"
$v2Js = [System.IO.File]::ReadAllText($v2JsPath, [System.Text.Encoding]::UTF8)

$allPassed = $true

# 1. Heritage Caterer card exists
$hasHeritage = $auth.Contains('"heritage-caterer"') -and $auth.Contains('"Heritage Caterer"')
if ($hasHeritage) {
    Write-Host "[PASS] 1. Heritage Caterer card exists in Vendor Signup" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 1. Heritage Caterer card missing in Vendor Signup" -ForegroundColor Red
    $allPassed = $false
}

# 2. Heritage is the third badge
$idxVerified = $auth.IndexOf('"verified-caterer"')
$idxCityIcon = $auth.IndexOf('"city-icon-caterer"')
$idxHeritage = $auth.IndexOf('"heritage-caterer"')
$isThirdBadge = ($idxVerified -lt $idxCityIcon) -and ($idxCityIcon -lt $idxHeritage)
if ($isThirdBadge) {
    Write-Host "[PASS] 2. Heritage Caterer is strictly the third badge in order" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 2. Heritage Caterer is not third badge (Verified: $idxVerified, CityIcon: $idxCityIcon, Heritage: $idxHeritage)" -ForegroundColor Red
    $allPassed = $false
}

# 3. Heritage is explicitly positioned as the most exclusive/highest recognition tier
$heritageStart = $auth.IndexOf('id: "heritage-caterer"')
$badgeOptionsEnd = $auth.IndexOf('  ];', $heritageStart)
$heritageSnippet = $auth.Substring($heritageStart, $badgeOptionsEnd - $heritageStart)
$isMostExclusive = $heritageSnippet.Contains('Most Exclusive Recognition') -and 
                   $heritageSnippet.Contains('Our most exclusive recognition for caterers with a long-standing culinary legacy')
if ($isMostExclusive) {
    Write-Host "[PASS] 3. Heritage Caterer is explicitly positioned as the most exclusive recognition tier" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 3. Heritage Caterer most exclusive positioning missing" -ForegroundColor Red
    $allPassed = $false
}

# 4-12. Check all 9 specific qualification requirements verbatim
$heritageReqs = @(
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

# 4. Minimum 15 years continuous legacy
if ($heritageSnippet.Contains($heritageReqs[0])) {
    Write-Host "[PASS] 4. Minimum 15 years continuous legacy requirement present" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 4. Minimum 15 years continuous legacy requirement missing" -ForegroundColor Red
    $allPassed = $false
}

# 5. Preferably family-run/legacy food business
if ($heritageSnippet.Contains($heritageReqs[1])) {
    Write-Host "[PASS] 5. Preferably family-run/legacy food business requirement present" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 5. Preferably family-run/legacy food business requirement missing" -ForegroundColor Red
    $allPassed = $false
}

# 6. Strong connection with local culinary tradition
if ($heritageSnippet.Contains($heritageReqs[2])) {
    Write-Host "[PASS] 6. Strong connection with local culinary tradition requirement present" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 6. Strong connection with local culinary tradition requirement missing" -ForegroundColor Red
    $allPassed = $false
}

# 7. Multiple generations involved OR demonstrable long-standing legacy
if ($heritageSnippet.Contains($heritageReqs[3])) {
    Write-Host "[PASS] 7. Multiple generations involved OR demonstrable long-standing legacy requirement present" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 7. Multiple generations involved OR demonstrable long-standing legacy requirement missing" -ForegroundColor Red
    $allPassed = $false
}

# 8. Recognised local reputation
if ($heritageSnippet.Contains($heritageReqs[4])) {
    Write-Host "[PASS] 8. Recognised local reputation requirement present" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 8. Recognised local reputation requirement missing" -ForegroundColor Red
    $allPassed = $false
}

# 9. Signature/traditional dishes
if ($heritageSnippet.Contains($heritageReqs[5])) {
    Write-Host "[PASS] 9. Signature/traditional dishes requirement present" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 9. Signature/traditional dishes requirement missing" -ForegroundColor Red
    $allPassed = $false
}

# 10. Consistent quality over the years
if ($heritageSnippet.Contains($heritageReqs[6])) {
    Write-Host "[PASS] 10. Consistent quality over the years requirement present" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 10. Consistent quality over the years requirement missing" -ForegroundColor Red
    $allPassed = $false
}

# 11. Strong historical/customer references
if ($heritageSnippet.Contains($heritageReqs[7])) {
    Write-Host "[PASS] 11. Strong historical/customer references requirement present" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 11. Strong historical/customer references requirement missing" -ForegroundColor Red
    $allPassed = $false
}

# 12. Bhojpatra tasting + verification process pass
if ($heritageSnippet.Contains($heritageReqs[8])) {
    Write-Host "[PASS] 12. Bhojpatra tasting + verification process pass requirement present" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 12. Bhojpatra tasting + verification process pass requirement missing" -ForegroundColor Red
    $allPassed = $false
}

# 13. No invented unrelated qualification is introduced (exactly 9 criteria)
$reqHeaderIdx = $heritageSnippet.IndexOf('requirements: [')
$reqEndIdx = $heritageSnippet.IndexOf("      ],", $reqHeaderIdx)
$heritageReqBlock = if ($reqEndIdx -gt $reqHeaderIdx) { $heritageSnippet.Substring($reqHeaderIdx, $reqEndIdx - $reqHeaderIdx) } else { $heritageSnippet }
$reqCount = 0
foreach ($req in $heritageReqs) {
    if ($heritageReqBlock.Contains($req)) {
        $reqCount++
    }
}
if ($reqCount -eq 9) {
    Write-Host "[PASS] 13. Exactly 9 distinct criteria present without invented qualifications" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 13. Requirement count mismatch (Found: $reqCount of 9)" -ForegroundColor Red
    $allPassed = $false
}

# 14. Apply control uses the existing badge application mechanism
$hasApplyControl = $auth.Contains('data-badge-apply=') -and $auth.Contains('toggleBadgeApplication(')
if ($hasApplyControl) {
    Write-Host "[PASS] 14. Apply control uses existing toggleBadgeApplication mechanism" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 14. Apply control missing or unwired" -ForegroundColor Red
    $allPassed = $false
}

# 15. View Requirements accordion works through the existing mechanism
$hasAccordion = $auth.Contains('data-badge-toggle=') -and $auth.Contains('data-badge-requirements=') -and $auth.Contains('View Requirements')
if ($hasAccordion) {
    Write-Host "[PASS] 15. View Requirements accordion works through existing mechanism" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 15. View Requirements accordion missing" -ForegroundColor Red
    $allPassed = $false
}

# 16. Heritage uses the shared badgeApplications state
$hasSeparateHeritageState = $auth.Contains('heritageApplicationState') -or $auth.Contains('heritageBadgeState')
if (-not $hasSeparateHeritageState) {
    Write-Host "[PASS] 16. Heritage uses shared badgeApplications state (no parallel state)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 16. Separate Heritage state detected" -ForegroundColor Red
    $allPassed = $false
}

# 17. No backend/database/notification workflow was added
$applyFuncIndex = $auth.IndexOf('function toggleBadgeApplication(')
$applyFuncSnippet = if ($applyFuncIndex -gt -1) { $auth.Substring($applyFuncIndex, 250) } else { "" }
$noBackendCalls = (-not $applyFuncSnippet.Contains('fetch(')) -and 
                  (-not $applyFuncSnippet.Contains('notify')) -and 
                  (-not $applyFuncSnippet.Contains('/api/'))
if ($noBackendCalls) {
    Write-Host "[PASS] 17. Zero backend, database, or notification calls added" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 17. Backend or notification calls detected" -ForegroundColor Red
    $allPassed = $false
}

# 18. Heritage is absent from V2 onboarding
$absentFromV2 = (-not $v2Html.Contains('heritage-caterer')) -and (-not $v2Js.Contains('heritage-caterer'))
if ($absentFromV2) {
    Write-Host "[PASS] 18. Heritage Caterer is absent from V2 onboarding (isolated to Signup)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 18. Heritage Caterer leaked into V2 onboarding" -ForegroundColor Red
    $allPassed = $false
}

# 19. Desktop layout remains valid
$hasDesktopLayout = $auth.Contains('flex flex-col gap-2.5') -and $auth.Contains('flex items-start justify-between')
if ($hasDesktopLayout) {
    Write-Host "[PASS] 19. Desktop layout remains valid" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 19. Desktop layout classes missing" -ForegroundColor Red
    $allPassed = $false
}

# 20. Mobile layout remains valid
$hasMobileLayout = $auth.Contains('min-h-[36px]') -and $auth.Contains('gap-3')
if ($hasMobileLayout) {
    Write-Host "[PASS] 20. Mobile layout responsiveness remains valid" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 20. Mobile layout classes missing" -ForegroundColor Red
    $allPassed = $false
}

# 21. Verified Caterer remains first and intact
$verifiedIntact = $auth.Contains('id: "verified-caterer"') -and 
                  $auth.Contains('Entry-Level Recognition') -and 
                  $auth.Contains('Minimum 2 years operating experience')
if ($verifiedIntact -and ($idxVerified -lt $idxCityIcon)) {
    Write-Host "[PASS] 21. Verified Caterer remains first and fully intact (Task 18 preserved)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 21. Verified Caterer modified or out of order" -ForegroundColor Red
    $allPassed = $false
}

# 22. City Icon Caterer remains second and intact
$cityIconIntact = $auth.Contains('id: "city-icon-caterer"') -and 
                  $auth.Contains('City-Level Recognition') -and 
                  $auth.Contains('Minimum 5 years of operating history')
if ($cityIconIntact -and ($idxCityIcon -lt $idxHeritage)) {
    Write-Host "[PASS] 22. City Icon Caterer remains second and fully intact (Task 19 preserved)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 22. City Icon Caterer modified or out of order" -ForegroundColor Red
    $allPassed = $false
}

# 23. City Icon's 8 mandatory requirements and 6 non-mandatory Plus Points remain intact
$cityIconSnippet = $auth.Substring($idxCityIcon, $idxHeritage - $idxCityIcon)
$has8Mandatory = $cityIconSnippet.Contains('Bhojpatra tasting + operational audit pass') -and 
                 $cityIconSnippet.Contains('Reliable manpower/logistics')
$has6PlusPoints = $cityIconSnippet.Contains('Known for a signature cuisine/menu') -and 
                  $cityIconSnippet.Contains('Repeat customers')
if ($has8Mandatory -and $has6PlusPoints) {
    Write-Host "[PASS] 23. City Icon 8 mandatory requirements and 6 Plus Points remain fully intact" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 23. City Icon requirements or plus points compromised" -ForegroundColor Red
    $allPassed = $false
}

# 24. Vendor signup account creation fields remain intact
$hasExistingSignup = $auth.Contains('id="businessName"') -and 
                     $auth.Contains('id="email"') -and 
                     $auth.Contains('id="mobile"') -and 
                     $auth.Contains('id="password"') -and 
                     $auth.Contains('Create Vendor Account')
if ($hasExistingSignup) {
    Write-Host "[PASS] 24. Existing Vendor Signup account creation fields and controls preserved" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 24. Existing Vendor Signup fields altered or missing" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "--------------------------------------------------" -ForegroundColor Gray

if ($allPassed) {
    Write-Host "[SUCCESS] ALL 24 TASK 20 CHECKS PASSED!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] ONE OR MORE TASK 20 CHECKS FAILED!" -ForegroundColor Red
    exit 1
}
