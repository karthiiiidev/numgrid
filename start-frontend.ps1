# NumGrid — start the React/Vite frontend
# Run from the project root: .\start-frontend.ps1

$FrontendDir = Join-Path $PSScriptRoot "frontend"
Set-Location $FrontendDir

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  NumGrid App  →  http://localhost:5173" -ForegroundColor Green
Write-Host "  (requires backend on port 8000)"       -ForegroundColor DarkGray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

npm run dev
