# Metiscore Health Monorepo Setup Script
# Configures the unified development environment with shared dependencies

Write-Host "🚀 Setting up Metiscore Health Monorepo..." -ForegroundColor Green

# Check for pnpm
if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Installing pnpm globally..." -ForegroundColor Yellow
    npm install -g pnpm
}

# Clean workspace
Write-Host "Cleaning workspace..." -ForegroundColor Yellow
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "apps/*/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "shared/*/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "apps/*/package-lock.json" -Force -ErrorAction SilentlyContinue

# Install all dependencies from root (monorepo style)
Write-Host "Installing shared dependencies..." -ForegroundColor Yellow
pnpm install

# Verify workspace setup
Write-Host "Verifying workspace configuration..." -ForegroundColor Yellow
pnpm list --depth=0

# Check environment files
Write-Host "Checking environment configuration..." -ForegroundColor Yellow

if (Test-Path "apps/meno-wellness/.env.local") {
    Write-Host "✓ Meno-wellness environment file already configured" -ForegroundColor Green
} else {
    Copy-Item "apps/meno-wellness/.env.local.example" "apps/meno-wellness/.env.local"
    Write-Host "✓ Created meno-wellness environment file from template" -ForegroundColor Green
}

if (Test-Path "apps/partner-support/.env.local") {
    Write-Host "✓ Partner-support environment file already configured" -ForegroundColor Green
} else {
    Copy-Item "apps/partner-support/.env.local.example" "apps/partner-support/.env.local"
    Write-Host "✓ Created partner-support environment file from template" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Monorepo setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update .env.local files with your Firebase configuration"
Write-Host "2. Run unified development command"
Write-Host ""
Write-Host "🛠️  Development Commands:" -ForegroundColor Cyan
Write-Host "  pnpm dev           - Start both apps with unified logging"
Write-Host "  pnpm dev:meno      - Start wellness app only (port 3000)"
Write-Host "  pnpm dev:partner   - Start partner app only (port 3001)"
Write-Host ""
Write-Host "🔧 Build Commands:" -ForegroundColor Cyan
Write-Host "  pnpm build         - Build all apps"
Write-Host "  pnpm lint          - Lint all apps"
Write-Host "  pnpm typecheck     - Type check all packages"
Write-Host ""
Write-Host "🧹 Maintenance:" -ForegroundColor Cyan
Write-Host "  pnpm clean         - Clean all build artifacts"
Write-Host ""
Write-Host "📁 Monorepo Structure:" -ForegroundColor Magenta
Write-Host "  apps/meno-wellness/     - Primary wellness app"
Write-Host "  apps/partner-support/   - Partner dashboard app"
Write-Host "  shared/types/           - Shared TypeScript types"
Write-Host "  shared/ui/              - Shared React components"
Write-Host ""
Write-Host "🔗 All dependencies are shared at the root level for efficiency!"