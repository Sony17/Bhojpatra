$html = Get-Content -Raw "mockups/vendor-registration-v2/index.html"
$script:passed = 0
$script:total = 0

function Test-Check([string]$desc, [bool]$cond) {
    $script:total++
    if ($cond) {
        $script:passed++
        Write-Host "  [PASS] $desc" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $desc" -ForegroundColor Red
    }
}

Write-Host "=================================================="
Write-Host "BHOJPATRA V2 ONBOARDING: EXCESS INFO CLEANUP AUDIT"
Write-Host "=================================================="

# 1. Example A: Concierge / Help Promotion
$c1 = -not ($html -match 'Need help\?\s*Chat with Concierge')
Test-Check "No 'Need help? Chat with Concierge' promotional link in onboarding header" $c1

# 2. Example B: Bhojpatra Packages A-D
$c2 = -not ($html -match 'Bhojpatra Packages A[–-]D')
Test-Check "No redundant 'Bhojpatra Packages A-D' badge" $c2

# 3. Example C: Redundant Badges & Upgrades
$c3 = -not ($html -match '<span class="badge">Included Service Crew</span>')
Test-Check "No redundant 'Included Service Crew' badge in essentials" $c3

$c4 = -not ($html -match 'Mandatory Initial Gate')
Test-Check "No redundant 'Mandatory Initial Gate' badge in dietary section" $c4

$c5 = -not ($html -match 'Regional Scope')
Test-Check "No redundant 'Regional Scope' badge in commercial kitchen operations" $c5

$c6 = -not ($html -match 'Customizable</span>')
Test-Check "No redundant 'Customizable' badge in custom stall category adder" $c6

# 4. Internal Developer / Stakeholder Commentary
$c7 = -not ($html -match 'Sony emphasized:')
Test-Check "No 'Sony emphasized:' commentary in HTML" $c7

$c8 = -not ($html -match 'Sony requested:')
Test-Check "No 'Sony requested:' commentary in HTML" $c8

$c9 = -not ($html -match 'Vendor Profile Architecture Note')
Test-Check "No 'Vendor Profile Architecture Note (Stakeholder Requirement)' in completion view" $c9

# 5. Outdated Copy Cleaned
$c10 = -not ($html -match 'Fixed spread or varied delicacies')
Test-Check "No outdated 'varied delicacies' in Single Specialty Stall features" $c10

$c11 = -not ($html -match 'Directly populates the "Best For" tag')
Test-Check "No redundant 'Directly populates the Best For tag' field-hint" $c11

# 6. Preserved Primary Form Controls & Anchors
$c12 = [bool]($html -match 'class="btn-vendor-signin"')
Test-Check "Header retains .btn-vendor-signin action" $c12

$c13 = [bool]($html -match 'id="desktop-diet-section"')
Test-Check "Kitchen Dietary Offering section preserved" $c13

$c14 = [bool]($html -match 'class="vendor-account-reused-card"')
Test-Check "Verified Vendor Account Reused card preserved" $c14

$c15 = [bool]($html -match 'id="d-city"')
Test-Check "Primary Kitchen City select preserved (#d-city)" $c15

$c16 = [bool]($html -match 'id="d-state"')
Test-Check "Primary Kitchen State select preserved (#d-state)" $c16

$c17 = [bool]($html -match 'id="desktop-cuisine-chips"')
Test-Check "Cuisine chips container preserved (#desktop-cuisine-chips)" $c17

$c18 = [bool]($html -match 'id="desktop-service-cities-grid"')
Test-Check "Serviceable cities container preserved (#desktop-service-cities-grid)" $c18

$c19 = [bool]($html -match 'id="d-gst"')
Test-Check "GSTIN input preserved (#d-gst)" $c19

$c20 = [bool]($html -match 'id="d-fssai"')
Test-Check "FSSAI input preserved (#d-fssai)" $c20

$c21 = [bool]($html -match 'id="cat-pkg-name"')
Test-Check "Feast Package Name input preserved (#cat-pkg-name)" $c21

$c22 = [bool]($html -match 'id="cat-lead-hours"')
Test-Check "Minimum Preparation Notice select preserved (#cat-lead-hours)" $c22

$c23 = [bool]($html -match 'data-cutlery-id="essential"' -and $html -match 'data-cutlery-id="standard"' -and $html -match 'data-cutlery-id="premium"' -and $html -match 'data-cutlery-id="ultra"')
Test-Check "Feast Tableware presentation cards A-D preserved" $c23

$c24 = [bool]($html -match 'id="desktop-feast-essentials-row"')
Test-Check "Feast Service Essentials row preserved (#desktop-feast-essentials-row)" $c24

$c25 = [bool]($html -match 'id="desktop-stall-categories-grid"')
Test-Check "Single Stall Categories grid preserved (#desktop-stall-categories-grid)" $c25

$c26 = [bool]($html -match 'id="desktop-custom-stall-cat-input"')
Test-Check "Single Stall custom category input preserved (#desktop-custom-stall-cat-input)" $c26

$c27 = [bool]($html -match 'id="desktop-stall-specialty"')
Test-Check "Stall Category Specialty select preserved (#desktop-stall-specialty)" $c27

$c28 = [bool]($html -match 'id="desktop-btn-add-box"' -and $html -match 'id="desktop-box-limit-notice"')
Test-Check "Baina Box add button (#desktop-btn-add-box) and 5-selection limit notice preserved" $c28

$c29 = [bool]($html -match 'id="master-review-content"')
Test-Check "Consolidated Master Review container preserved (#master-review-content)" $c29

$c30 = [bool]($html -match 'data-step-id="view-complete"')
Test-Check "Vendor Registration Complete container preserved (data-step-id='view-complete')" $c30

Write-Host "=================================================="
Write-Host ("RESULTS: {0} / {1} passed" -f $script:passed, $script:total)
if ($script:passed -eq $script:total) {
    Write-Host "ALL EXCESS INFO CLEANUP CHECKS PASSED!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "SOME CHECKS FAILED!" -ForegroundColor Red
    exit 1
}
