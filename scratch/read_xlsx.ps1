Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path "Bhojpatra_Progress_Tracker.xlsx").Path)
$entry = $zip.GetEntry("xl/sharedStrings.xml")
if ($entry) {
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $xml = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    $zip.Dispose()
    [regex]::Matches($xml, '<t>(.*?)</t>') | ForEach-Object { $_.Groups[1].Value } | Out-File "scratch/tracker_strings.txt" -Encoding utf8
    Write-Host "Wrote strings to scratch/tracker_strings.txt"
} else {
    Write-Host "No sharedStrings found"
}
