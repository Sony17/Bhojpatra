$transcript = "C:\Users\Zeeshaan\.gemini\antigravity-ide\brain\41489d02-a888-4731-a3a5-6038b852e230\.system_generated\logs\transcript.jsonl"
Get-Content $transcript | ForEach-Object {
    if ($_ -match 'Limit Box Selection to 5') {
        $json = ConvertFrom-Json $_
        Write-Host "Step: $($json.step_index), Type: $($json.type), Source: $($json.source)"
    }
}
