# ResolvaAgora - App do Técnico

Flutter app para técnicos da plataforma ResolvaAgora.

## Setup

### Pré-requisitos
- Flutter SDK 3.x
- Android Studio / Xcode
- Conta Firebase (para FCM)

### Configuração

1. **Firebase**: Coloque o ficheiro `google-services.json` em `android/app/` e `GoogleService-Info.plist` em `ios/Runner/`

2. **Dependências**:
```bash
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

3. **URL da API** (opcional, por defeito aponta para `10.0.2.2:3001` — emulador Android):
```bash
flutter run --dart-define=API_URL=http://SEU_IP:3001/api/v1
```

## Estrutura

```
lib/
├── core/
│   ├── models/          # ServiceRequest, Earning, etc.
│   ├── network/         # Dio + interceptors JWT
│   ├── router/          # GoRouter com auth guard
│   ├── services/        # AuthService, TechnicianService
│   ├── theme/           # AppTheme
│   └── utils/           # Formatters, labels
├── features/
│   ├── auth/            # Login
│   ├── schedule/        # Lista de serviços atribuídos
│   ├── job/             # Detalhe + orçamento + fotos
│   ├── earnings/        # Histórico de ganhos
│   ├── profile/         # Perfil e settings
│   └── shell/           # Bottom nav shell
└── main.dart
```

## Fluxo do Técnico

1. Login → Agenda (serviços atribuídos)
2. Tap no serviço → Ver detalhes + endereço
3. "Iniciar Deslocação" → "Cheguei ao Local" → "Iniciar Diagnóstico"
4. "Enviar Orçamento" → Preencher valores → Cliente aprova/rejeita em 48h
5. "Iniciar Execução" → Tirar fotos (mínimo 2) → "Marcar Concluído"
6. Ganhos aparecem em "Ganhos" (deslocação + serviço com 15% comissão)
