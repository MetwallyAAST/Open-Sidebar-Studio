$ErrorActionPreference = 'Stop'
$taskData = Join-Path $env:LOCALAPPDATA 'SidebarBuilderPostgres'
$taskBin = 'C:\Program Files\PostgreSQL\18\bin'
New-Item -ItemType Directory -Force -Path $taskData | Out-Null
if (-not (Test-Path .env)) {
  $taskRandom = [Security.Cryptography.RandomNumberGenerator]::Create()
  $taskBytes = New-Object byte[] 24
  $taskRandom.GetBytes($taskBytes)
  $taskPassword = -join ($taskBytes | ForEach-Object { $_.ToString('x2') })
  $taskRandom.GetBytes($taskBytes)
  $taskAdminPassword = -join ($taskBytes | ForEach-Object { $_.ToString('x2') })
  @("POSTGRES_PASSWORD=$taskPassword", "DATABASE_URL=postgresql://sidebar:$taskPassword@127.0.0.1:55432/sidebar_builder", 'APP_ORIGIN=http://127.0.0.1:3100', 'SEED_ADMIN_EMAIL=admin@sidebar.local', "SEED_ADMIN_PASSWORD=$taskAdminPassword") | Set-Content -LiteralPath .env
}
$taskPasswordLine = Get-Content .env | Where-Object { $_.StartsWith('POSTGRES_PASSWORD=') }
$taskPassword = $taskPasswordLine.Substring('POSTGRES_PASSWORD='.Length)
if (-not (Test-Path (Join-Path $taskData 'data\PG_VERSION'))) {
  Set-Content -LiteralPath (Join-Path $taskData 'password.tmp') -Value $taskPassword
  try { & "$taskBin\initdb.exe" -D (Join-Path $taskData 'data') -U sidebar --auth=scram-sha-256 "--pwfile=$taskData\password.tmp" -E UTF8; if ($LASTEXITCODE -ne 0) { throw 'initdb failed' } }
  finally { Remove-Item -LiteralPath (Join-Path $taskData 'password.tmp') }
}
& "$taskBin\pg_ctl.exe" status -D (Join-Path $taskData 'data')
if ($LASTEXITCODE -ne 0) {
  Start-Process -FilePath "$taskBin\pg_ctl.exe" -ArgumentList @('start','-D',"`"$taskData\data`"",'-l',"`"$taskData\postgres.log`"",'-o','"-p 55432 -h 127.0.0.1"') -WindowStyle Hidden
  for ($taskTry = 0; $taskTry -lt 20; $taskTry++) {
    & "$taskBin\pg_isready.exe" -h 127.0.0.1 -p 55432 -q
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Milliseconds 500
  }
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL did not start. Check the isolated postgres.log.' }
}
$env:PGPASSWORD = $taskPassword
try {
  $taskExists = & "$taskBin\psql.exe" -h 127.0.0.1 -p 55432 -U sidebar -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='sidebar_builder'"
  if ($taskExists -ne '1') { & "$taskBin\createdb.exe" -h 127.0.0.1 -p 55432 -U sidebar sidebar_builder }
} finally { Remove-Item Env:\PGPASSWORD }
