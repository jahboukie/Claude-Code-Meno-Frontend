# Setup script for Claude Code Meno Frontend
# Run this script to set up the development environment

Write-Host "🚀 Setting up Claude Code Meno Frontend..." -ForegroundColor Green

# Install pnpm if not already installed
if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}

# Clean any existing node_modules
Write-Host "Cleaning existing installations..." -ForegroundColor Yellow
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pnpm install

# Create .env.local files if they don't exist
Write-Host "Setting up environment files..." -ForegroundColor Yellow

if (!(Test-Path "apps/meno-wellness/.env.local")) {
    Copy-Item "apps/meno-wellness/.env.local.example" "apps/meno-wellness/.env.local"
    Write-Host "Created apps/meno-wellness/.env.local - Please update with your Firebase config" -ForegroundColor Cyan
}

if (!(Test-Path "apps/partner-support/.env.local")) {
    Copy-Item "apps/partner-support/.env.local.example" "apps/partner-support/.env.local"
    Write-Host "Created apps/partner-support/.env.local - Please update with your Firebase config" -ForegroundColor Cyan
}

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update .env.local files with your Firebase configuration"
Write-Host "2. Run 'pnpm dev:meno' to start the wellness app"
Write-Host "3. Run 'pnpm dev:partner' to start the partner support app"
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  pnpm dev:meno      - Start meno-wellness app (port 3000)"
Write-Host "  pnpm dev:partner   - Start partner-support app (port 3001)"
Write-Host "  pnpm dev           - Start both apps concurrently"