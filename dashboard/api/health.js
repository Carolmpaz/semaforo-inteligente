const mqtt = require('mqtt');

// Configuração MQTT
const MQTT_BROKER = process.env.MQTT_BROKER || 'broker.hivemq.com';
const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883');

// Cache de conexão MQTT (será reutilizado se possível)
let mqttClient = null;
let mqttConnected = false;

function getMqttClient() {
  if (!mqttClient) {
    try {
      mqttClient = mqtt.connect(`mqtt://${MQTT_BROKER}:${MQTT_PORT}`, {
        clientId: 'semaforo-vercel-' + Math.random().toString(16).substr(2, 8),
        reconnectPeriod: 1000,
        connectTimeout: 10000
      });

      mqttClient.on('connect', () => {
        mqttConnected = true;
        console.log('✅ Conectado ao broker MQTT');
      });

      mqttClient.on('error', (error) => {
        console.error('❌ Erro MQTT:', error);
        mqttConnected = false;
      });

      mqttClient.on('close', () => {
        mqttConnected = false;
      });
    } catch (error) {
      console.error('❌ Erro ao criar cliente MQTT:', error);
    }
  }
  return mqttClient;
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const client = getMqttClient();
    
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mqttConnected: mqttConnected && client?.connected,
      mqttBroker: `${MQTT_BROKER}:${MQTT_PORT}`,
      environment: process.env.NODE_ENV || 'development'
    });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
