# Admin tool: deletes a mod from GitHub (removes its zip + updates catalog.json)
# so it disappears for ALL users. Run via: delete-mod.bat

$ErrorActionPreference = 'Stop'

$Owner = 'i-Flan'
$Repo  = 'Fivey'
$Tag   = 'content'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$tokenFile = Join-Path $root 'github-token.txt'
if (-not (Test-Path $tokenFile)) {
  Write-Host "[ERROR] github-token.txt not found next to this tool." -ForegroundColor Red
  Read-Host "Press Enter to exit"; exit 1
}
$token = (Get-Content $tokenFile -Raw).Trim()
$headers = @{ Authorization = "Bearer $token"; 'User-Agent' = 'mod-admin'; Accept = 'application/vnd.github+json' }

# Get the content release
try {
  $release = Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/$Owner/$Repo/releases/tags/$Tag"
} catch {
  Write-Host "No mods found (content release does not exist yet)." -ForegroundColor Yellow
  Read-Host "Press Enter to exit"; exit 0
}

$catAsset = $release.assets | Where-Object { $_.name -eq 'catalog.json' }
if (-not $catAsset) { Write-Host "No catalog / no mods to delete." -ForegroundColor Yellow; Read-Host "Press Enter to exit"; exit 0 }

$catalog = Invoke-RestMethod -Uri $catAsset.browser_download_url
$mods = @($catalog.mods)
if ($mods.Count -eq 0) { Write-Host "No mods to delete." -ForegroundColor Yellow; Read-Host "Press Enter to exit"; exit 0 }

Write-Host "=== Delete a mod ===" -ForegroundColor Cyan
Write-Host "Current mods:"
for ($i = 0; $i -lt $mods.Count; $i++) {
  $m = $mods[$i]
  Write-Host ("  {0}) {1}   [{2}]" -f ($i + 1), $m.folderName, $m.category) -ForegroundColor White
}
$choice = (Read-Host "Type the number to DELETE (or 0 to cancel)").Trim()
$idx = 0
[void][int]::TryParse($choice, [ref]$idx)
if ($idx -lt 1 -or $idx -gt $mods.Count) { Write-Host "Cancelled." -ForegroundColor Yellow; Read-Host "Press Enter to exit"; exit 0 }

$target = $mods[$idx - 1]
$confirm = (Read-Host ("Delete '{0}' for everyone? type yes to confirm" -f $target.folderName)).Trim().ToLower()
if ($confirm -ne 'yes') { Write-Host "Cancelled." -ForegroundColor Yellow; Read-Host "Press Enter to exit"; exit 0 }

Write-Host "Deleting..." -ForegroundColor Yellow

# 1) Delete the mod zip asset
$assetName = "$($target.folderName).zip"
$zipAsset = $release.assets | Where-Object { $_.name -eq $assetName }
if ($zipAsset) { Invoke-RestMethod -Headers $headers -Method Delete -Uri "https://api.github.com/repos/$Owner/$Repo/releases/assets/$($zipAsset.id)" | Out-Null }

# 2) Rebuild catalog without this mod and re-upload
$remaining = @($mods | Where-Object { $_.id -ne $target.id })
Invoke-RestMethod -Headers $headers -Method Delete -Uri "https://api.github.com/repos/$Owner/$Repo/releases/assets/$($catAsset.id)" | Out-Null

$items = @()
foreach ($m in $remaining) { $items += ($m | ConvertTo-Json -Depth 6 -Compress) }
$json = '{"version":1,"mods":[' + ($items -join ',') + ']}'
$catTmp = Join-Path $env:TEMP 'catalog.json'
[System.IO.File]::WriteAllText($catTmp, $json, (New-Object System.Text.UTF8Encoding($false)))

$catUrl = "https://uploads.github.com/repos/$Owner/$Repo/releases/$($release.id)/assets?name=catalog.json"
$out = & curl.exe -s -w "|HTTP%{http_code}" -X POST -H "Authorization: Bearer $token" -H "Content-Type: application/json" --data-binary "@$catTmp" $catUrl
$code = ($out -split '\|HTTP')[-1]
if ($code -notin @('200','201')) { Write-Host "[ERROR] Failed to update catalog (HTTP $code)." -ForegroundColor Red; Write-Host $out; Read-Host "Press Enter to exit"; exit 1 }

Write-Host ""
Write-Host ("[DONE] '{0}' deleted. Remaining mods: {1}" -f $target.folderName, $remaining.Count) -ForegroundColor Green
Write-Host "It will disappear for users when they refresh the app."
Read-Host "Press Enter to exit"
