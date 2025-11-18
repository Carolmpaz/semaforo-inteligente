# Semáforo Inteligente IoT

Sistema completo de controle e monitoramento de semáforos inteligentes com comunicação MQTT.

## Funcionalidades

- Monitoramento em tempo real do estado do semáforo
- Controle do modo diário/noturno
- Visualização do valor do sensor LDR (luminosidade)
- **Sensor ultrassônico para detecção de carros**
- **Visualização de distância em tempo real**
- **Indicador quando tempo verde está estendido (+3s)**
- Interface web moderna e responsiva
- Comunicação em tempo real via WebSocket
- Integração MQTT com broker HiveMQ

## Estrutura do Projeto

```
semaforo/
├── backend/
│   └── server.js          # Servidor Node.js com Express e MQTT
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js         # Componente principal React
│   │   ├── App.css        # Estilos do frontend
│   │   ├── index.js       # Ponto de entrada React
│   │   └── index.css      # Estilos globais
│   └── package.json
├── package.json           # Dependências do backend
└── README.md
```

## Instalação

### 1. Instalar dependências do backend

```bash
npm install
```

### 2. Instalar dependências do frontend

```bash
cd frontend
npm install
cd ..
```

### 3. Instalar tudo de uma vez

```bash
npm run install-all
```

##  Execução

### Desenvolvimento

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run frontend
```

### Produção

**Backend:**
```bash
npm start
```

**Frontend:**
```bash
cd frontend
npm start
```

## Configuração

### Backend

O servidor backend roda na porta `3001` por padrão. Você pode alterar isso definindo a variável de ambiente `PORT`:

```bash
PORT=3002 npm start
```

### Frontend

O frontend roda na porta `3000` por padrão (React Scripts).

Para alterar a URL da API, crie um arquivo `.env` no diretório `frontend`:

```
REACT_APP_API_URL=http://localhost:3001
```

## Tópicos MQTT

O sistema utiliza os seguintes tópicos MQTT:

- `semaforo/01/ldr/valor` - Valor do sensor LDR (publicado pelo ESP32)
- `semaforo/01/modo` - Modo atual (DIA/NOITE) (publicado pelo ESP32)
- `semaforo/01/comando/modo` - Comando para alterar modo (publicado pelo backend)
- `semaforo/01/estado` - Estado atual do semáforo (VERDE_1, AMARELO_1, etc.) - opcional
- `semaforo/01/ultrassonico/valor` - Distância medida pelo sensor ultrassônico (cm)

## API Endpoints

### GET `/api/estado`
Retorna o estado atual do semáforo.

**Resposta:**
```json
{
  "modo": "DIA",
  "ldrValor": 2500,
  "estado": "VERDE_1",
  "distancia": 15,
  "carroPresente": true,
  "tempoExtendido": true,
  "ultimaAtualizacao": "2024-01-01T12:00:00.000Z",
  "iotConectado": true
}
```

### POST `/api/comando/modo`
Envia comando para alterar o modo do semáforo.

**Body:**
```json
{
  "modo": "NOITE"
}
```

**Resposta:**
```json
{
  "success": true,
  "modo": "NOITE"
}
```

## WebSocket Events

O servidor emite os seguintes eventos via Socket.IO:

- `semaforo-update` - Atualização completa do estado
- `modo-update` - Atualização do modo
- `ldr-update` - Atualização do valor LDR
- `estado-update` - Atualização do estado do semáforo
- `ultrassom-update` - Atualização da distância do sensor ultrassônico
- `carro-update` - Atualização da detecção de carro e tempo estendido

## Interface Web

A interface web permite:

1. **Visualizar o estado atual** dos dois semáforos em tempo real
2. **Ativar modo diário** ou **modo noturno** manualmente
3. **Monitorar o sensor LDR** com barra de progresso visual
4. **Visualizar dados do sensor ultrassônico**:
   - Distância medida em centímetros
   - Status de detecção de carro (presente/ausente)
   - Indicador quando o tempo verde está estendido (+3s)
5. **Ver status de conexão** com o servidor e dispositivo IoT

## Próximas Funcionalidades

- [ ] Histórico de estados e eventos
- [ ] Gráficos de luminosidade e distância ao longo do tempo
- [ ] Configuração de tempos do semáforo via interface web
- [ ] Suporte para múltiplos semáforos
- [ ] Estatísticas de tráfego (carros detectados por período)

## Tecnologias Utilizadas

- **Backend:**
  - Node.js
  - Express
  - MQTT.js
  - Socket.IO

- **Frontend:**
  - React
  - Socket.IO Client
  - Axios
