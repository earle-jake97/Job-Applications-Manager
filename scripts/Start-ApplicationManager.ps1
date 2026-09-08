param([switch]$CheckOnly, [switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$ownedProcesses = @()
$mutex = New-Object System.Threading.Mutex($false, 'Local\ApplicationManagerLauncher')
$hasLock = $false

function Get-Page($Url) {
    try { return Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 } catch { return $null }
}

function Test-Api {
    $page = Get-Page 'http://127.0.0.1:3001/api/health'
    if (!$page) { return $false }
    try { return ($page.Content | ConvertFrom-Json).application -eq 'application-manager' } catch { return $false }
}

function Test-Frontend {
    $page = Get-Page 'http://localhost:5173/'
    return $page -and $page.Content.Contains('name="application-id" content="application-manager"') -and $page.Content.Contains('/@vite/client')
}

function Assert-PortFree($Port) {
    $listener = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
        Where-Object { $_.Port -eq $Port }
    if ($listener) { throw "Port $Port is occupied by a server this launcher cannot identify. Stop that server and try again." }
}

function Wait-Ready($Test, $Process, $Name) {
    $deadline = (Get-Date).AddSeconds(30)
    do {
        if (& $Test) { return }
        if ($Process.HasExited) { throw "$Name exited. See the logs in $projectRoot\.run." }
        Start-Sleep -Milliseconds 400
    } while ((Get-Date) -lt $deadline)
    throw "$Name did not become ready within 30 seconds. See the logs in $projectRoot\.run."
}

try {
    $hasLock = $mutex.WaitOne(0)
    if (!$hasLock) { throw 'The launcher is already open. Use its existing window.' }
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    foreach ($relativePath in @('server/.env', 'server/node_modules/tsx', 'client/node_modules/vite/bin/vite.js')) {
        if (!(Test-Path -LiteralPath (Join-Path $projectRoot $relativePath))) {
            throw "Missing $relativePath. See README.md for the one-time setup."
        }
    }

    $service = Get-Service -Name 'postgresql-x64-18' -ErrorAction Stop
    if ($service.Status -ne 'Running') {
        if ($CheckOnly) { throw 'PostgreSQL is stopped.' }
        Write-Host 'Starting PostgreSQL. Windows may ask for administrator permission.'
        $elevated = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ArgumentList @(
            '-NoProfile', '-Command', '"try { Start-Service -Name postgresql-x64-18 -ErrorAction Stop } catch { exit 1 }"'
        )
        if ($elevated.ExitCode -ne 0) { throw 'Could not start PostgreSQL.' }
        $service.WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
    }

    # Normal launches create the database and apply pending migrations. CheckOnly stays read-only.
    Push-Location (Join-Path $projectRoot 'server')
    try {
        if (!$CheckOnly) {
            & $node --env-file=.env --import tsx src/setup-db.ts
            if ($LASTEXITCODE -ne 0) { throw 'Database initialization failed. See the message above.' }
        }
        & $node --env-file=.env --import tsx src/check-launch.ts
        if ($LASTEXITCODE -ne 0) { throw 'Database setup check failed. See the message above.' }
    } finally { Pop-Location }
    if ($CheckOnly) { Write-Host 'Launcher prerequisites passed.'; exit 0 }

    $logDirectory = Join-Path $projectRoot '.run'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    if (!(Test-Api)) {
        Assert-PortFree 3001
        $api = Start-Process -FilePath $node -WorkingDirectory (Join-Path $projectRoot 'server') -ArgumentList @('--env-file=.env', '--import', 'tsx', 'src/index.ts') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'api.log') -RedirectStandardError (Join-Path $logDirectory 'api-error.log')
        $ownedProcesses += $api
        Wait-Ready ${function:Test-Api} $api 'API'
    } else { Write-Host 'Reusing the running API.' }
    if (!(Test-Frontend)) {
        Assert-PortFree 5173
        $frontend = Start-Process -FilePath $node -WorkingDirectory (Join-Path $projectRoot 'client') -ArgumentList @('node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'client.log') -RedirectStandardError (Join-Path $logDirectory 'client-error.log')
        $ownedProcesses += $frontend
        Wait-Ready ${function:Test-Frontend} $frontend 'Frontend'
    } else { Write-Host 'Reusing the running frontend.' }

    if (!(Get-Page 'http://localhost:5173/api/applications')) { throw 'The page cannot reach the applications API. Check the logs in .run.' }
    if (!$NoBrowser) { Start-Process 'http://localhost:5173/' }
    Write-Host 'Application Manager is ready at http://localhost:5173/'
    Read-Host 'Keep this window open. Press Enter to stop the servers this launcher started' | Out-Null
} catch {
    Write-Host "Could not launch Application Manager: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    foreach ($ownedProcess in $ownedProcesses) {
        if (!$ownedProcess.HasExited) { $ownedProcess.Kill(); $ownedProcess.WaitForExit() }
    }
    if ($hasLock) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
