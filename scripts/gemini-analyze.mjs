import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const root = 'C:\\Users\\souza\\receita-justa';
const out = join(root, 'gemini-contexto.md');

const lines = [];

lines.push('# Receita Justa — Contexto para Análise Gemini');
lines.push('');
lines.push('## Stack');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const deps = pkg.dependencies;
lines.push(`- **Next.js:** ${deps.next}`);
lines.push(`- **React:** ${deps.react}`);
lines.push(`- **Prisma:** ${deps['@prisma/client']}`);
lines.push(`- **Banco:** PostgreSQL (Neon)`);
lines.push(`- **Auth:** NextAuth v5 beta`);
lines.push(`- **AI:** Groq (llama3-70b)`);
lines.push(`- **Pagamento:** Mercado Pago`);
lines.push(`- **Deploy:** https://receita-justa.vercel.app`);
lines.push('');

// Schema
lines.push('---');
lines.push('## Schema Prisma');
lines.push('```prisma');
lines.push(readFileSync(join(root, 'prisma', 'schema.prisma'), 'utf-8').trim());
lines.push('```');
lines.push('');

// .env sanitized
lines.push('---');
lines.push('## .env');
lines.push('```');
const envContent = readFileSync(join(root, '.env'), 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^(DATABASE_URL|NEXTAUTH_SECRET|OPENAI_API_KEY|GROQ_API_KEY|MERCADO_PAGO_ACCESS_TOKEN|MERCADO_PAGO_WEBHOOK_SECRET)=/);
  if (match) {
    lines.push(`${match[1]}="***"`);
  } else {
    lines.push(line);
  }
});
lines.push('```');
lines.push('');

// Helper to collect files recursively
function collectFiles(dir, filter) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...collectFiles(full, filter));
      } else if (entry.isFile() && entry.name.match(filter)) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

// API routes
lines.push('---');
lines.push('## Rotas da API');
const apiRoutes = collectFiles(join(root, 'src', 'app', 'api'), /^route\.ts$/);
for (const route of apiRoutes) {
  const rel = relative(join(root, 'src', 'app', 'api'), route).replace(/\\/g, '/').replace(/\/route\.ts$/, '');
  lines.push('');
  lines.push(`### /api/${rel}`);
  lines.push('```typescript');
  lines.push(readFileSync(route, 'utf-8').trim());
  lines.push('```');
}
lines.push('');

// Services
lines.push('---');
lines.push('## Serviços (lib/services)');
for (const file of collectFiles(join(root, 'src', 'lib', 'services'), /\.ts$/)) {
  lines.push('');
  lines.push(`### ${relative(join(root, 'src', 'lib', 'services'), file)}`);
  lines.push('```typescript');
  lines.push(readFileSync(file, 'utf-8').trim());
  lines.push('```');
}
lines.push('');

// Hooks
lines.push('---');
lines.push('## Hooks (lib/hooks)');
for (const file of collectFiles(join(root, 'src', 'lib', 'hooks'), /\.ts$/)) {
  lines.push('');
  lines.push(`### ${relative(join(root, 'src', 'lib', 'hooks'), file)}`);
  lines.push('```typescript');
  lines.push(readFileSync(file, 'utf-8').trim());
  lines.push('```');
}
lines.push('');

// Components
lines.push('---');
lines.push('## Componentes');
for (const file of collectFiles(join(root, 'src', 'components'), /\.tsx$/)) {
  const rel = relative(join(root, 'src', 'components'), file).replace(/\\/g, '/');
  lines.push('');
  lines.push(`### ${rel}`);
  lines.push('```tsx');
  lines.push(readFileSync(file, 'utf-8').trim());
  lines.push('```');
}
lines.push('');

// Dashboard pages
lines.push('---');
lines.push('## Páginas Dashboard');
for (const file of collectFiles(join(root, 'src', 'app', 'dashboard'), /^page\.tsx$/)) {
  const rel = relative(join(root, 'src', 'app', 'dashboard'), file).replace(/\\/g, '/').replace(/\/page\.tsx$/, '');
  lines.push('');
  lines.push(`### /dashboard${rel ? '/' + rel : ''}`);
  lines.push('```tsx');
  lines.push(readFileSync(file, 'utf-8').trim());
  lines.push('```');
}
lines.push('');

// Config files
lines.push('---');
lines.push('## Configurações');
for (const name of ['plans', 'plan-check', 'use-plan', 'errors', 'prices']) {
  const file = join(root, 'src', 'lib', `${name}.ts`);
  try {
    lines.push('');
    lines.push(`### ${name}.ts`);
    lines.push('```typescript');
    lines.push(readFileSync(file, 'utf-8').trim());
    lines.push('```');
  } catch {}
}
lines.push('');

// CSS
lines.push('---');
lines.push('## CSS Global');
lines.push('```css');
lines.push(readFileSync(join(root, 'src', 'app', 'globals.css'), 'utf-8').trim());
lines.push('```');
lines.push('');

// Also include prices.ts and conversions
lines.push('---');
lines.push('## Utilitários');
for (const name of ['prices.ts', 'conversions.ts', 'rate-limit.ts']) {
  const file = join(root, 'src', 'lib', name);
  try {
    lines.push('');
    lines.push(`### ${name}`);
    lines.push('```typescript');
    lines.push(readFileSync(file, 'utf-8').trim());
    lines.push('```');
  } catch {}
}

writeFileSync(out, lines.join('\n'), 'utf-8');
console.log(`Contexto gerado: ${out}`);
