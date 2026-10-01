$transcript = "C:\Users\Zeeshaan\.gemini\antigravity-ide\brain\41489d02-a888-4731-a3a5-6038b852e230\.system_generated\logs\transcript_full.jsonl"
$line = Get-Content $transcript -TotalCount 1
$obj = ConvertFrom-Json $line
$content = $obj.content

$idx = $content.IndexOf("22.")
if ($idx -ge 0) {
    Write-Host "Found '22.' at $idx"
    Write-Host ($content.Substring($idx, [Math]::Min(1000, $content.Length - $idx)))
} else {
    Write-Host "'22.' not found in step 0"
}
