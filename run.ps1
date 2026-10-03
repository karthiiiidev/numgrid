# NumGrid — single-command launcher
# Run from project root: .\run.ps1

Set-Location "$PSScriptRoot"

if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create venv. Ensure Python 3.10+ is installed."
        exit 1
    }
}

. .\venv\Scripts\Activate.ps1

Write-Host "Installing dependencies..." -ForegroundColor Cyan
pip install fastapi "uvicorn[standard]" pydantic --quiet --upgrade

Write-Host ""
Write-Host ("━" * 42) -ForegroundColor DarkGray
Write-Host "  NumGrid   ->  http://localhost:8000" -ForegroundColor Green
Write-Host "  API docs  ->  http://localhost:8000/docs" -ForegroundColor DarkGray
Write-Host ("━" * 42) -ForegroundColor DarkGray
Write-Host ""

python numgrid.py
