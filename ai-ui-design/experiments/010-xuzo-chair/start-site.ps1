param(
  [string]$Page = '/',
  [ValidateRange(0,65535)][int]$Port = 0,
  [switch]$NoBrowser,
  [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
try {
  $projectRoot = $PSScriptRoot
  $config = Get-Content -LiteralPath (Join-Path $projectRoot 'preview.config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  Write-Host "`n$($config.title) - 启动检查" -ForegroundColor Cyan
  foreach ($relative in @('preview.mjs','dist/index.html') + @($config.required)) {
    if (!(Test-Path -LiteralPath (Join-Path $projectRoot $relative))) {
      throw "缺少文件：$relative。请完整解压部署包，勿在压缩包内直接运行。"
    }
  }
  $bundled = Join-Path $projectRoot 'runtime/node.exe'
  $candidates = @()
  if (Test-Path -LiteralPath $bundled) {
    $expected = (Get-Content -LiteralPath (Join-Path $projectRoot 'runtime/node.sha256') -Raw).Trim()
    if ((Get-FileHash -LiteralPath $bundled -Algorithm SHA256).Hash -ne $expected) {
      throw '便携 Node.js 校验失败，文件可能复制不完整。请重新复制 runtime 目录。'
    }
    $candidates += $bundled
  }
  $systemNode = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue
  if ($systemNode) { $candidates += $systemNode.Source }
  $runtime = $null
  foreach ($candidate in $candidates | Select-Object -Unique) {
    try {
      $version = & $candidate --version 2>$null
      if ($LASTEXITCODE -eq 0 -and $version -match '^v(\d+)\.' -and [int]$Matches[1] -ge 18) {
        $runtime = $candidate; break
      }
    } catch { }
  }
  if (!$runtime) {
    throw '没有可用的 Node.js 18+。本部署包的 runtime 适用于 Windows 10/11 x64；请重新复制 runtime 目录，或从 https://nodejs.org/ 安装适合此电脑的 Node.js 后重试。'
  }
  Write-Host "运行环境：$version"
  Write-Host "运行程序：$runtime"
  Write-Host '页面文件检查通过。无需 npm install，无需 Blender。' -ForegroundColor Green
  if ($CheckOnly) { exit 0 }
  $serverArgs = @((Join-Path $projectRoot 'preview.mjs'))
  if ($Port -gt 0) { $serverArgs += @('--port', [string]$Port) }
  if (!$NoBrowser) { $serverArgs += @('--open', $Page) }
  Write-Host '页面启动后请保留此窗口；按 Ctrl+C 停止。'
  & $runtime @serverArgs
  if ($LASTEXITCODE -ne 0) { throw "启动失败，退出码：$LASTEXITCODE。请查看上方提示。" }
} catch {
  Write-Host "`n启动失败：$($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
