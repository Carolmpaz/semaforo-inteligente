# 🚀 Guia de Deploy na Vercel

Este guia explica como fazer deploy do dashboard do Semáforo Inteligente IoT na Vercel.

## 📋 Pré-requisitos

1. Conta na [Vercel](https://vercel.com) (gratuita)
2. Git instalado e repositório configurado
3. Node.js 18+ instalado (para desenvolvimento local)

## 🔧 Estrutura do Projeto

O projeto está configurado para deploy na Vercel com:

- **Frontend**: React SPA (Single Page Application) servido como site estático
- **Backend**: API Serverless Functions na pasta `/api`
- **Configuração**: `vercel.json` com todas as configurações necessárias

## 🚀 Deploy via Vercel CLI

### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

### 2. Fazer login na Vercel

```bash
vercel login
```

### 3. Navegar até a pasta do dashboard

```bash
cd semaforo-inteligente/dashboard
```

### 4. Fazer deploy

```bash
vercel
```

Na primeira vez, você será questionado sobre as configurações:
- **Set up and deploy?** → Yes
- **Which scope?** → Selecione sua conta
- **Link to existing project?** → No (primeira vez)
- **Project name?** → semaforo-iot-dashboard (ou o nome que preferir)
- **Directory?** → ./ (deixe em branco para usar a pasta atual)

### 5. Deploy em produção

```bash
vercel --prod
```

## 🌐 Deploy via Interface Web da Vercel

### 1. Conectar Repositório

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Add New" → "Project"
3. Importe seu repositório Git (GitHub, GitLab, Bitbucket)
4. Configure o projeto:
   - **Framework Preset**: Other
   - **Root Directory**: `semaforo-inteligente/dashboard`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/build`
   - **Install Command**: `npm install && cd frontend && npm install`

### 2. Variáveis de Ambiente (Opcional)

Se precisar configurar variáveis de ambiente:

1. Vá em **Settings** → **Environment Variables**
2. Adicione as variáveis necessárias:
   - `MQTT_BROKER` (opcional, padrão: broker.hivemq.com)
   - `MQTT_PORT` (opcional, padrão: 1883)

### 3. Deploy

A Vercel fará deploy automaticamente a cada push para o repositório.

## 📝 Notas Importantes

### WebSocket vs Polling

- **Em desenvolvimento local**: O app usa WebSocket (Socket.IO) para atualizações em tempo real
- **Na Vercel (produção)**: O app automaticamente usa polling a cada 1 segundo, já que WebSocket completo não funciona em Serverless Functions

Isso é transparente para o usuário - o app detecta automaticamente o ambiente e usa a melhor opção disponível.

### Estado Compartilhado

As Serverless Functions da Vercel são stateless (sem estado persistente). O estado do semáforo é mantido em memória durante cada invocação. Para produção com múltiplos dispositivos IoT, considere:

- Usar Redis para estado compartilhado
- Usar banco de dados (MongoDB, PostgreSQL)
- Usar um serviço de cache (Upstash Redis, Vercel KV)

### Limitações

1. **Timeout**: Funções serverless têm timeout de 10s no plano gratuito (configurado para 30s no `vercel.json`)
2. **WebSocket**: Não há suporte completo a WebSocket em Serverless Functions - use polling
3. **Estado**: Estado em memória não persiste entre invocações

## 🔍 Verificação Pós-Deploy

Após o deploy, verifique:

1. ✅ O site está acessível na URL fornecida pela Vercel
2. ✅ A rota `/api/health` retorna status OK
3. ✅ A rota `/api/estado` retorna dados do semáforo
4. ✅ O frontend consegue se conectar às APIs

## 🐛 Troubleshooting

### Erro: "Function exceeded maximum duration"

- Aumente o timeout no `vercel.json` (máximo 30s no plano gratuito)
- Otimize o código para reduzir tempo de execução

### Erro: "Module not found"

- Certifique-se que todas as dependências estão no `package.json` da raiz
- Verifique se o `installCommand` no `vercel.json` instala todas as dependências

### Erro de CORS

- Verifique se os headers CORS estão configurados nos arquivos da API
- Confirme que o frontend está usando a URL correta da API

### Frontend não carrega

- Verifique se o `outputDirectory` no `vercel.json` está correto (`frontend/build`)
- Confirme que o build foi executado com sucesso

## 📚 Recursos Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Serverless Functions](https://vercel.com/docs/functions)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## ✅ Checklist de Deploy

- [ ] Código commitado no repositório Git
- [ ] `vercel.json` configurado corretamente
- [ ] `package.json` com todas as dependências
- [ ] Frontend builda sem erros localmente
- [ ] APIs testadas localmente
- [ ] Variáveis de ambiente configuradas (se necessário)
- [ ] Deploy realizado com sucesso
- [ ] Site acessível e funcionando

---

**Pronto!** Seu dashboard está no ar na Vercel! 🎉
