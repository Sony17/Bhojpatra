$transcripts = Get-ChildItem -Path "C:\Users\Zeeshaan\.gemini\antigravity-ide\brain\" -Filter "transcript*.jsonl" -Recurse

Write-Host "Found $($transcripts.Count) transcripts"

foreach ($t in $transcripts) {
    $matches = Select-String -Path $t.FullName -Pattern 'Limit Box Selection to 5|box selection|Limit Box' -CaseSensitive:$false
    if ($matches) {
        Write-Host "File: $($t.FullName) - Matches: $($matches.Count)"
        foreach ($m in ($matches | Select-Object -First 5)) {
            Write-Host "  Line $($m.LineNumber): $($m.Line.Substring(0, [Math]::Min(150, $m.Line.Length)))"
        }
    }
}
