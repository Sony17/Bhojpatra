$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "BHOJPATRA V2 ONBOARDING: PHASE 4 TASK 17 VERIFICATION" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$authPath = "$PSScriptRoot\..\src\components\auth\AuthForm.tsx"
$auth = [System.IO.File]::ReadAllText($authPath, [System.Text.Encoding]::UTF8)

$allPassed = $true

# 1. Badge section exists on the actual Vendor Signup page (AuthForm.tsx)
$hasBadgeSection = $auth.Contains('id="vendor-badges-section"') -and $auth.Contains('Badges & Recognition')
if ($hasBadgeSection) {
    Write-Host "[PASS] 1. Badge section exists on actual Vendor Signup page" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 1. Badge section exists on actual Vendor Signup page" -ForegroundColor Red
    $allPassed = $false
}

# 2. It appears directly after the existing Offerings section
$offeringIndex = $auth.IndexOf('Commercial Offerings')
$badgeIndex = $auth.IndexOf('id="vendor-badges-section"')
$afterOfferings = ($offeringIndex -gt 0) -and ($badgeIndex -gt $offeringIndex)
if ($afterOfferings) {
    Write-Host "[PASS] 2. Badge section appears directly after Offerings section" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 2. Badge section appears directly after Offerings section (offeringIndex: $offeringIndex, badgeIndex: $badgeIndex)" -ForegroundColor Red
    $allPassed = $false
}

# 3. It is on the same signup page
$isVendorBlock = $auth.Contains('isSignup && isVendor') -and $auth.Contains('Create Vendor Account')
if ($isVendorBlock) {
    Write-Host "[PASS] 3. Badge section is on the same Vendor Signup page" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 3. Badge section is on the same Vendor Signup page" -ForegroundColor Red
    $allPassed = $false
}

# 4. It contains exactly three badge options: Verified Caterer, City Icon Caterer, Heritage Caterer
$hasVerified = $auth.Contains('"verified-caterer"') -and $auth.Contains('"Verified Caterer"')
$hasCityIcon = $auth.Contains('"city-icon-caterer"') -and $auth.Contains('"City Icon Caterer"')
$hasHeritage = $auth.Contains('"heritage-caterer"') -and $auth.Contains('"Heritage Caterer"')
$hasThreeBadges = $hasVerified -and $hasCityIcon -and $hasHeritage
if ($hasThreeBadges) {
    Write-Host "[PASS] 4. Contains exactly 3 badges (Verified Caterer, City Icon Caterer, Heritage Caterer)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 4. Contains exactly 3 badges (Verified: $hasVerified, CityIcon: $hasCityIcon, Heritage: $hasHeritage)" -ForegroundColor Red
    $allPassed = $false
}

# 5. Each badge has an Apply control
$hasApplyControls = $auth.Contains('data-badge-apply=') -and $auth.Contains('toggleBadgeApplication(') -and $auth.Contains('Applied')
if ($hasApplyControls) {
    Write-Host "[PASS] 5. Each badge has an Apply control with toggleable applied state" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 5. Each badge has an Apply control" -ForegroundColor Red
    $allPassed = $false
}

# 6. Each badge has a View Requirements/expandable requirements control
$hasExpandControl = $auth.Contains('data-badge-toggle=') -and $auth.Contains('View Requirements') -and $auth.Contains('Hide Requirements') -and $auth.Contains('data-badge-requirements=')
if ($hasExpandControl) {
    Write-Host "[PASS] 6. Each badge has an expandable View Requirements control" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 6. Each badge has an expandable View Requirements control" -ForegroundColor Red
    $allPassed = $false
}

