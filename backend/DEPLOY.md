# Deploy do backend ResolvaAgora — Railway

Guia para pôr a API online em `https://api.resolvaagora.pt`. A app publicada **precisa** disto para funcionar.

## Pré-requisitos
- Conta em [railway.app](https://railway.app) (login com GitHub).
- Conta em [cloudamqp.com](https://cloudamqp.com) (RabbitMQ gratuito — plano *Little Lemur*).
- Código deste `backend/` num repositório Git (GitHub) — o Railway faz deploy a partir daí.

## Passo 1 — Criar o projeto no Railway
1. **New Project → Deploy from GitHub repo** → escolher o repositório.
2. Em *Settings → Root Directory*, indicar `backend` (a API está nesta subpasta).
3. O Railway deteta o `Dockerfile` e usa-o automaticamente.

## Passo 2 — Adicionar base de dados e Redis
1. No projeto: **New → Database → PostgreSQL** (cria a variável `DATABASE_URL`).
2. **New → Database → Redis** (expõe `REDISHOST`, `REDISPORT`, `REDISPASSWORD`).

## Passo 3 — RabbitMQ (CloudAMQP)
1. Criar uma instância gratuita em CloudAMQP → copiar o **AMQP URL** (`amqps://...`).
2. Vai ser a variável `RABBITMQ_URL`.

## Passo 4 — Definir as variáveis de ambiente
No serviço da API (*Variables*), colar os valores de [`.env.production.example`](.env.production.example).
Pontos-chave:
- `DATABASE_URL` → `${{Postgres.DATABASE_URL}}`
- `REDIS_HOST/PORT/PASSWORD` → `${{Redis.REDISHOST}}` etc.
- `RABBITMQ_URL` → o URL do CloudAMQP
- `JWT_SECRET` / `JWT_REFRESH_SECRET` → já gerados no `.env.production.example`
- `STRIPE_*` → chaves **live** do Stripe (quando pronto para cobrar a sério)
- `NODE_ENV=production`

## Passo 5 — Criar as tabelas e o admin
Após o primeiro deploy, num shell do Railway (ou como comando pós-deploy):
```bash
npx prisma db push    # cria todas as tabelas/colunas a partir do schema
npx prisma db seed    # cria admin@resolvaagora.pt / Admin@1234
```
> Usamos `db push` (aplica o `schema.prisma` completo à BD nova — fiável para o
> arranque). Migrações formais podem ser adotadas mais tarde.
> **Trocar a password do admin** após o primeiro acesso.

## Passo 6 — Domínio personalizado
1. Em *Settings → Networking → Custom Domain*, adicionar `api.resolvaagora.pt`.
2. No teu registador de DNS, criar o registo **CNAME** que o Railway indicar.
3. O HTTPS é emitido automaticamente. A app já aponta para `https://api.resolvaagora.pt/api/v1`.

## Passo 7 — Painel de administração (opcional)
O painel web (`frontend-web/`, Next.js) pode ir para a **Vercel**:
- Importar o repositório, *Root Directory* = `frontend-web`.
- Variável `NEXT_PUBLIC_API_URL=https://api.resolvaagora.pt/api/v1`.
- Domínio `admin.resolvaagora.pt`.

## Verificação
```bash
curl https://api.resolvaagora.pt/api/v1/settings/public   # deve devolver 200 + JSON
```
Depois, iniciar sessão na app (build de produção) com `admin@resolvaagora.pt`.

## Notas
- **Webhook do Stripe:** em produção, configurar o endpoint `https://api.resolvaagora.pt/api/v1/webhooks/stripe` no dashboard do Stripe e colar o `STRIPE_WEBHOOK_SECRET`.
- **Custo aproximado:** Railway (~€5–20/mês conforme uso) + CloudAMQP grátis. Redis/Postgres do Railway incluídos no uso.
