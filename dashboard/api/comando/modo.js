const mqtt = require('mqtt');

// Configuração MQTT
const MQTT_BROKER = process.env.MQTT_BROKER || 'broker.hivemq.com';
const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883');
const TOPIC_COMANDO_MODO = 'semaforo/01/comando/modo';

function getMqttClient() {
  try {
    const client = mqtt.connect(`mqtt://${MQTT_BROKER}:${MQTT_PORT}`, {
      clientId: 'semaforo-vercel-' + Math.random().toString(16).substr(2, 8),
      reconnectPeriod: 1000,
      connectTimeout: 10000
    });

    return client;
  } catch (error) {
    console.error('❌ Erro ao criar cliente MQTT:', error);
    throw error;
  }
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { modo } = req.body;

      // Validação
      if (!modo || (modo !== 'NOITE' && modo !== 'DIA')) {
        return res.status(400).json({ 
          error: 'Modo inválido. Use "DIA" ou "NOITE"' 
        });
      }

      // Criar cliente MQTT
      const client = getMqttClient();

      // Aguardar conexão
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.end();
          reject(new Error('Timeout ao conectar ao MQTT'));
        }, 5000);

        client.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        client.on('error', (error) => {
          clearTimeout(timeout);
          client.end();
          reject(error);
        });
      });

      // Publicar comando
      return new Promise((resolve) => {
        client.publish(TOPIC_COMANDO_MODO, modo, (err) => {
          client.end();

          if (err) {
            console.error('❌ Erro ao publicar comando:', err);
            resolve(res.status(500).json({ 
              error: 'Erro ao enviar comando MQTT',
              details: err.message 
            }));
            return;
          }

          console.log(`📤 Comando enviado: ${modo}`);
          resolve(res.status(200).json({ 
            success: true, 
            modo: modo,
            timestamp: new Date().toISOString()
          }));
        });
      });

    } catch (error) {
      console.error('❌ Erro ao processar comando:', error);
      return res.status(500).json({ 
        error: 'Erro ao processar comando',
        details: error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
