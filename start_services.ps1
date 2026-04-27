$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "Starting Mortgage IDP Workbench Services..."

# Start Backend
Start-Process "cmd.exe" -ArgumentList "/c `"title Mortgage IDP - Backend && cd backend && npm.cmd run dev`""

# Start Frontend
Start-Process "cmd.exe" -ArgumentList "/c `"title Mortgage IDP - Frontend && cd frontend && npm.cmd run dev`""

# Start Engine
Start-Process "cmd.exe" -ArgumentList "/c `"title Mortgage IDP - Engine && cd engine && .\venv\Scripts\activate.bat 2>nul || .\.venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000`""

Write-Host "All services started in new windows!"
