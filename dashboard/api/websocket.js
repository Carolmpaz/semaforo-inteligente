// Nota: Socket.IO completo não funciona diretamente na Vercel Serverless Functions
// devido a limitações de WebSocket. Esta é uma alternativa usando Server-Sent Events (SSE)
// ou polling. Para WebSocket completo, considere usar um serviço externo como:
// - Ably
// - Pusher
// - Cloudflare Workers com Durable Objects
// - Um servidor Node.js dedicado

// Implementação alternativa: API para polling do estado
// O frontend pode fazer polling a cada segundo para simular tempo real

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Para SSE (Server-Sent Events) - alternativa a WebSocket
  if (req.method === 'GET' && req.query.stream === 'true') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Enviar estado inicial
    res.write(`data: ${JSON.stringify({
      type: 'initial',
      estado: {
        modo: 'DIA',
        ldrValor: 0,
        estado: 'VERDE_1',
        distancia: 0,
        carroPresente: false,
        tempoExtendido: false,
        ultimaAtualizacao: new Date().toISOString(),
        iotConectado: false
      }
    })}\n\n`);

    // Manter conexão aberta (simplificado - em produção, use um serviço adequado)
    const interval = setInterval(() => {
      res.write(`: keep-alive\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });

    return;
  }

  return res.status(200).json({
    message: 'Para WebSocket em tempo real, use polling ou integre com serviço externo',
    pollingEndpoint: '/api/estado',
    note: 'Socket.IO completo requer servidor dedicado ou serviço como Ably/Pusher'
  });
}
