$transcript = "C:\Users\Zeeshaan\.gemini\antigravity-ide\brain\41489d02-a888-4731-a3a5-6038b852e230\.system_generated\logs\transcript.jsonl"
$line = Get-Content $transcript -TotalCount 1
$obj = ConvertFrom-Json $line
$obj.content | Out-File -FilePath "scratch/step0_content.txt" -Encoding utf8
Write-Host "Wrote step 0 content, length: $($obj.content.Length)"
