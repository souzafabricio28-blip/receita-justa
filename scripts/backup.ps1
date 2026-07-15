param(
  [string]$OutputDir = (Join-Path $env:USERPROFILE "Documents\receita-justa-backups")
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $OutputDir "backup_$timestamp"

# Create backup directory
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

Write-Host "=== Backup Receita Justa ===" -ForegroundColor Cyan
Write-Host "Destino: $backupDir" -ForegroundColor Cyan

# Backup .env
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
  Copy-Item $envFile -Destination (Join-Path $backupDir ".env.backup")
  Write-Host "  ✓ .env" -ForegroundColor Green
}

# Export Prisma schema
$schemaFile = Join-Path $PSScriptRoot "..\prisma\schema.prisma"
if (Test-Path $schemaFile) {
  Copy-Item $schemaFile -Destination (Join-Path $backupDir "schema.prisma.backup")
  Write-Host "  ✓ schema.prisma" -ForegroundColor Green
}

# Try database backup via pg_dump
$pgDump = Get-Command "pg_dump" -ErrorAction SilentlyContinue
if ($pgDump) {
  $envContent = Get-Content $envFile -Raw
  if ($envContent -match 'DATABASE_URL="([^"]+)"') {
    $dbUrl = $matches[1]
    $outputFile = Join-Path $backupDir "database.sql"
    Write-Host "Exportando banco via pg_dump..." -ForegroundColor Yellow
    & pg_dump $dbUrl --clean --if-exists --no-owner -f $outputFile 2>$null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "  ✓ banco PostgreSQL" -ForegroundColor Green
    } else {
      Write-Host "  ✗ falha no pg_dump (continue manualmente)" -ForegroundColor Red
    }
  }
} else {
  Write-Host "  - pg_dump não encontrado. Instale PostgreSQL CLI para backup automático." -ForegroundColor Yellow
}

Write-Host "`n=== Backup concluído: $backupDir ===" -ForegroundColor Green
