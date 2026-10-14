@echo off
chcp 65001 >nul
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0prepare-site.ps1" -Page "/products/contour-01/"
if errorlevel 1 pause
