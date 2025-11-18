// API principal que gerencia estado compartilhado e MQTT
// Nota: Na Vercel, cada função serverless é isolada, então precisamos
// usar um serviço externo ou manter estado em memória compartilhada
// Para produção completa, considere usar Redis ou outro serviço de estado compartilhado

let estadoSemaforo = {
  modo: 'DIA',
  ldrValor: 0,
  estado: 'VERDE_1',
  distancia: 0,
  carroPresente: false,
  tempoExtendido: false,
  ultimaAtualizacao: null,
  iotConectado: false
};

// Esta é uma solução simplificada - em produção, use Redis ou banco de dados
// para compartilhar estado entre funções serverless
const estadoCompartilhado = {
  estado: estadoSemaforo,
  listeners: new Set()
};

// Handler principal da API
module.exports = function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'API do Semáforo IoT está funcionando',
      endpoints: {
        health: '/api/health',
        estado: '/api/estado',
        comando: '/api/comando/modo'
      }
    });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
