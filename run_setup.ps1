$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "Setting up root..."
npm.cmd install

Write-Host "Setting up backend..."
cd backend
npm.cmd install
npx.cmd prisma migrate dev --name init
node prisma/seed.js
cd ..

Write-Host "Setting up frontend..."
cd frontend
npm.cmd install
cd ..

Write-Host "Setting up engine..."
cd engine
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..

Write-Host "Setup Complete!"
