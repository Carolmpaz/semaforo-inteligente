const express = require('express');
const http = require('http');
const cors = require('cors');
const mqtt = require('mqtt');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

// Configuração MQTT
const MQTT_BROKER = 'broker.hivemq.com';
const MQTT_PORT = 1883;

// Tópicos MQTT
const TOPICS = {
  LDR_VALOR: 'semaforo/01/ldr/valor',
  MODO: 'semaforo/01/modo',
  COMANDO_MODO: 'semaforo/01/comando/modo',
  ESTADO: 'semaforo/01/estado',
  ULTRASSOM_VALOR: 'semaforo/01/ultrassonico/valor' // Tópico atualizado do Arduino
};

// Estado atual do semáforo
let estadoSemaforo = {
  modo: 'DIA',
  ldrValor: 0,
  estado: 'VERDE_1',
  distancia: 0,
  carroPresente: false,
  tempoExtendido: false, // Indica se o verde está estendido por causa do carro
  ultimaAtualizacao: null,
  iotConectado: false // Flag para indicar se já recebeu dados do IoT
};

// Conectar ao broker MQTT
const mqttClient = mqtt.connect(`mqtt://${MQTT_BROKER}:${MQTT_PORT}`, {
  clientId: 'semaforo-backend-' + Math.random().toString(16).substr(2, 8),
  reconnectPeriod: 1000
});

mqttClient.on('connect', () => {
  console.log('✅ Conectado ao broker MQTT');
  
  // Subscrever aos tópicos
  mqttClient.subscribe(TOPICS.LDR_VALOR, (err) => {
    if (!err) console.log(`📡 Inscrito em: ${TOPICS.LDR_VALOR}`);
  });
  
  mqttClient.subscribe(TOPICS.MODO, (err) => {
    if (!err) console.log(`📡 Inscrito em: ${TOPICS.MODO}`);
  });
  
  mqttClient.subscribe(TOPICS.ESTADO, (err) => {
    if (!err) console.log(`📡 Inscrito em: ${TOPICS.ESTADO}`);
  });
  
  mqttClient.subscribe(TOPICS.ULTRASSOM_VALOR, (err) => {
    if (!err) console.log(`📡 Inscrito em: ${TOPICS.ULTRASSOM_VALOR}`);
  });
});

mqttClient.on('message', (topic, message) => {
  const msg = message.toString();
  console.log(`📨 Mensagem recebida [${topic}]: ${msg}`);
  
  // Marcar como conectado ao IoT quando receber qualquer mensagem
  if (!estadoSemaforo.iotConectado) {
    estadoSemaforo.iotConectado = true;
    console.log('✅ Dispositivo IoT conectado!');
  }
  
  if (topic === TOPICS.LDR_VALOR) {
    estadoSemaforo.ldrValor = parseInt(msg);
    estadoSemaforo.ultimaAtualizacao = new Date();
    io.emit('ldr-update', { valor: estadoSemaforo.ldrValor });
  }
  
  if (topic === TOPICS.MODO) {
    estadoSemaforo.modo = msg;
    estadoSemaforo.ultimaAtualizacao = new Date();
    io.emit('modo-update', { modo: estadoSemaforo.modo });
  }
  
  if (topic === TOPICS.ESTADO) {
    estadoSemaforo.estado = msg;
    // Atualizar tempoExtendido quando o estado muda
    estadoSemaforo.tempoExtendido = estadoSemaforo.carroPresente && 
                                     (msg === 'VERDE_1');
    estadoSemaforo.ultimaAtualizacao = new Date();
    io.emit('estado-update', { estado: estadoSemaforo.estado });
  }
  
  if (topic === TOPICS.ULTRASSOM_VALOR) {
    const distancia = parseInt(msg);
    estadoSemaforo.distancia = distancia;
    
    // Calcular se há carro presente (menos de 20 cm = carro presente)
    const DISTANCIA_LIMIAR = 20;
    estadoSemaforo.carroPresente = (distancia > 0 && distancia < DISTANCIA_LIMIAR);
    
    // Se está em VERDE_1 e carro presente, tempo está estendido
    estadoSemaforo.tempoExtendido = estadoSemaforo.carroPresente && 
                                     (estadoSemaforo.estado === 'VERDE_1');
    
    estadoSemaforo.ultimaAtualizacao = new Date();
    
    // Emitir atualizações
    io.emit('ultrassom-update', { distancia: estadoSemaforo.distancia });
    io.emit('carro-update', { 
      carroPresente: estadoSemaforo.carroPresente,
      tempoExtendido: estadoSemaforo.tempoExtendido
    });
  }
  
  // Enviar atualização completa
  io.emit('semaforo-update', estadoSemaforo);
});

mqttClient.on('error', (error) => {
  console.error('❌ Erro MQTT:', error);
});

// Rotas da API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mqttConnected: mqttClient.connected,
    iotConnected: estadoSemaforo.iotConectado
  });
});

app.get('/api/estado', (req, res) => {
  res.json(estadoSemaforo);
});

app.post('/api/comando/modo', (req, res) => {
  const { modo } = req.body;
  
  if (modo === 'NOITE' || modo === 'DIA') {
    mqttClient.publish(TOPICS.COMANDO_MODO, modo, (err) => {
      if (err) {
        console.error('❌ Erro ao publicar comando:', err);
        return res.status(500).json({ error: 'Erro ao enviar comando' });
      }
      console.log(`📤 Comando enviado: ${modo}`);
      res.json({ success: true, modo: modo });
    });
  } else {
    res.status(400).json({ error: 'Modo inválido. Use "DIA" ou "NOITE"' });
  }
});

// WebSocket
io.on('connection', (socket) => {
  console.log('👤 Cliente conectado:', socket.id);
  console.log('📤 Enviando estado inicial para cliente:', socket.id);
  
  // Enviar estado atual ao conectar
  socket.emit('semaforo-update', estadoSemaforo);
  
  socket.on('disconnect', (reason) => {
    console.log('👤 Cliente desconectado:', socket.id, 'Razão:', reason);
  });

  socket.on('error', (error) => {
    console.error('❌ Erro no socket:', error);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 API REST: http://localhost:${PORT}/api`);
  console.log(`📡 Conectando ao MQTT: ${MQTT_BROKER}:${MQTT_PORT}`);
  console.log(`🔌 WebSocket pronto para conexões`);
});

