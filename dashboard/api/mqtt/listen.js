// Esta função escuta MQTT e atualiza o estado
// Pode ser chamada periodicamente via cron job da Vercel ou via polling
// Para produção completa, use Vercel KV ou Redis para estado compartilhado

const mqtt = require('mqtt');

// Configuração MQTT
const MQTT_BROKER = process.env.MQTT_BROKER || 'broker.hivemq.com';
const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883');

// Tópicos MQTT
const TOPICS = {
  LDR_VALOR: 'semaforo/01/ldr/valor',
  MODO: 'semaforo/01/modo',
  ESTADO: 'semaforo/01/estado',
  ULTRASSOM_VALOR: 'semaforo/01/ultrassonico/valor'
};

// Estado compartilhado (em produção, use Redis/Vercel KV)
let estadoAtual = {
  modo: 'DIA',
  ldrValor: 0,
  estado: 'VERDE_1',
  distancia: 0,
  carroPresente: false,
  tempoExtendido: false,
  ultimaAtualizacao: new Date().toISOString(),
  iotConectado: false
};

// Cache de conexão MQTT
let mqttClient = null;
let isListening = false;

async function connectMQTT() {
  if (mqttClient && mqttClient.connected) {
    return mqttClient;
  }

  return new Promise((resolve, reject) => {
    try {
      mqttClient = mqtt.connect(`mqtt://${MQTT_BROKER}:${MQTT_PORT}`, {
        clientId: 'semaforo-vercel-listen-' + Math.random().toString(16).substr(2, 8),
        reconnectPeriod: 1000,
        connectTimeout: 10000
      });

      const timeout = setTimeout(() => {
        if (!mqttClient.connected) {
          mqttClient.end();
          reject(new Error('Timeout ao conectar ao MQTT'));
        }
      }, 10000);

      mqttClient.on('connect', () => {
        clearTimeout(timeout);
        console.log('✅ Conectado ao broker MQTT');
        
        // Subscrever aos tópicos
        const topicsToSubscribe = Object.values(TOPICS);
        topicsToSubscribe.forEach(topic => {
          mqttClient.subscribe(topic, (err) => {
            if (!err) console.log(`📡 Inscrito em: ${topic}`);
          });
        });

        resolve(mqttClient);
      });

      mqttClient.on('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Erro MQTT:', error);
        reject(error);
      });

      mqttClient.on('message', (topic, message) => {
        const msg = message.toString();
        console.log(`📨 Mensagem recebida [${topic}]: ${msg}`);
        
        // Atualizar estado
        estadoAtual.iotConectado = true;
        estadoAtual.ultimaAtualizacao = new Date().toISOString();

        if (topic === TOPICS.LDR_VALOR) {
          estadoAtual.ldrValor = parseInt(msg) || 0;
        } else if (topic === TOPICS.MODO) {
          estadoAtual.modo = msg;
        } else if (topic === TOPICS.ESTADO) {
          estadoAtual.estado = msg;
          estadoAtual.tempoExtendido = estadoAtual.carroPresente && 
                                       (msg === 'VERDE_1');
        } else if (topic === TOPICS.ULTRASSOM_VALOR) {
          const distancia = parseInt(msg) || 0;
          estadoAtual.distancia = distancia;
          const DISTANCIA_LIMIAR = 20;
          estadoAtual.carroPresente = (distancia > 0 && distancia < DISTANCIA_LIMIAR);
          estadoAtual.tempoExtendido = estadoAtual.carroPresente && 
                                       (estadoAtual.estado === 'VERDE_1');
        }
      });

    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Conectar ao MQTT se não estiver conectado
    if (!mqttClient || !mqttClient.connected) {
      await connectMQTT();
    }

    // Manter conexão por alguns segundos para receber mensagens
    // Nota: Em serverless, isso tem limitações
    const listenDuration = parseInt(req.query.duration || '5') * 1000; // segundos
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(res.status(200).json({
          success: true,
          estado: estadoAtual,
          message: 'Estado atualizado via MQTT',
          listening: true,
          timestamp: new Date().toISOString()
        }));
      }, Math.min(listenDuration, 5000)); // Máximo 5 segundos
    });

  } catch (error) {
    console.error('❌ Erro ao processar MQTT:', error);
    return res.status(500).json({
      error: 'Erro ao conectar ao MQTT',
      details: error.message,
      estado: estadoAtual
    });
  }
};
