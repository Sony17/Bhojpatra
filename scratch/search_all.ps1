$files = Get-ChildItem -Path "mockups/vendor-registration-v2", "src" -Recurse -Include *.js, *.html, *.tsx, *.ts -File

foreach ($f in $files) {
    $matches = Select-String -Path $f.FullName -Pattern "Selectable|Upgrade|Bhojpatra Packages|Concierge|Mandatory Initial Gate|Regional Scope|Included Service Crew"
    if ($matches) {
        foreach ($m in $matches) {
            Write-Host ($f.Name + ":" + $m.LineNumber + ": " + $m.Line.Trim())
        }
    }
}
