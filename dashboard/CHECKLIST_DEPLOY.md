# ✅ Checklist de Deploy na Vercel

Este checklist garante que tudo está pronto para o deploy na Vercel.

## 📦 Estrutura do Projeto

- [x] ✅ `vercel.json` configurado corretamente
- [x] ✅ Frontend React em `frontend/` 
- [x] ✅ API Serverless Functions em `api/`
- [x] ✅ `package.json` principal com scripts de build
- [x] ✅ `.gitignore` configurado
- [x] ✅ `.env.example` criado

## 🔧 API Routes Criadas

- [x] ✅ `/api/health` - Verificação de saúde do servidor
- [x] ✅ `/api/estado` - Retorna estado do semáforo (com suporte a atualização MQTT)
- [x] ✅ `/api/comando/modo` - Envia comandos para o semáforo via MQTT
- [x] ✅ `/api/mqtt/listen` - Função para escutar MQTT (opcional)

## 🎨 Frontend

- [x] ✅ Detecta automaticamente ambiente (desenvolvimento/produção)
- [x] ✅ Usa WebSocket em desenvolvimento (Socket.IO)
- [x] ✅ Usa polling HTTP em produção (Vercel)
- [x] ✅ Busca do MQTT a cada 5 segundos automaticamente
- [x] ✅ Build configurado para produção

## 📝 Configurações

### Variáveis de Ambiente (Opcionais na Vercel)

- `MQTT_BROKER` - Broker MQTT (padrão: broker.hivemq.com)
- `MQTT_PORT` - Porta MQTT (padrão: 1883)

### Build Settings na Vercel

- **Framework Preset**: Other
- **Root Directory**: `semaforo-inteligente/dashboard`
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/build`
- **Install Command**: `npm install && cd frontend && npm install`

## 🚀 Passos para Deploy

### 1. Preparação Local

```bash
# Instalar dependências localmente (para testar)
cd semaforo-inteligente/dashboard
npm run install-all

# Testar build do frontend
npm run build
```

### 2. Deploy via CLI

```bash
# Instalar Vercel CLI (se ainda não tiver)
npm install -g vercel

# Fazer login
vercel login

# Deploy (primeira vez)
vercel

# Deploy em produção
vercel --prod
```

### 3. Deploy via Interface Web

1. Acesse [vercel.com](https://vercel.com)
2. **Add New** → **Project**
3. Importe seu repositório Git
4. Configure conforme checklist acima
5. **Deploy**

## ✅ Verificação Pós-Deploy

Após o deploy, verifique:

- [ ] Site está acessível na URL fornecida pela Vercel
- [ ] `/api/health` retorna `{ status: 'ok' }`
- [ ] `/api/estado` retorna dados do semáforo
- [ ] Frontend carrega sem erros
- [ ] Comandos MQTT funcionam (`/api/comando/modo`)

## 🔍 Testes

### Testar API Health

```bash
curl https://seu-projeto.vercel.app/api/health
```

### Testar API Estado

```bash
curl https://seu-projeto.vercel.app/api/estado
```

### Testar Comando

```bash
curl -X POST https://seu-projeto.vercel.app/api/comando/modo \
  -H "Content-Type: application/json" \
  -d '{"modo":"NOITE"}'
```

## ⚠️ Limitações Conhecidas

1. **Estado em Memória**: As Serverless Functions são stateless. Estado pode ser resetado entre invocações.
2. **WebSocket**: Não funciona completamente em Serverless Functions - usa polling HTTP.
3. **Timeout**: Funções têm timeout máximo de 30s (configurado no `vercel.json`).

## 🎯 Próximos Passos (Opcional)

Para produção completa com múltiplos dispositivos:

- [ ] Integrar Redis (Upstash Redis) para estado compartilhado
- [ ] Implementar banco de dados para histórico
- [ ] Configurar cron job para manter conexão MQTT ativa
- [ ] Adicionar autenticação/autorização
- [ ] Implementar rate limiting

## 📚 Documentação

- [DEPLOY.md](./DEPLOY.md) - Guia completo de deploy
- [README.md](./README.md) - Documentação geral do projeto

---

**Tudo pronto!** 🎉 O projeto está configurado para deploy na Vercel.
