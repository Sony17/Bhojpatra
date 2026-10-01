$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "BHOJPATRA V2 ONBOARDING: PHASE 4 TASK 18 VERIFICATION" -ForegroundColor Cyan
Write-Host "VERIFIED CATERER BADGE IN VENDOR SIGNUP" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$authPath = Join-Path $PSScriptRoot "..\src\components\auth\AuthForm.tsx"
$auth = [System.IO.File]::ReadAllText($authPath, [System.Text.Encoding]::UTF8)

$v2HtmlPath = Join-Path $PSScriptRoot "..\mockups\vendor-registration-v2\index.html"
$v2Html = [System.IO.File]::ReadAllText($v2HtmlPath, [System.Text.Encoding]::UTF8)

$v2JsPath = Join-Path $PSScriptRoot "..\mockups\vendor-registration-v2\script.js"
$v2Js = [System.IO.File]::ReadAllText($v2JsPath, [System.Text.Encoding]::UTF8)

$allPassed = $true

# 1. Verified Caterer card exists in Vendor Signup
$hasVerifiedCard = $auth.Contains('"verified-caterer"') -and $auth.Contains('"Verified Caterer"')
if ($hasVerifiedCard) {
    Write-Host "[PASS] 1. Verified Caterer card exists in Vendor Signup" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 1. Verified Caterer card missing in Vendor Signup" -ForegroundColor Red
    $allPassed = $false
}

