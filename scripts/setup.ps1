param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== Receita Justa - Setup ===" -ForegroundColor Cyan

# Check Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
  Write-Host "Node.js não encontrado. Instale Node.js 20+ em https://nodejs.org" -ForegroundColor Red
  exit 1
}
Write-Host "Node.js: $nodeVersion" -ForegroundColor Green

# Check .env
$envFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envFile)) {
  Write-Host "Criando .env a partir de .env.example..." -ForegroundColor Yellow
  Copy-Item (Join-Path $ProjectRoot ".env.example") -Destination $envFile
  Write-Host ".env criado. Edite com suas credenciais antes de continuar." -ForegroundColor Yellow
  if (-not $Force) {
    Read-Host "Pressione Enter após editar o .env"
  }
}

# Install dependencies
Write-Host "Instalando dependências..." -ForegroundColor Cyan
& npm install
if ($LASTEXITCODE -ne 0) {
  Write-Host "Falha ao instalar dependências" -ForegroundColor Red
  exit 1
}

# Generate Prisma client
Write-Host "Gerando Prisma Client..." -ForegroundColor Cyan
& npx prisma generate
if ($LASTEXITCODE -ne 0) {
  Write-Host "Falha ao gerar Prisma Client" -ForegroundColor Red
  exit 1
}

# Run migrations
Write-Host "Executando migrations..." -ForegroundColor Cyan
& npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
  Write-Host "Falha ao executar migrations. Verifique DATABASE_URL no .env" -ForegroundColor Red
  exit 1
}

# Seed
Write-Host "Populando banco (seed)..." -ForegroundColor Cyan
& npx tsx prisma/seed.ts
if ($LASTEXITCODE -ne 0) {
  Write-Host "Falha ao executar seed" -ForegroundColor Red
  exit 1
}

Write-Host "`n=== Setup concluído com sucesso! ===" -ForegroundColor Green
Write-Host "Execute 'npm run dev' para iniciar o servidor." -ForegroundColor Cyan
Write-Host "Admin padrão: admin@receita.com / admin123" -ForegroundColor Yellow
