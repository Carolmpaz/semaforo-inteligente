import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';

// Detecta automaticamente a URL da API baseada no ambiente
const getApiUrl = () => {
  // Em produção na Vercel, usa a URL atual
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }
  // Em desenvolvimento, usa a variável de ambiente ou localhost
  return process.env.REACT_APP_API_URL || 'http://localhost:3001';
};

const API_URL = getApiUrl();

function App() {
  const [estado, setEstado] = useState({
    modo: 'DIA',
    ldrValor: 0,
    estado: 'VERDE_1',
    distancia: 0,
    carroPresente: false,
    tempoExtendido: false,
    ultimaAtualizacao: null,
    iotConectado: false
  });
  const [conectado, setConectado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erroConexao, setErroConexao] = useState(null);

  useEffect(() => {
    console.log('🔌 Tentando conectar ao backend:', API_URL);
    
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let socket = null;
    let pollingInterval = null;
    let shouldConnect = true;
    let contadorAtualizacao = 0; // Contador para controle de atualização MQTT

    // Em desenvolvimento, tenta usar WebSocket (Socket.IO)
    if (isDevelopment) {
      try {
        socket = io(API_URL, {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
          timeout: 20000,
          transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
          console.log('✅ Conectado ao servidor WebSocket:', socket.id);
          setConectado(true);
          setErroConexao(null);
        });

        socket.on('connect_error', (error) => {
          console.warn('⚠️ WebSocket não disponível, usando polling...', error.message);
          setConectado(false);
          // Fallback para polling
          startPolling();
        });

        socket.on('disconnect', (reason) => {
          console.log('⚠️ Desconectado do servidor:', reason);
          setConectado(false);
          if (reason === 'io server disconnect') {
            socket.connect();
          }
        });

        socket.on('reconnect', (attemptNumber) => {
          console.log('🔄 Reconectado após', attemptNumber, 'tentativas');
          setConectado(true);
          setErroConexao(null);
        });

        socket.on('semaforo-update', (data) => {
          console.log('📨 Atualização recebida via WebSocket:', data);
          setEstado(data);
        });

        socket.on('modo-update', (data) => {
          setEstado(prev => ({ ...prev, modo: data.modo }));
        });

        socket.on('ldr-update', (data) => {
          setEstado(prev => ({ ...prev, ldrValor: data.valor }));
        });

        socket.on('estado-update', (data) => {
          setEstado(prev => ({ ...prev, estado: data.estado }));
        });

        socket.on('ultrassom-update', (data) => {
          setEstado(prev => ({ ...prev, distancia: data.distancia }));
        });

        socket.on('carro-update', (data) => {
          setEstado(prev => ({ 
            ...prev, 
            carroPresente: data.carroPresente,
            tempoExtendido: data.tempoExtendido
          }));
        });
      } catch (error) {
        console.warn('⚠️ Erro ao inicializar Socket.IO, usando polling:', error);
        startPolling();
      }
    } else {
      // Em produção (Vercel), usa polling
      startPolling();
    }

    // Função de polling para atualização em tempo real
    function startPolling() {
      console.log('📡 Usando polling para atualização em tempo real');
      setConectado(true);
      
      // Buscar estado imediatamente
      buscarEstado();
      
      // Polling a cada 1 segundo
      pollingInterval = setInterval(() => {
        if (shouldConnect) {
          buscarEstado();
        }
      }, 1000);
    }

    // Função para buscar estado do servidor
    async function buscarEstado() {
      try {
        // Em produção (Vercel), tenta buscar do MQTT periodicamente
        // A cada 5 chamadas (5 segundos), solicita atualização do MQTT
        contadorAtualizacao++;
        const deveAtualizar = contadorAtualizacao % 5 === 0; // Atualiza a cada 5 segundos

        const url = `${API_URL}/api/estado${deveAtualizar ? '?atualizar=true' : ''}`;
        const response = await axios.get(url, {
          timeout: 8000 // Timeout maior para permitir conexão MQTT
        });
        setEstado(response.data);
        setErroConexao(null);
        setConectado(true);
      } catch (error) {
        console.error('❌ Erro ao buscar estado:', error);
        setConectado(false);
        if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          setErroConexao('Erro de rede. Verifique sua conexão.');
        } else {
          setErroConexao(`Erro: ${error.message || 'Erro desconhecido'}`);
        }
      }
    }

    // Verificar saúde do backend inicialmente
    const verificarConexao = async () => {
      try {
        console.log('🏥 Verificando saúde do backend...');
        const healthResponse = await axios.get(`${API_URL}/api/health`, {
          timeout: 5000
        });
        console.log('✅ Backend está saudável:', healthResponse.data);
        setConectado(true);
        setErroConexao(null);
      } catch (error) {
        console.error('❌ Erro ao verificar saúde do backend:', error);
        setConectado(false);
        setErroConexao(`Erro ao conectar: ${error.message || 'Erro desconhecido'}`);
      }
    };

    verificarConexao();

    return () => {
      shouldConnect = false;
      if (socket) {
        console.log('🔌 Desconectando WebSocket...');
        socket.disconnect();
      }
      if (pollingInterval) {
        console.log('🛑 Parando polling...');
        clearInterval(pollingInterval);
      }
    };
  }, []);

  const alterarModo = async (novoModo) => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/comando/modo`, { modo: novoModo });
    } catch (error) {
      console.error('Erro ao alterar modo:', error);
      alert('Erro ao alterar modo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoNome = (estado) => {
    const estados = {
      'VERDE_1': 'Verde 1',
      'AMARELO_1': 'Amarelo 1',
      'TROCA_1': 'Troca 1',
      'VERDE_2': 'Verde 2',
      'AMARELO_2': 'Amarelo 2',
      'TROCA_2': 'Troca 2'
    };
    return estados[estado] || estado;
  };

  const getCorEstado = (estado) => {
    if (estado.includes('VERDE')) return '#00ff00';
    if (estado.includes('AMARELO')) return '#ffff00';
    if (estado.includes('VERMELHO') || estado.includes('TROCA')) return '#ff0000';
    return '#888';
  };

  // Função para determinar quais LEDs estão acesos baseado no estado
  const getLuzesAtivas = (estado, modo) => {
    const luzes = {
      semaforo1: { vermelho: false, amarelo: false, verde: false },
      semaforo2: { vermelho: false, amarelo: false, verde: false }
    };

    // Modo noturno: ambos os amarelos piscam
    if (modo === 'NOITE') {
      // Simular piscar baseado no tempo (alterna a cada 500ms)
      const piscar = Math.floor(Date.now() / 500) % 2 === 0;
      luzes.semaforo1.amarelo = piscar;
      luzes.semaforo2.amarelo = piscar;
      return luzes;
    }

    // Modo diário: ciclo normal do semáforo
    switch(estado) {
      case 'VERDE_1':
        luzes.semaforo1.verde = true;
        luzes.semaforo2.vermelho = true;
        break;
      case 'AMARELO_1':
        luzes.semaforo1.amarelo = true;
        luzes.semaforo2.vermelho = true;
        break;
      case 'TROCA_1':
        luzes.semaforo1.vermelho = true;
        luzes.semaforo2.vermelho = true;
        break;
      case 'VERDE_2':
        luzes.semaforo1.vermelho = true;
        luzes.semaforo2.verde = true;
        break;
      case 'AMARELO_2':
        luzes.semaforo1.vermelho = true;
        luzes.semaforo2.amarelo = true;
        break;
      case 'TROCA_2':
        luzes.semaforo1.vermelho = true;
        luzes.semaforo2.vermelho = true;
        break;
      default:
        break;
    }

    return luzes;
  };

  const luzesAtivas = getLuzesAtivas(estado.estado, estado.modo);

  // Atualizar visualização a cada 100ms para modo noturno (piscar)
  useEffect(() => {
    if (estado.modo === 'NOITE') {
      const interval = setInterval(() => {
        // Forçar re-render para atualizar o piscar
        setEstado(prev => ({ ...prev }));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [estado.modo]);

  return (
    <div className="App">
      <div className="container">
        <header>
          <h1>🚦 Semáforo Inteligente IoT</h1>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className={`status ${conectado ? 'online' : 'offline'}`}>
              <span className="status-dot"></span>
              Backend: {conectado ? 'Conectado' : 'Desconectado'}
            </div>
            <div className={`status ${estado.iotConectado ? 'online' : 'offline'}`}>
              <span className="status-dot"></span>
              IoT: {estado.iotConectado ? 'Conectado' : 'Aguardando...'}
            </div>
          </div>
          {erroConexao && (
            <div style={{
              marginTop: '15px',
              padding: '10px 15px',
              background: '#A91021',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '0.9rem',
              border: '2px solid #2D253F'
            }}>
              ⚠️ {erroConexao}
            </div>
          )}
        </header>

        <div className="dashboard">
          <div className="card">
            <h2>Modo Atual</h2>
            <div className={`modo-indicator ${estado.modo.toLowerCase()}`}>
              {estado.modo === 'DIA' ? '☀️' : '🌙'} {estado.modo}
            </div>
            <div className="controles">
              <button
                onClick={() => alterarModo('DIA')}
                disabled={loading || estado.modo === 'DIA'}
                className="btn btn-dia"
              >
                Ativar Modo Diário
              </button>
              <button
                onClick={() => alterarModo('NOITE')}
                disabled={loading || estado.modo === 'NOITE'}
                className="btn btn-noite"
              >
                Ativar Modo Noturno
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Estado do Semáforo</h2>
            {!estado.iotConectado && (
              <div style={{ 
                background: '#2D253F', 
                color: '#FFFFFF', 
                padding: '15px', 
                borderRadius: '10px', 
                marginBottom: '20px',
                textAlign: 'center',
                fontWeight: '600',
                border: '2px solid #A91021'
              }}>
                ⚠️ Aguardando conexão com o dispositivo IoT...
                <br />
                <small style={{ fontSize: '0.9rem', fontWeight: '400' }}>
                  Os valores exibidos são apenas exemplos. Conecte seu ESP32 para ver dados reais.
                </small>
              </div>
            )}
            <div className="estado-semaforo">
              <div className="semaforo-visual">
                <div className="semaforo semaforo-1">
                  <h3>Semáforo 1</h3>
                  <div className="luzes">
                    <div className={`luz vermelho ${luzesAtivas.semaforo1.vermelho ? 'ativo' : ''} ${!estado.iotConectado ? 'desabilitado' : ''}`}></div>
                    <div className={`luz amarelo ${luzesAtivas.semaforo1.amarelo ? 'ativo' : ''} ${!estado.iotConectado ? 'desabilitado' : ''}`}></div>
                    <div className={`luz verde ${luzesAtivas.semaforo1.verde ? 'ativo' : ''} ${!estado.iotConectado ? 'desabilitado' : ''}`}></div>
                  </div>
                </div>
                <div className="semaforo semaforo-2">
                  <h3>Semáforo 2</h3>
                  <div className="luzes">
                    <div className={`luz vermelho ${luzesAtivas.semaforo2.vermelho ? 'ativo' : ''} ${!estado.iotConectado ? 'desabilitado' : ''}`}></div>
                    <div className={`luz amarelo ${luzesAtivas.semaforo2.amarelo ? 'ativo' : ''} ${!estado.iotConectado ? 'desabilitado' : ''}`}></div>
                    <div className={`luz verde ${luzesAtivas.semaforo2.verde ? 'ativo' : ''} ${!estado.iotConectado ? 'desabilitado' : ''}`}></div>
                  </div>
                </div>
              </div>
              <div className="estado-texto">
                <span style={{ color: getCorEstado(estado.estado), opacity: estado.iotConectado ? 1 : 0.5 }}>
                  {getEstadoNome(estado.estado)}
                </span>
                {estado.tempoExtendido && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 15px',
                    background: '#A91021',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    border: '2px solid #2D253F'
                  }}>
                    ⏱️ Tempo verde estendido (+3s) - Carro detectado
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Sensor Ultrassônico</h2>
            {!estado.iotConectado && (
              <p style={{ 
                color: '#2D253F', 
                textAlign: 'center', 
                marginBottom: '15px',
                fontStyle: 'italic'
              }}>
                Valor padrão - Aguardando dados do dispositivo
              </p>
            )}
            <div className="ultrassom-info">
              <div className="ultrassom-distancia">
                <div className="distancia-valor" style={{ opacity: estado.iotConectado ? 1 : 0.5 }}>
                  {estado.distancia > 0 ? `${estado.distancia} cm` : '-- cm'}
                </div>
                <div className="distancia-label">Distância detectada</div>
              </div>
              
              <div className={`carro-indicator ${estado.carroPresente ? 'presente' : 'ausente'}`} style={{ opacity: estado.iotConectado ? 1 : 0.5 }}>
                <div className="carro-icon">
                  {estado.carroPresente ? '🚗' : '🚫'}
                </div>
                <div className="carro-texto">
                  {estado.carroPresente ? 'Carro Detectado' : 'Nenhum Carro'}
                </div>
                {estado.carroPresente && (
                  <div className="carro-detalhe">
                    Distância: {estado.distancia} cm (limiar: 20 cm)
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Sensor LDR (Luminosidade)</h2>
            {!estado.iotConectado && (
              <p style={{ 
                color: '#2D253F', 
                textAlign: 'center', 
                marginBottom: '15px',
                fontStyle: 'italic'
              }}>
                Valor padrão - Aguardando dados do dispositivo
              </p>
            )}
            <div className="ldr-info">
              <div className="ldr-valor" style={{ opacity: estado.iotConectado ? 1 : 0.5 }}>
                {estado.ldrValor}
              </div>
              <div className="ldr-bar">
                <div 
                  className="ldr-fill" 
                  style={{ 
                    width: `${Math.min((estado.ldrValor / 4095) * 100, 100)}%`,
                    opacity: estado.iotConectado ? 1 : 0.5
                  }}
                ></div>
              </div>
              <p className="ldr-descricao" style={{ opacity: estado.iotConectado ? 1 : 0.5 }}>
                {estado.ldrValor < 2000 ? '🌙 Ambiente escuro (modo noturno)' : '☀️ Ambiente claro (modo diário)'}
              </p>
            </div>
          </div>

          {estado.ultimaAtualizacao && (
            <div className="card info">
              <p className="ultima-atualizacao">
                Última atualização: {new Date(estado.ultimaAtualizacao).toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

