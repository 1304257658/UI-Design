param([string]$Page='/', [int]$Port=0, [switch]$NoBrowser, [switch]$CheckOnly)
$ErrorActionPreference='Stop'
try {
  if (!(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist/index.html'))) {
    if ($CheckOnly) { throw '尚未构建。请先运行启动脚本，或 npm ci 后 npm run build。' }
    $nodeCommand=Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue
    $npmCommand=Get-Command npm.cmd -CommandType Application -ErrorAction SilentlyContinue
    if (!$nodeCommand -or !$npmCommand) { throw '首次构建需要 Node.js 24 LTS（含 npm）。请从 https://nodejs.org/ 安装后重新运行；本仓库不附带运行环境。' }
    & $nodeCommand.Source -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit((a===20&&b>=19)||(a===22&&b>=12)||a>=24?0:1)"
    if ($LASTEXITCODE -ne 0) { throw 'Node.js 版本不满足构建要求，请安装 Node.js 24 LTS。' }
    Push-Location $PSScriptRoot
    try {
      Write-Host '首次运行：根据锁文件安装依赖并构建。需要联网访问 npm。'
      & $npmCommand.Source ci --no-audit --no-fund
      if ($LASTEXITCODE -ne 0) { throw '依赖安装失败，请检查网络后重试。' }
      & $npmCommand.Source run build
      if ($LASTEXITCODE -ne 0) { throw '构建失败，请检查上方错误。' }
    } finally { Pop-Location }
  }
  $launchArgs=@('-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $PSScriptRoot 'start-site.ps1'),'-Page',$Page,'-Port',[string]$Port)
  if ($NoBrowser) { $launchArgs+='-NoBrowser' }; if ($CheckOnly) { $launchArgs+='-CheckOnly' }
  & powershell.exe @launchArgs
  if ($LASTEXITCODE -ne 0) { throw '预览未成功启动。' }
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
