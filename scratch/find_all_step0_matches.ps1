$transcript = "C:\Users\Zeeshaan\.gemini\antigravity-ide\brain\41489d02-a888-4731-a3a5-6038b852e230\.system_generated\logs\transcript_full.jsonl"
$line = Get-Content $transcript -TotalCount 1
$obj = ConvertFrom-Json $line
$content = $obj.content

$matches = [regex]::Matches($content, '(?i)(?:box|22)')
Write-Host "Matches in step 0: $($matches.Count)"
foreach ($m in $matches) {
    $start = [Math]::Max(0, $m.Index - 40)
    $len = [Math]::Min(120, $content.Length - $start)
    Write-Host ("[{0}] {1}" -f $m.Index, $content.Substring($start, $len).Replace("`n", " "))
}
