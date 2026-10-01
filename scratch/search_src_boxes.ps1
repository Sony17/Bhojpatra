$matches = Select-String -Path "src\**\*" -Pattern 'box' -CaseSensitive:$false
Write-Host "Total matches for box in src: $($matches.Count)"

$fiveMatches = $matches | Where-Object { $_.Line -match '5|five|limit|max' }
Write-Host "Matches with 5/five/limit/max: $($fiveMatches.Count)"
foreach ($m in ($fiveMatches | Select-Object -First 30)) {
    Write-Host "$($m.Filename):$($m.LineNumber) -> $($m.Line.Trim())"
}
