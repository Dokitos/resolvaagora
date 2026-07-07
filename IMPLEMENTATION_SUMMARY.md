# ResolvaAgora — Resumo de Implementação

Plataforma de serviços técnicos ao domicílio (estilo Worten Resolve), com **3 componentes**:

| Componente | Stack | Porta | Papel |
|---|---|---|---|
| `backend` | NestJS + Prisma + PostgreSQL + Redis + RabbitMQ + WebSocket | **3002** | API + tempo real |
| `frontend-web` | Next.js 14 + NextAuth + Tailwind | **3000** | Painel de **administração** |
| `mobile-technician` | Flutter (Riverpod + go_router) | — | App **cliente + técnico + admin** |

## Contas de teste (seed)
| Papel | Email | Password |
|---|---|---|
| Admin | `admin@resolvaagora.pt` | `Admin@1234` |
| Técnico | `tecnico@resolvaagora.pt` | `Tecnico@1234` |
| Cliente | `cliente@exemplo.pt` | `Cliente@1234` |

---

## O que foi construído (por fase)

### App do cliente (base)
Lado do cliente na app Flutter: home (catálogo de serviços), fluxo de reserva completo (categoria → itens → detalhes/fotos → localização → agendamento → contacto → SMS → morada → resumo → pagamento → confirmação), **conta** (editar perfil, moradas, os meus pedidos + detalhe, notificações, ajuda/suporte, termos). Ligado ao backend real (`/clients/me`, `/clients/me/addresses`, `/service-requests`, `/notifications`). Pagamento alinhado aos prints (MB Way/Visa/Multibanco, código promocional, NIF, política de cancelamento). Marca: vermelho `#CC0000` + azul `#1A56DB`.

### Fase 1 — Operações no Admin
- **Backend**: moderação de pedidos (`PATCH` editar, `POST /cancel`, `DELETE`), chat de suporte (`SupportMessage`, endpoints admin + cliente, emissão por WebSocket), notificação de **novos pedidos em tempo real** para admins (consumer RabbitMQ → gateway).
- **Web admin**: re-skin ResolvaAgora; **sino de notificações** em tempo real (socket.io); página **Clientes & Suporte** (chat); detalhe do pedido com **Valores**, **moderação**, **contacto** (tel/WhatsApp/email), **chat** e **fotos** (cliente+prova) com lightbox.
- **App cliente**: ecrã **Chat de suporte** (polling).

### Fase 2 — Entry-flow
- Home **pública** (catálogo sem login); botão **Entrar** no topo; só ao **fazer um pedido** se exige sessão (com retorno `?from=`).
- **Ecrã de registo** novo (auto-login); login re-marcado; redirect por papel (cliente/técnico/admin).
- Fix do **ecrã preto no logout** (router estável + navegação explícita).

### Fase 3 — Subscrições (receita)
- Ecrã de subscrição com **vantagens em destaque** (desconto na deslocação, visitas grátis, prioridade), subscrever/cancelar, estado ativo. Banner na home + tile na conta.
- Backend: `StripeService` em **modo stub** quando a chave é placeholder (paga simulado em dev).

### Fase 4 — Promo / Cupões / Referências
- Modelos `PromoCode` + `Referral` + `Client.referralCode`.
- Cliente: **validar código promocional** no pagamento (desconto no total); ecrã **"Convida amigos"** (código + partilha WhatsApp); campo de referência no registo.
- Admin: página **Promoções** (CRUD de códigos + lista de referências).

### Fase 5 — Admin dentro da app
- Secção admin na app Flutter (separadores **Resumo / Pedidos / Clientes / Mais**): dashboard, lista+detalhe de pedidos (atribuir técnico, moderar, valores, fotos, contacto, **chat**), clientes + chat, financeiro/analytics/técnicos. Encaminhamento por papel: admin → `/admin/home`.

### Fase 6 — Gestão da app / Manutenção / Notificações
- Modelo `AppSetting` (modo manutenção, registo on/off, pagamentos on/off, modo teste) + `GET /settings/public`.
- **Enforcement**: registo bloqueado quando desativado; pedidos bloqueados em manutenção.
- **Notificações personalizadas** do admin (broadcast a clientes/técnicos → ecrã de notificações + tempo real).
- **Gestão de contas**: bloquear/desbloquear (login rejeita suspensos) + eliminar.
- App: **banner de manutenção** na home; **"Criar conta" escondido** quando registo desativado.
- Web admin: página **Definições** (flags + compositor de notificações) + ações de bloquear/eliminar nos Clientes.

---

## Ronda de Segurança + Polimento + Funcionalidades (jul/2026)

