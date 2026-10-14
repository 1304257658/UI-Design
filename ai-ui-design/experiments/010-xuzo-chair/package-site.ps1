$ErrorActionPreference = 'Stop'
try {
  $config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'preview.config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'start-site.ps1') -CheckOnly
  if ($LASTEXITCODE -ne 0) { throw '环境或页面检查失败，未生成部署包。' }
  if (!(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'runtime/node.exe'))) { throw '离线部署包必须包含 runtime/node.exe。' }
  $output = Join-Path $PSScriptRoot '部署包'
  New-Item -ItemType Directory -Path $output -Force | Out-Null
  $archive = Join-Path $output ($config.id + '-windows-x64.zip')
  $items = @('dist','runtime','preview.mjs','preview.config.json','start-site.ps1','部署说明.md') | ForEach-Object { Join-Path $PSScriptRoot $_ }
  $items += @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.cmd' | Where-Object { $_.Name -ne '打包部署.cmd' } | ForEach-Object { $_.FullName })
  Compress-Archive -LiteralPath $items -DestinationPath $archive -CompressionLevel Optimal -Force
  Write-Host "`n部署包已生成：$archive" -ForegroundColor Green
  Write-Host '复制 ZIP 到另一台电脑，完整解压后双击启动脚本即可。'
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
