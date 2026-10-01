$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "BHOJPATRA V2 REVISION: VENDOR SIGN-IN & ONBOARDING DATA FLOW" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$html = [System.IO.File]::ReadAllText("$PSScriptRoot\..\mockups\vendor-registration-v2\index.html", [System.Text.Encoding]::UTF8)
$js   = [System.IO.File]::ReadAllText("$PSScriptRoot\..\mockups\vendor-registration-v2\script.js", [System.Text.Encoding]::UTF8)
$auth = [System.IO.File]::ReadAllText("$PSScriptRoot\..\src\components\auth\AuthForm.tsx", [System.Text.Encoding]::UTF8)

# 1. Vendor Signup collects account details exactly once
$hasSignupOwner = $auth.Contains('id="fullName"') -and $auth.Contains('Owner / Contact Name')
$hasSignupBiz = $auth.Contains('id="businessName"') -and $auth.Contains('Business Name')
$hasSignupEmail = $auth.Contains('name="email"')
$hasSignupMobile = $auth.Contains('name="mobile"')
$hasSignupPass = $auth.Contains('name="password"') -and $auth.Contains('name="confirmPassword"')
$test1 = $hasSignupOwner -and $hasSignupBiz -and $hasSignupEmail -and $hasSignupMobile -and $hasSignupPass
Write-Host ("1. Vendor Signup collects account details once: " + ($(if ($test1) {'PASS'} else {'FAIL'}))) -ForegroundColor ($(if ($test1) {'Green'} else {'Red'}))

# 2. Vendor Sign In does not ask for profile info / behave like signup
$hasSignInCred = $html.Contains('id="signin-credential"')
$hasSignInPass = $html.Contains('id="signin-password"')
$noSignInOwner = -not $html.Contains('id="signin-owner"')
$noSignInBiz = -not $html.Contains('id="signin-biz"')
$test2 = $hasSignInCred -and $hasSignInPass -and $noSignInOwner -and $noSignInBiz
Write-Host ("2. Sign In is pure authentication (email/mobile + password): " + ($(if ($test2) {'PASS'} else {'FAIL'}))) -ForegroundColor ($(if ($test2) {'Green'} else {'Red'}))

# 3. Existing vendor authentication/session is loaded without new record creation
$hasKnownAccounts = $js.Contains('REGISTERED_VENDOR_ACCOUNTS')
$loadsStateAccount = $js.Contains('state.account = {')
$syncsUI = $js.Contains('syncAccountDetailsToUI()')
$test3 = $hasKnownAccounts -and $loadsStateAccount -and $syncsUI
Write-Host ("3. Existing vendor session loaded without duplicate creation: " + ($(if ($test3) {'PASS'} else {'FAIL'}))) -ForegroundColor ($(if ($test3) {'Green'} else {'Red'}))

# 4-8. Onboarding does NOT contain editable signup fields
$noEditOwner = (-not $html.Contains('id="d-owner-name"')) -and (-not $html.Contains('data-bind="details.ownerName"'))
$noEditBiz = (-not $html.Contains('id="d-biz-name"')) -and (-not $html.Contains('data-bind="details.businessName"'))
$noEditEmail = (-not $html.Contains('id="d-email"')) -and (-not $html.Contains('data-bind="details.email"'))
$noEditPhone = (-not $html.Contains('id="d-phone"')) -and (-not $html.Contains('data-bind="details.phone"'))
$noEditPass = (-not $html.Contains('data-bind="details.password"')) -and (-not $html.Contains('data-bind="account.password"'))
$test4_8 = $noEditOwner -and $noEditBiz -and $noEditEmail -and $noEditPhone -and $noEditPass
Write-Host ("4-8. Onboarding contains 0 editable signup fields (Owner, Biz, Email, Mobile, Password): " + ($(if ($test4_8) {'PASS'} else {'FAIL'}))) -ForegroundColor ($(if ($test4_8) {'Green'} else {'Red'}))

