<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deploy obrigatório
Após **qualquer** alteração (UI, schema, API, componentes):
1. `npx next build` — verificar se compila sem erros
2. `npx prisma migrate dev --name <desc>` + `npx prisma migrate deploy` — se houver mudança no schema
3. `npx vercel --prod` — deploy no Vercel
4. Informar ao usuário que o deploy foi concluído
