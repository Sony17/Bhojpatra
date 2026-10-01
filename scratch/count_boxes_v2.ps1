$files = Get-ChildItem -Path "mockups/vendor-registration-v2" -File

foreach ($f in $files) {
    $matches = Select-String -Path $f.FullName -Pattern 'box' -CaseSensitive:$false
    Write-Host "$($f.Name): $($matches.Count) matches"
}
