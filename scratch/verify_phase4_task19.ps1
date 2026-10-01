$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "BHOJPATRA V2 ONBOARDING: PHASE 4 TASK 19 VERIFICATION" -ForegroundColor Cyan
Write-Host "CITY ICON CATERER BADGE IN VENDOR SIGNUP" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$authPath = Join-Path $PSScriptRoot "..\src\components\auth\AuthForm.tsx"
$auth = [System.IO.File]::ReadAllText($authPath, [System.Text.Encoding]::UTF8)

$v2HtmlPath = Join-Path $PSScriptRoot "..\mockups\vendor-registration-v2\index.html"
$v2Html = [System.IO.File]::ReadAllText($v2HtmlPath, [System.Text.Encoding]::UTF8)

$v2JsPath = Join-Path $PSScriptRoot "..\mockups\vendor-registration-v2\script.js"
$v2Js = [System.IO.File]::ReadAllText($v2JsPath, [System.Text.Encoding]::UTF8)

$allPassed = $true

# 1. City Icon Caterer card exists in Vendor Signup
$hasCityIcon = $auth.Contains('"city-icon-caterer"') -and $auth.Contains('"City Icon Caterer"')
if ($hasCityIcon) {
    Write-Host "[PASS] 1. City Icon Caterer card exists in Vendor Signup" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 1. City Icon Caterer card missing in Vendor Signup" -ForegroundColor Red
    $allPassed = $false
}

# 2. It is the second badge in the existing Badge Application section
$idxVerified = $auth.IndexOf('"verified-caterer"')
$idxCityIcon = $auth.IndexOf('"city-icon-caterer"')
$idxHeritage = $auth.IndexOf('"heritage-caterer"')
$isSecondBadge = ($idxVerified -lt $idxCityIcon) -and ($idxCityIcon -lt $idxHeritage)
if ($isSecondBadge) {
    Write-Host "[PASS] 2. City Icon Caterer is the second badge in Badge Application section" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 2. City Icon Caterer is not in second position (Verified: $idxVerified, CityIcon: $idxCityIcon, Heritage: $idxHeritage)" -ForegroundColor Red
    $allPassed = $false
}

# 3. Badge section remains directly after Offerings
$offeringIndex = $auth.IndexOf('Commercial Offerings')
$badgeIndex = $auth.IndexOf('id="vendor-badges-section"')
$afterOfferings = ($offeringIndex -gt 0) -and ($badgeIndex -gt $offeringIndex)
if ($afterOfferings) {
    Write-Host "[PASS] 3. Badge section remains directly after Offerings section" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 3. Badge section does not follow Offerings" -ForegroundColor Red
    $allPassed = $false
}

# 4. City Icon is presented as higher recognition than Verified Caterer
# Verified Caterer = Entry-Level Recognition; City Icon = City-Level Recognition
$hasHigherRecognition = $auth.Contains('City-Level Recognition') -and 
                        $auth.Contains('City-level recognition for established caterers with a strong local reputation')
if ($hasHigherRecognition) {
    Write-Host "[PASS] 4. City Icon is positioned as higher recognition than Verified Caterer" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 4. City Icon higher recognition positioning missing" -ForegroundColor Red
    $allPassed = $false
}

# 5. It is NOT described as the most exclusive badge
$cityIconStart = $auth.IndexOf('id: "city-icon-caterer"')
$heritageStart = $auth.IndexOf('id: "heritage-caterer"')
$cityIconBlock = $auth.Substring($cityIconStart, $heritageStart - $cityIconStart)
$notMostExclusive = (-not $cityIconBlock.Contains('most exclusive')) -and (-not $cityIconBlock.Contains('Most Exclusive'))
if ($notMostExclusive) {
    Write-Host "[PASS] 5. City Icon is NOT described as the most exclusive badge (reserved for Heritage)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 5. City Icon incorrectly described as most exclusive" -ForegroundColor Red
    $allPassed = $false
}

# 6. Apply control works
$hasApplyControl = $auth.Contains('data-badge-apply=') -and $auth.Contains('toggleBadgeApplication(')
if ($hasApplyControl) {
    Write-Host "[PASS] 6. Apply control is wired to toggleBadgeApplication" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 6. Apply control is missing or unwired" -ForegroundColor Red
    $allPassed = $false
}

# 7. Applied state is visibly communicated
$hasAppliedState = $auth.Contains('isApplied') -and $auth.Contains('Applied') -and $auth.Contains('border-maroon bg-white')
if ($hasAppliedState) {
    Write-Host "[PASS] 7. Applied state is visibly communicated in card and button" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 7. Applied state is not visibly communicated" -ForegroundColor Red
    $allPassed = $false
}

