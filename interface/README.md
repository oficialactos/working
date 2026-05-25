# Working Interface Expo

Aplicativo Expo/React Native para testar a plataforma Working no Expo Go.

## Rodar no Expo Go

```bash
cd interface
npm install
npx expo start
```

Crie um arquivo `.env` com:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Depois escaneie o QR Code com o Expo Go.

## Escopo inicial

- Autenticação com Supabase.
- Cadastro cliente/prestador.
- Dashboard cliente.
- Dashboard prestador.
- Lista de pedidos.
- Chat e perfil em versão inicial.

Pagamentos, push notifications, câmera e mapa nativo completo devem ser evoluídos em etapas separadas.
