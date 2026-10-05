# YABB auto-deploy. The scheduled task "YABB Auto Deploy" runs this every 2 minutes on the A6.
# If GitHub's main branch has moved on: fast-forward C:\YABB, rebuild, check the new version is healthy,
# and roll back if it isn't. A version that failed is skipped until a newer one arrives.
# Nothing on GitHub can reach in here; the A6 only ever pulls.
param([string]$Repo = 'C:\YABB', [string]$Branch = 'main')
$ErrorActionPreference = 'Continue'
Set-Location $Repo

# one run at a time
$mutex = New-Object System.Threading.Mutex($false, 'Global\YabbAutoDeploy')
if (-not $mutex.WaitOne(0)) { exit 0 }

$log = Join-Path $Repo 'deploy.log'
function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m" | Add-Content -Encoding UTF8 $log }
# the admin page reads this file (BACKUP_DIR is mounted into the app)
$backupLine = Get-Content (Join-Path $Repo '.env') | Where-Object { $_ -match '^YABB_BACKUP_PATH=' } | Select-Object -First 1
$statusFile = Join-Path ($(if ($backupLine) { $backupLine -replace '^YABB_BACKUP_PATH=', '' } else { Join-Path $Repo 'backups' })) 'deploy-status.json'
function ReadStatus() { try { Get-Content $statusFile -Raw | ConvertFrom-Json } catch { $null } }
function WriteStatus($ok, $version, $note, $failed) {
  [ordered]@{ ok = $ok; version = $version; note = $note; failedCommit = $failed; ts = [DateTimeOffset]::Now.ToUnixTimeMilliseconds() } |
    ConvertTo-Json | Set-Content -Encoding UTF8 $statusFile
}
function Short($sha) { $sha.Substring(0, 7) }

git fetch -q origin $Branch 2>$null
if ($LASTEXITCODE -ne 0) { exit 0 } # offline: try again next time
$old = (git rev-parse HEAD).Trim()
$new = (git rev-parse "origin/$Branch").Trim()
$onBranch = (git rev-parse --abbrev-ref HEAD).Trim() -eq $Branch
if ($old -eq $new -and $onBranch) { exit 0 }
$prev = ReadStatus
if ($prev -and $prev.failedCommit -eq $new) { exit 0 } # already failed once; wait for a fix

Log "updating $(Short $old) -> $(Short $new)"
if (-not $onBranch) { git checkout -q $Branch 2>&1 | ForEach-Object { Log "  $_" } }
git merge --ff-only -q "origin/$Branch" 2>&1 | ForEach-Object { Log "  $_" }
if ($LASTEXITCODE -ne 0 -or (git rev-parse HEAD).Trim() -ne $new) {
  Log 'FAILED: the code in C:\YABB was changed by hand, so it cannot update. Undo the change (git status shows it).'
  WriteStatus $false (Short $old) 'The code on the A6 was changed by hand, so it could not update.' $new
  exit 1
}

function Build() {
  $env:APP_VERSION = Short (git rev-parse HEAD).Trim()
  docker compose up -d --build 2>&1 | ForEach-Object { Log "  $_" }
  return $LASTEXITCODE -eq 0
}
# healthy = the app answers with the version we just built
function Healthy($v) {
  for ($i = 0; $i -lt 40; $i++) {
    $h = docker exec yabb-app wget -qO- http://127.0.0.1:8080/api/health 2>$null
    if ("$h" -match "`"version`":`"$v`"") { return $true }
    Start-Sleep -Seconds 3
  }
  return $false
}

if ((Build) -and (Healthy (Short $new))) {
  Log "deployed $(Short $new)"
  WriteStatus $true (Short $new) $null $null
  exit 0
}
Log "FAILED: $(Short $new) did not start. Rolling back to $(Short $old)."
git reset -q --hard $old
$back = (Build) -and (Healthy (Short $old))
Log $(if ($back) { "rolled back to $(Short $old)" } else { 'ROLLBACK ALSO FAILED: YABB may be down. Check: docker compose ps' })
WriteStatus $false (Short $old) "Version $(Short $new) would not start, so YABB stayed on $(Short $old)." $new
exit 1