# 8. Requirements accordion works
$hasAccordion = $auth.Contains('data-badge-toggle=') -and $auth.Contains('View Requirements') -and $auth.Contains('Hide Requirements') -and $auth.Contains('data-badge-requirements=')
if ($hasAccordion) {
    Write-Host "[PASS] 8. Requirements accordion functions with View/Hide toggle" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 8. Requirements accordion missing or broken" -ForegroundColor Red
    $allPassed = $false
}

# 9. All 8 mandatory requirements are present
$mandatoryRequirements = @(
    "Minimum 5 years of operating history",
    "Recognised reputation in the city/region",
    "Strong customer reviews/references",
    "Consistent food quality",
    "Professional event execution",
    "Good menu depth & presentation",
    "Reliable manpower/logistics",
    "Bhojpatra tasting + operational audit pass"
)

$reqFailures = @()
foreach ($req in $mandatoryRequirements) {
    if (-not $cityIconBlock.Contains($req)) {
        $reqFailures += $req
    }
}

if ($reqFailures.Count -eq 0) {
    Write-Host "[PASS] 9. All 8 mandatory requirements are present verbatim in City Icon Caterer" -ForegroundColor Green
} else {
    $missingJoined = $reqFailures -join ', '
    Write-Host "[FAIL] 9. Missing mandatory requirements: $missingJoined" -ForegroundColor Red
    $allPassed = $false
}

# 10. All 8 mandatory requirements are clearly treated as mandatory
$hasMandatoryHeader = $auth.Contains('mandatory criteria') -or $auth.Contains('Mandatory')
$reqPropIndex = $cityIconBlock.IndexOf('requirements: [')
$plusPropIndex = $cityIconBlock.IndexOf('plusPoints: [')
$reqSubstr = $cityIconBlock.Substring($reqPropIndex, $plusPropIndex - $reqPropIndex)

$mandatoryCount = 0
foreach ($req in $mandatoryRequirements) {
    if ($reqSubstr.Contains($req)) {
        $mandatoryCount++
    }
}

if ($mandatoryCount -eq 8 -and $hasMandatoryHeader) {
    Write-Host "[PASS] 10. All 8 requirements are in requirements array and treated as mandatory" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 10. Mandatory requirements not properly separated (Count: $mandatoryCount, Header: $hasMandatoryHeader)" -ForegroundColor Red
    $allPassed = $false
}

# 11. Separate Plus Points section exists
$hasPlusPointsSection = $auth.Contains('data-badge-plus-points=') -and $auth.Contains('Plus Points') -and $auth.Contains('Non-mandatory')
if ($hasPlusPointsSection) {
    Write-Host "[PASS] 11. A separate Plus Points section exists in the accordion" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 11. Separate Plus Points section missing in accordion" -ForegroundColor Red
    $allPassed = $false
}

# 12. All 6 Plus Points are present
$plusPointsList = @(
    "Known for a signature cuisine/menu",
    "Regularly caters weddings/large celebrations",
    "Strong local brand recall",
    "Notable venues/clients/events served",
    "Social presence and customer reputation",
    "Repeat customers"
)

$plusPointFailures = @()
foreach ($pt in $plusPointsList) {
    if (-not $cityIconBlock.Contains($pt)) {
        $plusPointFailures += $pt
    }
}

if ($plusPointFailures.Count -eq 0) {
    Write-Host "[PASS] 12. All 6 Plus Points are present verbatim in City Icon Caterer" -ForegroundColor Green
} else {
    $missingJoined = $plusPointFailures -join ', '
    Write-Host "[FAIL] 12. Missing Plus Points: $missingJoined" -ForegroundColor Red
    $allPassed = $false
}

# 13. Plus Points are NOT treated as mandatory requirements
$plusSubstr = $cityIconBlock.Substring($plusPropIndex)
$plusCount = 0
foreach ($pt in $plusPointsList) {
    if ($plusSubstr.Contains($pt)) {
        $plusCount++
    }
}
$noneInMandatory = $true
foreach ($pt in $plusPointsList) {
    if ($reqSubstr.Contains($pt)) {
        $noneInMandatory = $false
    }
}

$hasNonMandatoryNotice = $auth.Contains('Additional strengths that improve candidacy (not mandatory to qualify)')
if ($plusCount -eq 6 -and $noneInMandatory -and $hasNonMandatoryNotice) {
    Write-Host "[PASS] 13. Plus Points are strictly separate from mandatory list and explicitly non-mandatory" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 13. Plus Points treated as mandatory or leaking into requirements list" -ForegroundColor Red
    $allPassed = $false
}