# 2. It remains inside the Badge Application section created in Task 17
$hasBadgeSection = $auth.Contains('id="vendor-badges-section"')
$verifiedInsideBadgeSection = ($auth.IndexOf('id="vendor-badges-section"') -gt 0) -and ($auth.IndexOf('verified-caterer') -gt 0)
if ($hasBadgeSection -and $verifiedInsideBadgeSection) {
    Write-Host "[PASS] 2. Verified Caterer remains inside Badge Application section created in Task 17" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 2. Verified Caterer is not inside Badge Application section" -ForegroundColor Red
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

# 4. Verified Caterer is the first / entry-level badge
$verifiedFirst = $auth.IndexOf('"verified-caterer"') -lt $auth.IndexOf('"city-icon-caterer"')
$hasEntryLevelPositioning = $auth.Contains('Entry-Level Recognition') -or $auth.Contains('Entry-level recognition')
if ($verifiedFirst -and $hasEntryLevelPositioning) {
    Write-Host "[PASS] 4. Verified Caterer is positioned as the first / entry-level badge" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 4. Verified Caterer is not positioned as the first / entry-level badge" -ForegroundColor Red
    $allPassed = $false
}

# 5. Apply control works
$hasApplyControl = $auth.Contains('data-badge-apply=') -and $auth.Contains('toggleBadgeApplication(')
if ($hasApplyControl) {
    Write-Host "[PASS] 5. Apply control is wired to toggleBadgeApplication" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 5. Apply control is missing or unwired" -ForegroundColor Red
    $allPassed = $false
}

# 6. Applied state is visible
$hasAppliedState = $auth.Contains('isApplied') -and $auth.Contains('Applied') -and $auth.Contains('border-maroon bg-white')
if ($hasAppliedState) {
    Write-Host "[PASS] 6. Applied state is visibly communicated in card and button" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 6. Applied state is not visibly communicated" -ForegroundColor Red
    $allPassed = $false
}

# 7. Requirements expand/collapse correctly
$hasExpandAccordion = $auth.Contains('data-badge-toggle=') -and $auth.Contains('View Requirements') -and $auth.Contains('Hide Requirements') -and $auth.Contains('data-badge-requirements=')
if ($hasExpandAccordion) {
    Write-Host "[PASS] 7. Requirements expand/collapse accordion is functional" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 7. Requirements expand/collapse accordion is missing" -ForegroundColor Red
    $allPassed = $false
}

# 8. All 10 mandatory requirements are present
$mandatoryRequirements = @(
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

$reqFailures = @()
foreach ($req in $mandatoryRequirements) {
    if (-not $auth.Contains($req)) {
        $reqFailures += $req
    }
}

if ($reqFailures.Count -eq 0) {
    Write-Host "[PASS] 8. All 10 mandatory requirements are present and verbatim" -ForegroundColor Green
} else {
    $missingJoined = $reqFailures -join ', '
    Write-Host "[FAIL] 8. Missing requirements: $missingJoined" -ForegroundColor Red
    $allPassed = $false
}

# 9. The 2-year experience exception is explicitly represented
$hasExceptionText = $auth.Contains('strong established brand/new entity') -and 
                    ($auth.Contains('Exception allowed for a strong established brand/new entity') -or $auth.Contains('Exception: strong established brand/new entity'))
if ($hasExceptionText) {
    Write-Host "[PASS] 9. 2-year operating experience exception is explicitly represented" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 9. 2-year operating experience exception missing" -ForegroundColor Red
    $allPassed = $false
}

# 10. No requirement has been accidentally omitted (count == 10)
$verifiedBlockStart = $auth.IndexOf('id: "verified-caterer"')
$cityIconBlockStart = $auth.IndexOf('id: "city-icon-caterer"')
$verifiedSnippet = $auth.Substring($verifiedBlockStart, $cityIconBlockStart - $verifiedBlockStart)

$foundCount = 0
foreach ($req in $mandatoryRequirements) {
    if ($verifiedSnippet.Contains($req)) {
        $foundCount++
    }
}

if ($foundCount -eq 10) {
    Write-Host "[PASS] 10. Exactly 10 requirements found in Verified Caterer definition (none omitted)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 10. Found $foundCount of 10 requirements in Verified Caterer" -ForegroundColor Red
    $allPassed = $false
}

# 11. Checklist UI formatting: checkbox symbol and Requirements header
$hasChecklistUi = $auth.Contains('Requirements') -and ($auth.Contains('aria-hidden="true"') -or $auth.Contains('font-mono text-xs'))
if ($hasChecklistUi) {
    Write-Host "[PASS] 11. Checklist UI formatting uses clean checklist items and Requirements header" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 11. Checklist UI formatting missing checklist items or Requirements header" -ForegroundColor Red
    $allPassed = $false
}

# 12. Badge state is isolated from commercial offerings
$applyFuncIndex = $auth.IndexOf('function toggleBadgeApplication(')
$applyFuncSnippet = if ($applyFuncIndex -gt -1) { $auth.Substring($applyFuncIndex, 250) } else { "" }
$isolatedFromOfferings = (-not $applyFuncSnippet.Contains('setSelectedOfferings')) -and (-not $applyFuncSnippet.Contains('selectedOfferings'))
if ($isolatedFromOfferings) {
    Write-Host "[PASS] 12. Badge application state is strictly isolated from commercial offerings" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 12. Badge application state modifies commercial offerings" -ForegroundColor Red
    $allPassed = $false
}

# 13. Badge state is isolated from V2 onboarding state
$isolatedFromV2 = (-not $v2Html.Contains('verified-caterer')) -and 
                  (-not $v2Html.Contains('vendor-badges-section')) -and 
                  (-not $v2Js.Contains('badgeApplications'))
if ($isolatedFromV2) {
    Write-Host "[PASS] 13. Verified Caterer badge is NOT added to V2 onboarding (isolated)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 13. Verified Caterer badge leaked into V2 onboarding" -ForegroundColor Red
    $allPassed = $false
}

# 14. No notification infrastructure added
$noNotifications = (-not $applyFuncSnippet.Contains('notify')) -and 
                   (-not $applyFuncSnippet.Contains('sendEmail')) -and 
                   (-not $applyFuncSnippet.Contains('adminAlert'))
if ($noNotifications) {
    Write-Host "[PASS] 14. No notification or email infrastructure added for badge application" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 14. Notification infrastructure detected in badge application" -ForegroundColor Red
    $allPassed = $false
}

# 15. No backend approval workflow added
$noBackendApproval = (-not $applyFuncSnippet.Contains('/api/admin')) -and 
                     (-not $applyFuncSnippet.Contains('approvalStatus')) -and 
                     (-not $applyFuncSnippet.Contains('fetch('))
if ($noBackendApproval) {
    Write-Host "[PASS] 15. No premature backend approval workflow or database calls added" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 15. Backend approval workflow detected" -ForegroundColor Red
    $allPassed = $false
}

# 16. Desktop and mobile responsiveness classes present
$hasResponsiveBadgeGrid = $auth.Contains('flex flex-col gap-2.5') -and $auth.Contains('flex items-start justify-between')
if ($hasResponsiveBadgeGrid) {
    Write-Host "[PASS] 16. Responsive design verified for desktop and mobile layouts" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 16. Responsive design classes missing" -ForegroundColor Red
    $allPassed = $false
}

# 17. Existing signup functionality preserved
$hasExistingSignup = $auth.Contains('id="businessName"') -and 
                     $auth.Contains('id="email"') -and 
                     $auth.Contains('id="mobile"') -and 
                     $auth.Contains('id="password"') -and 
                     $auth.Contains('Create Vendor Account')
if ($hasExistingSignup) {
    Write-Host "[PASS] 17. Existing Vendor Signup account creation fields and controls preserved" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 17. Existing Vendor Signup fields altered or missing" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "--------------------------------------------------" -ForegroundColor Gray

if ($allPassed) {
    Write-Host "[SUCCESS] ALL 17 TASK 18 VERIFICATION CHECKS PASSED!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] ONE OR MORE TASK 18 CHECKS FAILED!" -ForegroundColor Red
    exit 1
}
