# Usa el Git instalado y corrige la distribución incluida con Codex si hace falta.
$gitExe = (Get-Command git -ErrorAction Stop).Source
$gitRoot = Split-Path (Split-Path $gitExe -Parent) -Parent
$helperDir = Join-Path $gitRoot 'mingw64\bin'
if (Test-Path (Join-Path $helperDir 'git-remote-https.exe')) {
    & $gitExe "--exec-path=$helperDir" @args
} else {
    & $gitExe @args
}
exit $LASTEXITCODE