# 14. Badge application state remains isolated
$applyFuncIndex = $auth.IndexOf('function toggleBadgeApplication(')
$applyFuncSnippet = if ($applyFuncIndex -gt -1) { $auth.Substring($applyFuncIndex, 250) } else { "" }
$isolatedFromOfferings = (-not $applyFuncSnippet.Contains('setSelectedOfferings')) -and (-not $applyFuncSnippet.Contains('selectedOfferings'))
$singleBadgeState = (-not $auth.Contains('cityIconApplicationState')) -and (-not $auth.Contains('cityIconBadgeState'))
if ($isolatedFromOfferings -and $singleBadgeState) {
    Write-Host "[PASS] 14. Badge application state remains strictly isolated and uses single badgeApplications array" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 14. Badge application state isolation failed or parallel state introduced" -ForegroundColor Red
    $allPassed = $false
}

# 15. No notification infrastructure was added
$noNotifications = (-not $applyFuncSnippet.Contains('notify')) -and 
                   (-not $applyFuncSnippet.Contains('sendEmail')) -and 
                   (-not $applyFuncSnippet.Contains('adminAlert'))
if ($noNotifications) {
    Write-Host "[PASS] 15. No notification or email infrastructure added for badge application" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 15. Notification infrastructure detected in badge application" -ForegroundColor Red
    $allPassed = $false
}

# 16. No backend approval workflow was added
$noBackendApproval = (-not $applyFuncSnippet.Contains('/api/admin')) -and 
                     (-not $applyFuncSnippet.Contains('approvalStatus')) -and 
                     (-not $applyFuncSnippet.Contains('fetch('))
if ($noBackendApproval) {
    Write-Host "[PASS] 16. No backend approval workflow or database calls added" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 16. Backend approval workflow detected" -ForegroundColor Red
    $allPassed = $false
}

# 17. No V2 onboarding badge UI was added
$isolatedFromV2 = (-not $v2Html.Contains('city-icon-caterer')) -and 
                  (-not $v2Html.Contains('vendor-badges-section')) -and 
                  (-not $v2Js.Contains('badgeApplications'))
if ($isolatedFromV2) {
    Write-Host "[PASS] 17. City Icon Caterer badge is NOT added to V2 onboarding (isolated)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 17. City Icon Caterer leaked into V2 onboarding" -ForegroundColor Red
    $allPassed = $false
}

# 18. Desktop layout works
$hasResponsiveClasses = $auth.Contains('flex flex-col gap-2.5') -and $auth.Contains('flex items-start justify-between')
if ($hasResponsiveClasses) {
    Write-Host "[PASS] 18. Desktop layout classes verified" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 18. Desktop layout classes missing" -ForegroundColor Red
    $allPassed = $false
}

# 19. Mobile layout works
$hasMobileClasses = $auth.Contains('min-h-[36px]') -and $auth.Contains('gap-3')
if ($hasMobileClasses) {
    Write-Host "[PASS] 19. Mobile layout responsiveness verified" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 19. Mobile layout responsiveness missing" -ForegroundColor Red
    $allPassed = $false
}

# 20. Verified Caterer remains unchanged and functional
$hasVerifiedEntryLevel = $auth.Contains('id: "verified-caterer"') -and 
                         $auth.Contains('Entry-Level Recognition') -and 
                         $auth.Contains('Minimum 2 years operating experience') -and 
                         $auth.Contains('strong established brand/new entity')
if ($hasVerifiedEntryLevel) {
    Write-Host "[PASS] 20. Verified Caterer remains first, entry-level, and fully intact (Task 18 preserved)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 20. Verified Caterer was unexpectedly altered" -ForegroundColor Red
    $allPassed = $false
}

# 21. Existing Vendor Signup functionality remains intact
$hasExistingSignup = $auth.Contains('id="businessName"') -and 
                     $auth.Contains('id="email"') -and 
                     $auth.Contains('id="mobile"') -and 
                     $auth.Contains('id="password"') -and 
                     $auth.Contains('Create Vendor Account')
if ($hasExistingSignup) {
    Write-Host "[PASS] 21. Existing Vendor Signup account creation fields and controls preserved" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 21. Existing Vendor Signup fields altered or missing" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "--------------------------------------------------" -ForegroundColor Gray

if ($allPassed) {
    Write-Host "[SUCCESS] ALL 21 TASK 19 CHECKS PASSED!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] ONE OR MORE TASK 19 CHECKS FAILED!" -ForegroundColor Red
    exit 1
}
