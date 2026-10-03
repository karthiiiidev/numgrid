# NumGrid — start the FastAPI backend
# Run from the project root: .\start-backend.ps1

$BackendDir = Join-Path $PSScriptRoot "backend"
Set-Location $BackendDir

# Create virtual environment if missing
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create venv. Make sure Python 3.10+ is installed."
        exit 1
    }
}

# Activate
. .\venv\Scripts\Activate.ps1

# Install / upgrade dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt --quiet --upgrade

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  NumGrid API  →  http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "  Swagger docs →  http://127.0.0.1:8000/docs" -ForegroundColor DarkGray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

uvicorn main:app --reload --host 127.0.0.1 --port 8000
