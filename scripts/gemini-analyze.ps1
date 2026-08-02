$out = "gemini-contexto.md"
$root = "C:\Users\souza\receita-justa"

function Write-File {
    param($Path, $Content)
    Add-Content -Path $Path -Value $Content -Encoding utf8
}

Set-Content -Path "$root\$out" -Value "# Receita Justa — Contexto para Análise Gemini" -Encoding utf8

# Dependências
Add-Content -Path "$root\$out" -Value "`n## Stack" -Encoding utf8
$deps = Get-Content "$root\package.json" | ConvertFrom-Json
Add-Content -Path "$root\$out" -Value "`n**Next.js:** $($deps.dependencies.next)" -Encoding utf8
Add-Content -Path "$root\$out" -Value "**React:** $($deps.dependencies.react)" -Encoding utf8
Add-Content -Path "$root\$out" -Value "**Prisma:** $($deps.dependencies.'@prisma/client')" -Encoding utf8
Add-Content -Path "$root\$out" -Value "**Banco:** PostgreSQL (Neon)" -Encoding utf8
Add-Content -Path "$root\$out" -Value "**Auth:** NextAuth v5" -Encoding utf8
Add-Content -Path "$root\$out" -Value "**AI:** Groq (llama3-70b)" -Encoding utf8
Add-Content -Path "$root\$out" -Value "**Pagamento:** Mercado Pago" -Encoding utf8
Add-Content -Path "$root\$out" -Value "**Deploy:** https://receita-justa.vercel.app" -Encoding utf8

# Schema
Add-Content -Path "$root\$out" -Value "`n---`n## Schema Prisma" -Encoding utf8
Add-Content -Path "$root\$out" -Value "`n\`\`\`prisma" -Encoding utf8
Get-Content "$root\prisma\schema.prisma" -Raw | Add-Content -Path "$root\$out" -Encoding utf8
Add-Content -Path "$root\$out" -Value "\`\`\`" -Encoding utf8

# .env (sanitized)
Add-Content -Path "$root\$out" -Value "`n---`n## .env" -Encoding utf8
Add-Content -Path "$root\$out" -Value "`n\`\`\`" -Encoding utf8
Get-Content "$root\.env" | ForEach-Object {
    if ($_ -match "^(DATABASE_URL|NEXTAUTH_SECRET|OPENAI_API_KEY|GROQ_API_KEY|MERCADO_PAGO_ACCESS_TOKEN|MERCADO_PAGO_WEBHOOK_SECRET)=") {
        ($_ -split '=')[0] + '="***"'
    } else { $_ }
} | Add-Content -Path "$root\$out" -Encoding utf8
Add-Content -Path "$root\$out" -Value "\`\`\`" -Encoding utf8

# Rotas API
Add-Content -Path "$root\$out" -Value "`n---`n## Rotas da API" -Encoding utf8
Get-ChildItem "$root\src\app\api" -Recurse -Filter "route.ts" | ForEach-Object {
    $rel = $_.FullName -replace [regex]::Escape("$root\src\app\api\"), ""
    $rel = $rel -replace "\\route\.ts", ""
    Add-Content -Path "$root\$out" -Value "`n### /api/$rel" -Encoding utf8
    Add-Content -Path "$root\$out" -Value "`n\`\`\`typescript" -Encoding utf8
    Get-Content $_.FullName -Raw | Add-Content -Path "$root\$out" -Encoding utf8
    Add-Content -Path "$root\$out" -Value "\`\`\`" -Encoding utf8
}

# Serviços
Add-Content -Path "$root\$out" -Value "`n---`n## Serviços (lib/services)" -Encoding utf8
Get-ChildItem "$root\src\lib\services" -Filter "*.ts" | ForEach-Object {
    Add-Content -Path "$root\$out" -Value "`n### $($_.Name)" -Encoding utf8
    Add-Content -Path "$root\$out" -Value "`n\`\`\`typescript" -Encoding utf8
    Get-Content $_.FullName -Raw | Add-Content -Path "$root\$out" -Encoding utf8
    Add-Content -Path "$root\$out" -Value "\`\`\`" -Encoding utf8
}

# Hooks
Add-Content -Path "$root\$out" -Value "`n---`n## Hooks (lib/hooks)" -Encoding utf8
Get-ChildItem "$root\src\lib\hooks" -Filter "*.ts" | ForEach-Object {
    Add-Content -Path "$root\$out" -Value "`n### $($_.Name)" -Encoding utf8
    Add-Content -Path "$root\$out" -Value "`n\`\`\`typescript" -Encoding utf8
    Get-Content $_.FullName -Raw | Add-Content -Path "$root\$out" -Encoding utf8
    Add-Content -Path "$root\$out" -Value "\`\`\`" -Encoding utf8
}

# Componentes
Add-Content -Path "$root\$out" -Value "`n---`n## Componentes" -Encoding utf8
Get-ChildItem "$root\src\components" -Recurse -Filter "*.tsx" | ForEach-Object {
    $rel = $_.FullName -replace [regex]::Escape("$root\src\components\"), ""
    Add-Content -Path "$root\$out" -Value "`n### $rel" -Encoding utf8
    Add-Content -Path "$root\$out" -Value "`n\`\`\`tsx" -Encoding utf8
    Get-Content $_.FullName -Raw | Add-Content -Path "$root\$out" -Encoding utf8
    Add-Content -Path "$root\$out" -Value "\`\`\`" -Encoding utf8
}

# Páginas
Add-Content -Path "$root\$out" -Value "`n---`n## Páginas Dashboard" -Encoding utf8
Get-ChildItem "$root\src\app\dashboard" -Recurse -Filter "page.tsx" | ForEach-Object {
    $rel = $_.FullName -replace [regex]::Escape("$root\src\app\dashboard\"), ""
    $rel = $rel -replace "\\page\.tsx", ""
    Add-Content -Path "$root\$out" -Value "`n### /dashboard/$rel" -Encoding utf8
    Add-Content -Path "$root\$out" -Value "`n\`\`\`tsx" -Encoding utf8
    Get-Content $_.FullName -Raw | Add-Content -Path "$root\$out" -Encoding utf8
    Add-Content -Path "$root\$out" -Value "\`\`\`" -Encoding utf8
}

# Config
Add-Content -Path "$root\$out" -Value "`n---`n## Configurações" -Encoding utf8
@("plans", "plan-check", "use-plan", "errors") | ForEach-Object {
    Add-Content -Path "$root\$out" -Value "`n### $_.ts" -Encoding utf8
    Add-Content -Path "$root\$out" -Value "`n\`\`\`typescript" -Encoding utf8
    Get-Content "$root\src\lib\$_.ts" -Raw | Add-Content -Path "$root\$out" -Encoding utf8
    Add-Content -Path "$root\$out" -Value "\`\`\`" -Encoding utf8
}

# CSS
Add-Content -Path "$root\$out" -Value "`n---`n## CSS Global" -Encoding utf8
Add-Content -Path "$root\$out" -Value "`n\`\`\`css" -Encoding utf8
Get-Content "$root\src\app\globals.css" -Raw | Add-Content -Path "$root\$out" -Encoding utf8
Add-Content -Path "$root\$out" -Value "\`\`\`" -Encoding utf8

Write-Host "Contexto gerado: $root\$out" -ForegroundColor Green