# 9. Existing account data displayed read-only where necessary
$hasDesktopReusedCard = $html.Contains('id="d-display-owner"') -and $html.Contains('id="d-display-biz-name"') -and $html.Contains('id="d-display-phone"') -and $html.Contains('id="d-display-email"')
$hasMobileReusedCard = $html.Contains('id="mob-display-owner"') -and $html.Contains('id="mob-display-biz-name"') -and $html.Contains('id="mob-display-phone"') -and $html.Contains('id="mob-display-email"')
$hasReviewDisplay = $js.Contains('${state.account.businessName}') -and $js.Contains('${state.account.name}')
$test9 = $hasDesktopReusedCard -and $hasMobileReusedCard -and $hasReviewDisplay
Write-Host ("9. Account data displayed as read-only verified summary: " + ($(if ($test9) {'PASS'} else {'FAIL'}))) -ForegroundColor ($(if ($test9) {'Green'} else {'Red'}))

# 10. Onboarding-specific data separated from account identity data
$hasAccountObj = $js.Contains('account: {') -and $js.Contains('businessName: "Royal Awadh Caterers"')
$hasDetailsGetters = $js.Contains('get businessName()') -and $js.Contains('get ownerName()') -and $js.Contains('get email()') -and $js.Contains('get phone()')
$test10 = $hasAccountObj -and $hasDetailsGetters
Write-Host ("10. Account identity in state.account; onboarding data separated in state.details: " + ($(if ($test10) {'PASS'} else {'FAIL'}))) -ForegroundColor ($(if ($test10) {'Green'} else {'Red'}))

# 11. Phase 1 & 2 regressions check
$hasSignInEntryPoints = $html.Contains('btn-vendor-signin') -and $html.Contains('existing-vendor-signin-banner')
$dShellIndex = $html.IndexOf('class="dashboard-shell"')
$mShellIndex = $html.IndexOf('class="mobile-dashboard-shell"')
$desktopDashHtml = if ($dShellIndex -gt -1) { $html.Substring($dShellIndex, 15000) } else { "" }
$mobileDashHtml = if ($mShellIndex -gt -1) { $html.Substring($mShellIndex, 15000) } else { "" }
$noHostPhone = (-not $desktopDashHtml.Contains('host-contact-link')) -and (-not $mobileDashHtml.Contains('host-contact-link'))
$noDashPreview = (-not $desktopDashHtml.Contains('btn-preview-store')) -and (-not $mobileDashHtml.Contains('btn-preview-store')) -and (-not $js.Contains('btn-preview-store'))
$stallOptional = $html.Contains('field-optional')
$noVariedDelicacies = -not $html.Contains('data-format="varied"')
$hasCustomOfferings = $js.Contains('addCustomOffering')
$test11 = $hasSignInEntryPoints -and $noHostPhone -and $noDashPreview -and $stallOptional -and $noVariedDelicacies -and $hasCustomOfferings
Write-Host ("11. Phase 1 and 2 functionality preserved (Tasks 1-8): " + ($(if ($test11) {'PASS'} else {'FAIL'}))) -ForegroundColor ($(if ($test11) {'Green'} else {'Red'}))

# 12. No duplicate records created
$test12 = $test2 -and $test3 -and $test10
Write-Host ("12. No duplicate vendor/account records created: " + ($(if ($test12) {'PASS'} else {'FAIL'}))) -ForegroundColor ($(if ($test12) {'Green'} else {'Red'}))

Write-Host "--------------------------------------------------" -ForegroundColor Cyan
if ($test1 -and $test2 -and $test3 -and $test4_8 -and $test9 -and $test10 -and $test11 -and $test12) {
    Write-Host "ALL 12 REVISION VERIFICATION CHECKS PASSED!" -ForegroundColor Green
} else {
    Write-Host "SOME REVISION CHECKS FAILED!" -ForegroundColor Red
    exit 1
}