### Segurança (auditoria + correções, testadas dinamicamente)
- **Rate-limiting** agora aplicado globalmente (`ThrottlerGuard` em [app.module.ts](backend/src/app.module.ts)) + `@Throttle` apertado (5/min) em `login`/`register`/`forgot-password`/`reset-password` e `promo/validate`. Verificado: 6 logins seguidos → **429**.
- **Código promocional real**: novo [PromoService](backend/src/modules/promotions/application/promo.service.ts) — o desconto é agora aplicado à `displacementFee` na criação do pedido e o `usedCount` é incrementado **atomicamente** (impede reutilização acima do `maxUses`). Campos `promoCode`/`promoDiscount` no `ServiceRequest`. Verificado: 25€→15€, esgota ao 3º uso.
- **Upload de fotos validado** ([upload-photos.dto.ts](backend/src/modules/service-requests/application/dto/upload-photos.dto.ts)): só `http(s)` ou data-URI de imagem, máx. 10, com teto de tamanho. URLs `javascript:` → **400**.
- **JWT de acesso** reposto a **15m** (a app renova via refresh no 401); `.gitignore` na raiz a proteger `.env`/segredos.
- **WebSocket CORS** restrito às origens conhecidas (era `*`).
- Confirmado já-sólido: bcrypt(12), guards de papel, IDOR protegido, montantes calculados no servidor, revogação de refresh via Redis, bloqueio de conta imediato.
- Flag `smsVerificationEnabled` em `AppSetting` (deixa o OTP/SMS pronto para ativar em produção).

### Polimento visual
- **App (Flutter)**: home com **hero em gradiente vermelho** + saudação personalizada + pesquisa flutuante; **cartões de categoria coloridos por ofício** ([AppTheme.categoryColors](mobile-technician/lib/core/theme/app_theme.dart)); feedback de toque ([Pressable](mobile-technician/lib/core/widgets/pressable.dart)); **shimmer** de carregamento e **estados vazios ilustrados**; **timeline de estado** refinada no detalhe. Sem novas dependências.
- **Admin web**: **gráficos** no dashboard ([dashboard-charts.tsx](frontend-web/src/components/charts/dashboard-charts.tsx)) — donut de pedidos por estado + barras por especialidade (recharts).

### Novas funcionalidades
- **Recuperar palavra-passe**: `POST /auth/forgot-password` + `/auth/reset-password` (código de 6 dígitos no Redis, 15 min; em dev devolve `devCode`), ecrã [forgot_password_screen.dart](mobile-technician/lib/features/auth/forgot_password_screen.dart) + link no login. Testado ponta-a-ponta.
- **Avaliações**: `POST /service-requests/:id/review` com [DTO validado](backend/src/modules/service-requests/application/dto/create-review.dto.ts) (1–5); ecrã de estrelas + comentário no detalhe; média já visível no admin.
- **Chat em tempo real**: [RealtimeConnection](mobile-technician/lib/core/services/realtime_service.dart) (`socket_io_client`) ouve `support-message` no gateway `/notifications`; aplicado ao chat do cliente e do admin, com polling a 15s como fallback.
- **Recibos por email**: `POST /service-requests/:id/receipt/email` gera recibo HTML (serviço, valores, desconto, NIF, técnico) e envia via `EmailService`; botão no detalhe. Testado.

---

## Como correr localmente

```bash
# 1. Infra
docker compose up -d postgres redis rabbitmq

# 2. Backend (porta 3002)
cd backend
npx prisma db push        # sincroniza o schema (dev)
npx prisma db seed        # contas de teste
npm run start:dev

# 3. Web admin (porta 3000)
cd frontend-web
npm run dev               # .env.local já aponta para :3002

# 4. App mobile
cd mobile-technician
flutter run -d chrome --web-port=8085                                  # web (teste rápido)
flutter run -d <emulador> --dart-define=API_URL=http://10.0.2.2:3002/api/v1   # emulador Android
flutter run -d <telemovel> --dart-define=API_URL=http://<IP_DA_REDE>:3002/api/v1  # telemóvel real
```

> **Notas**: o `API_URL` por omissão é `http://localhost:3002/api/v1`. No **emulador** usa-se `10.0.2.2` (host visto pelo emulador). No **telemóvel real** usa-se o IP da máquina na Wi-Fi e é preciso abrir a porta 3002 no firewall. O cleartext HTTP já está permitido no manifest de **debug**.
> Em produção: `STRIPE_SECRET_KEY` real ativa pagamentos reais; credenciais Firebase ativam push do SO (hoje as notificações são in-app via WebSocket).
