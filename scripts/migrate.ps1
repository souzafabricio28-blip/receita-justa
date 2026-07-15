param(
  [ValidateSet("dev","deploy","reset")][string]$Action = "dev"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

switch ($Action) {
  "dev" {
    Write-Host "=== Criando nova migration... ===" -ForegroundColor Cyan
    $name = Read-Host "Nome da migration"
    & npx prisma migrate dev --name $name
  }
  "deploy" {
    Write-Host "=== Aplicando migrations pendentes... ===" -ForegroundColor Cyan
    & npx prisma migrate deploy
  }
  "reset" {
    Write-Host "=== Resetando banco de dados (PERDA TOTAL DE DADOS)... ===" -ForegroundColor Red
    $confirm = Read-Host "Tem certeza? Digite 'resetar' para confirmar"
    if ($confirm -eq "resetar") {
      & npx prisma migrate reset --force
      & npx tsx prisma/seed.ts
      Write-Host "Banco resetado e populado com seed." -ForegroundColor Green
    } else {
      Write-Host "Cancelado." -ForegroundColor Yellow
    }
  }
}
