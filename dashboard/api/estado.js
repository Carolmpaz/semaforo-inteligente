// Esta função retorna o estado atual do semáforo
// Em produção, considere usar um banco de dados ou Redis para estado persistente

// Estado em memória (será perdido entre invocações de função serverless)
// Para produção, use Redis ou banco de dados
const estadoInicial = {
  modo: 'DIA',
  ldrValor: 0,
  estado: 'VERDE_1',
  distancia: 0,
  carroPresente: false,
  tempoExtendido: false,
  ultimaAtualizacao: null,
  iotConectado: false
};

// Cache simples - na Vercel, cada invocação é isolada,
// então este estado será resetado frequentemente
// Para produção, integre com Redis ou banco de dados
let estadoCache = { ...estadoInicial };

// Tentar buscar do MQTT se solicitado
async function buscarDoMQTT() {
  try {
    // Chamar função de listen para atualizar estado
    // Nota: Isso é uma simplificação - em produção, use Redis compartilhado
    const mqtt = require('mqtt');
    const MQTT_BROKER = process.env.MQTT_BROKER || 'broker.hivemq.com';
    const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883');
    
    const client = mqtt.connect(`mqtt://${MQTT_BROKER}:${MQTT_PORT}`, {
      clientId: 'semaforo-estado-' + Math.random().toString(16).substr(2, 8),
      connectTimeout: 3000
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        client.end();
        resolve(null);
      }, 2000);

      const topics = [
        'semaforo/01/ldr/valor',
        'semaforo/01/modo',
        'semaforo/01/estado',
        'semaforo/01/ultrassonico/valor'
      ];

      let receivedCount = 0;
      const tempEstado = { ...estadoCache };

      client.on('connect', () => {
        topics.forEach(topic => {
          client.subscribe(topic);
        });
      });

      client.on('message', (topic, message) => {
        const msg = message.toString();
        tempEstado.iotConectado = true;
        tempEstado.ultimaAtualizacao = new Date().toISOString();

        if (topic.includes('ldr')) {
          tempEstado.ldrValor = parseInt(msg) || 0;
        } else if (topic.includes('modo')) {
          tempEstado.modo = msg;
        } else if (topic.includes('estado')) {
          tempEstado.estado = msg;
        } else if (topic.includes('ultrassonico')) {
          const distancia = parseInt(msg) || 0;
          tempEstado.distancia = distancia;
          tempEstado.carroPresente = (distancia > 0 && distancia < 20);
        }

        receivedCount++;
        if (receivedCount >= topics.length) {
          clearTimeout(timeout);
          client.end();
          resolve(tempEstado);
        }
      });

      client.on('error', () => {
        clearTimeout(timeout);
        client.end();
        resolve(null);
      });
    });
  } catch (error) {
    console.error('Erro ao buscar do MQTT:', error);
    return null;
  }
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
    // Se solicitado, tenta buscar do MQTT primeiro
    const atualizar = req.query.atualizar === 'true';
    
    if (atualizar) {
      const novoEstado = await buscarDoMQTT();
      if (novoEstado) {
        estadoCache = novoEstado;
      }
    }

    // Retorna o estado atual (pode ser do cache ou inicial)
    // Em produção, busque de Redis/banco de dados
    return res.status(200).json({
      ...estadoCache,
      // Marca como timestamp atual se não houver
      ultimaAtualizacao: estadoCache.ultimaAtualizacao || new Date().toISOString()
    });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