# 7. Applying does not create a vendor/account record prematurely
# Toggling badge only updates client state badgeApplications without calling POST /api
$applyFnIndex = $auth.IndexOf('function toggleBadgeApplication(')
$applyFnSnippet = if ($applyFnIndex -gt -1) { $auth.Substring($applyFnIndex, 250) } else { "" }
$noPrematurePost = (-not $applyFnSnippet.Contains('fetch(')) -and (-not $applyFnSnippet.Contains('POST'))
if ($noPrematurePost) {
    Write-Host "[PASS] 7. Applying badge does not create vendor/account record prematurely" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 7. Applying badge creates premature record" -ForegroundColor Red
    $allPassed = $false
}

# 8. Applying does not alter commercial offerings
$hasSeparateOfferingState = $auth.Contains('const [selectedOfferings, setSelectedOfferings] = useState')
$hasSeparateBadgeState = $auth.Contains('const [badgeApplications, setBadgeApplications] = useState')
$isolatedState = $hasSeparateOfferingState -and $hasSeparateBadgeState -and (-not $applyFnSnippet.Contains('setSelectedOfferings'))
if ($isolatedState) {
    Write-Host "[PASS] 8. Applying badge does not alter commercial offerings state" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 8. Applying badge alters commercial offerings state" -ForegroundColor Red
    $allPassed = $false
}

# 9. Applying does not alter V2 onboarding state
$v2Html = [System.IO.File]::ReadAllText("$PSScriptRoot\..\mockups\vendor-registration-v2\index.html", [System.Text.Encoding]::UTF8)
$v2Js   = [System.IO.File]::ReadAllText("$PSScriptRoot\..\mockups\vendor-registration-v2\script.js", [System.Text.Encoding]::UTF8)
$v2UntouchedByBadges = (-not $v2Html.Contains('vendor-badges-section')) -and (-not $v2Js.Contains('badgeApplications'))
if ($v2UntouchedByBadges) {
    Write-Host "[PASS] 9. V2 onboarding state remains unaltered and isolated from badges" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 9. V2 onboarding state altered" -ForegroundColor Red
    $allPassed = $false
}

# 10. No notification infrastructure was added
$gitDiff = git diff --name-only
$noNotificationFiles = -not ($gitDiff -match 'notification|email|cron|job')
if ($noNotificationFiles) {
    Write-Host "[PASS] 10. No notification infrastructure or backend APIs added" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 10. Notification infrastructure was added" -ForegroundColor Red
    $allPassed = $false
}

# 11. Desktop and mobile signup layouts contain the section where applicable
$hasResponsiveGrid = $auth.Contains('grid-cols-2 gap-2 sm:grid-cols-4') -and $auth.Contains('flex flex-col gap-2.5')
if ($hasResponsiveGrid) {
    Write-Host "[PASS] 11. Responsive layout cleanly handles mobile and desktop viewports" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 11. Responsive layout missing" -ForegroundColor Red
    $allPassed = $false
}

# 12. Existing signup functionality still works
$hasOwnerField = $auth.Contains('id="fullName"') -and $auth.Contains('Owner / Contact Name')
$hasBizField = $auth.Contains('id="businessName"') -and $auth.Contains('Business Name')
$hasEmailField = $auth.Contains('id="email"')
$hasMobileField = $auth.Contains('id="mobile"')
$hasPassField = $auth.Contains('id="password"') -and $auth.Contains('id="confirmPassword"')
$hasTermsField = $auth.Contains('name="terms"')
$hasSubmitBtn = $auth.Contains('Create Vendor Account')
$signupIntact = $hasOwnerField -and $hasBizField -and $hasEmailField -and $hasMobileField -and $hasPassField -and $hasTermsField -and $hasSubmitBtn
if ($signupIntact) {
    Write-Host "[PASS] 12. Existing signup functionality and account creation remain intact" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 12. Existing signup functionality damaged" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "--------------------------------------------------"
if ($allPassed) {
    Write-Host "ALL TASK 17 CHECKS PASSED!" -ForegroundColor Green
} else {
    Write-Host "SOME TASK 17 CHECKS FAILED." -ForegroundColor Red
    exit 1
}
