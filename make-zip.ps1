Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$srcDir = 'C:\dev\webtechpremium-app\tvroku-app'
$zipPath = 'C:\dev\webtechpremium-app\tvroku-app.zip'

if (Test-Path $zipPath) { Remove-Item $zipPath }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

Get-ChildItem -Path $srcDir -Recurse -File | ForEach-Object {
    $relPath = $_.FullName.Substring($srcDir.Length + 1)
    $relPath = $relPath.Replace([System.IO.Path]::DirectorySeparatorChar, '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relPath) | Out-Null
}

$zip.Dispose()
Write-Host "Created $zipPath"
