$transcript = "C:\Users\Zeeshaan\.gemini\antigravity-ide\brain\41489d02-a888-4731-a3a5-6038b852e230\.system_generated\logs\transcript.jsonl"
$match = Get-Content $transcript | Where-Object { $_ -match '"type":"USER_INPUT"' -and $_ -match 'TASK 22' } | Select-Object -First 1
if ($match) {
    [System.IO.File]::WriteAllText("scratch/task22_found.txt", $match, [System.Text.Encoding]::UTF8)
    Write-Host "Found match and saved to scratch/task22_found.txt"
} else {
    Write-Host "No match found"
}
