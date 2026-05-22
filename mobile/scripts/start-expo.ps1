$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$bundledNode = "C:\Users\gabri\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$expoCli = Join-Path $projectRoot "node_modules\expo\bin\cli"

Set-Location $projectRoot

if (Test-Path $bundledNode) {
  & $bundledNode $expoCli start --lan --clear
} else {
  npx expo start --lan --clear
}
