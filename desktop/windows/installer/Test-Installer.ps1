param([Parameter(Mandatory)][string]$Installer)
$ErrorActionPreference = 'Stop'
$destination = Join-Path $env:RUNNER_TEMP 'moderno-install-test'
$profile = Join-Path $env:LOCALAPPDATA 'Moderno.app\Windows\WebView2'
# Runner efímero de CI; solo datos sintéticos, nunca lanzar app.moderno.app.
if (Test-Path $profile) { throw 'Expected an isolated, empty CI profile' }
New-Item $profile -ItemType Directory -Force | Out-Null
$sentinel = Join-Path $profile 'synthetic-preservation-test.txt'
Set-Content $sentinel 'synthetic-data-only'
foreach ($attempt in 1..2) {
    $process = Start-Process $Installer -ArgumentList @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', "/DIR=`"$destination`"") -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Install/upgrade failed: $($process.ExitCode)" }
    foreach ($file in @('Moderno.Windows.exe', 'Moderno.Windows.dll', 'Microsoft.Web.WebView2.Core.dll', 'WebView2Loader.dll', 'licenses\DotNet-LICENSE.txt', 'licenses\DotNet-ThirdPartyNotices.txt', 'licenses\WebView2-LICENSE.txt', 'licenses\WebView2-NOTICE.txt')) {
        if (!(Test-Path (Join-Path $destination $file))) { throw "Missing installed dependency: $file" }
    }
    if (!(Test-Path (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Moderno.app Beta.lnk'))) {
        throw 'Start menu shortcut missing'
    }
    if ((Get-Content $sentinel) -ne 'synthetic-data-only') { throw 'Profile was modified' }
}
$uninstaller = Join-Path $destination 'unins000.exe'
$process = Start-Process $uninstaller -ArgumentList @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART') -Wait -PassThru
if ($process.ExitCode -ne 0) { throw 'Uninstall failed' }
if (Test-Path (Join-Path $destination 'Moderno.Windows.exe')) { throw 'Executable remains after uninstall' }
if ((Get-Content $sentinel) -ne 'synthetic-data-only') { throw 'Uninstall deleted local profile' }
Remove-Item $sentinel
Write-Output 'PASS: install, repeat install, shortcut, dependencies, uninstall, local profile preservation. App not launched; no production requests.'
