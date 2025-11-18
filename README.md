# Semáforo Inteligente - Smart City IoT

**Projeto de Inteligência Artificial e IoT para Controle de Tráfego em Smart City**

---

##  Visão Geral

Este projeto implementa um **Semáforo Inteligente** que faz parte de uma proposta de Smart City, onde semáforos não apenas controlam o tráfego, mas também percebem o ambiente, se adaptam automaticamente e podem ser controlados online.

Nosso grupo desenvolveu **dois semáforos físicos** conectados a um único **ESP32**, utilizando:
- **Sensor LDR** para detectar luminosidade e alternar para modo noturno
- **Sensor Ultrassônico** para detectar presença de veículos
- **Comunicação MQTT** com broker HiveMQ para controle remoto
- **Interface Web** para visualização e controle em tempo real

O sistema envia e recebe dados via **MQTT**, permitindo alteração remota dos parâmetros de funcionamento através da plataforma desenvolvida.

---

##  Objetivos do Projeto

- Montar dois semáforos físicos com LEDs (vermelho, amarelo, verde)
- Integrar sensor LDR ao ESP32 para detectar luminosidade
- Integrar sensor ultrassônico para detectar presença de veículos
- Criar uma interface online para visualizar dados e controlar via MQTT
- Demonstrar o projeto completo em vídeo
- Implementar lógica inteligente simulando cruzamento real:
   - Semáforo 1 tem auxílio dos sensores, ficando verde quando o LDR identifica a luz do carro e aumentando o tempo de permanencia do verde quando a presença de carro é detectada pelo sensor ultrassônico
   - Semáforo 2 comportamento contrário do semáforo 1
   - Em modo noturno, ambos piscam amarelo como alerta
   - Tempo de verde aumenta em +3 segundos quando carro é detectado

---

## Componentes Utilizados

| Componente | Quantidade 
| :--- | :--- 
| **ESP32**| 1 |
| **LEDs Vermelhos** | 2 | 
| **LEDs Amarelos** | 2 | 
| **LEDs Verdes** | 2 | 
| **Sensor LDR** | 1 | 
| **Sensor Ultrassônico** | 1 | 
| **Resistor 1kΩ** | 1 | 
| **Protoboard** | 1 | 
| **Fios Jumper** | diversos | 
| **Cabo USB** | 1 | 
---

## Esquema de Ligação

### Mapeamento de Pinos ESP32

**Semáforo 1:**
| LED | Cor | Pino ESP32 |
| :--- | :--- | :--- | 
| LED 1 | Vermelho | GPIO 2 | 
| LED 2 | Amarelo | GPIO 5 | 
| LED 3 | Verde | GPIO 18 | 

**Semáforo 2:**
| LED | Cor | Pino ESP32 | 
| :--- | :--- | :--- | 
| LED 4 | Vermelho | GPIO 17 | 
| LED 5 | Amarelo | GPIO 4 | 
| LED 6 | Verde | GPIO 16 | 

**Sensores:**
| Sensor | Pino ESP32 | Tipo|
| :--- | :--- | :--- |
| **LDR** | GPIO 34 | Entrada Analógica (ADC) |
| **Ultrassônico TRIG** | GPIO 22 | Saída Digital |
| **Ultrassônico ECHO** | GPIO 21 | Entrada Digital |


---

## Parte 1: Montagem Física e Programação

### Semáforos

Cada semáforo foi construído com **três LEDs** (vermelho, amarelo e verde) em um padrão de semáforo real.

**Lógica implementada (Modo Normal):**

1. **Fase 1:** Semáforo 1 VERDE (5s) + Semáforo 2 VERMELHO
2. **Fase 2:** Semáforo 1 AMARELO (2s) + Semáforo 2 VERMELHO
3. **Fase 3:** Transição - Ambos VERMELHO (1s)
4. **Fase 4:** Semáforo 1 VERMELHO + Semáforo 2 VERDE (5s)
5. **Fase 5:** Semáforo 1 VERMELHO + Semáforo 2 AMARELO (2s)
6. **Fase 6:** Transição - Ambos VERMELHO (1s)
7. **Retorna à Fase 1**

**Características:**
- Alternância sincronizada entre os dois semáforos
- Garantia de segurança com fase de transição (ambos vermelhos)
- Ciclo contínuo e previsível

### Sensor LDR (Light Dependent Resistor)

O sensor LDR foi conectado ao **ADC (Conversor Analógico-Digital)** do ESP32 para medir a luminosidade ambiente.

**Funcionalidades:**
- Detecta variação de luz simulando passagem de veículos
- Ativa automaticamente o **Modo Noturno** quando luminosidade cai abaixo do limiar
- Envia o valor continuamente via **MQTT** para visualização na interface
- Usa **histerese** (HIS = 50) para evitar oscilações entre dia/noite

**Configuração:**
```cpp
const int LDR_PIN = 34;           // Pino analógico
const int LIMIAR_LDR = 400;       // Limiar de luminosidade
const int HIS = 50;               // Histerese para evitar oscilações
```

### Sensor Ultrassônico (HC-SR04)

O sensor ultrassônico detecta a presença de veículos próximos ao semáforo 1.

**Funcionalidades:**
- Mede distância em tempo real
- Detecta presença de carro quando distância < 20cm
- **Aumenta o tempo de verde em +3 segundos** quando carro é detectado
- Envia dados via MQTT para monitoramento

**Configuração:**
```cpp
const int TRIG_PIN = 22;          // Pino de disparo
const int ECHO_PIN = 21;          // Pino de eco
const int DISTANCIA_LIMIAR = 20;  // Menos que 20cm = carro presente
const int TEMPO_EXTENSAO = 3000;  // Aumenta verde em +3s
```

**Fórmula de Cálculo de Distância:**
```
Distância (cm) = (Duração × 0.034) / 2
```

### Modo Noturno

Quando a luminosidade fica **abaixo do limiar estabelecido** (LIMIAR_LDR - HIS), o sistema ativa o **Modo Noturno**.

**Comportamento implementado:**
-  **Pisca-amarelo simultâneo** nos dois semáforos
-  Independente da presença de veículos
-  Intervalo de pisca: 500ms ligado + 500ms desligado
-  Modo também pode ser **ativado manualmente via MQTT**
-  Todos os outros LEDs (vermelho e verde) ficam desligados

**Transição Suave:**
- Quando sai do Modo Noturno, o sistema reinicializa para **VERDE_1**
- Não há estado intermediário problemático
- Transição ocorre sem piscar ou comportamento errado

---

## Parte 2: Interface Online

A interface desenvolvida permite **visualização em tempo real** e **controle remoto** do semáforo via MQTT.

### Funcionalidades da Interface

- **Visualizar valor do LDR em tempo real** com gráfico de progresso
- **Ativar e desativar manualmente o Modo Noturno**
- **Acompanhar o estado atual** dos LEDs
- **Status de conexão MQTT** (Conectado/Desconectado)
- **Publicar comandos MQTT** e ler status em tempo real
- **Mostrar valores medidos pelo sensor ultrassônico** e se há a presença de veículo


#### Tópicos Publicados (ESP32 → Interface)

| Tópico | Conteúdo | Exemplo |
| :--- | :--- | :--- |
| `semaforo/01/ldr/valor` | Valor numérico do LDR | `1250` |
| `semaforo/01/ldr/status` | Status do LDR | `DIA` ou `NOITE` |
| `semaforo/01/modo` | Modo atual do sistema | `DIA` ou `NOITE` |
| `semaforo/01/estado` | Estado do semáforo | `VERDE_1`, `AMARELO_1`, etc. |
| `semaforo/01/ultrassonico/valor` | Distância em cm | `15` |

#### Tópicos Subscritos (Interface → ESP32)

| Tópico | Conteúdo | Exemplo |
| :--- | :--- | :--- |
| `semaforo/01/comando/modo` | Comando de modo | `NOITE` ou `DIA` |
| `semaforo/01/comando/tempo` | Tempos do semáforo | `5000,2000,5000` |


### Link da Interface

A interface está hospedada e pode ser acessada em:
**[https://github.com/Carolmpaz/semaforo-inteligente]**

Ou use o cliente web do HiveMQ para testar:
**https://www.hivemq.com/demos/websocket-client/**



## Configuração Técnica

### Configurações Ajustáveis

```cpp
// Tempos do semáforo (em milissegundos)
int TEMPO_VERDE = 5000;       // 5 segundos
int TEMPO_AMARELO = 2000;     // 2 segundos
int TEMPO_TROCA = 1000;       // 1 segundo (transição segura)

// Configuração do LDR
int LIMIAR_LDR = 400;         // Limiar de luminosidade
int HIS = 50;                 // Histerese (evita oscilações)

// Configuração do Ultrassônico
int DISTANCIA_LIMIAR = 20;    // Menos que 20cm = carro presente
int TEMPO_EXTENSAO = 3000;    // Aumenta verde em +3s

// Modo Noturno
int TEMPO_PISCA_NOITE = 500;  // 500ms ligado/desligado
```

### Intervalos de Atualização

```cpp
const int INTERVALO_LDR = 1000;        // Lê LDR a cada 1 segundo
const int INTERVALO_MQTT = 2000;       // Publica MQTT a cada 2 segundos
const int INTERVALO_ULTRASSOM = 500;   // Lê ultrassônico a cada 500ms
```

---

## Vídeo de Demonstração

O vídeo demonstra:
- Montagem física dos semáforos
- Funcionamento dos dois semáforos em ciclo normal
- Leitura do sensor LDR em tempo real
- Ativação automática do Modo Noturno
- Detecção de veículos pelo sensor ultrassônico
- Aumento de tempo de verde quando carro detectado

**Link do Vídeo:** [https://youtube.com/shorts/lNJbZbZ41xE?si=W_ZxnjFM8wISfFKV]

---

## Integrantes do Grupo e Contribuições

| Membro | Contribuição |
| :--- | :--- |
| **Ana Júlia** | **Código** - Desenvolveu toda a lógica dos semáforos, incluindo o modo normal e o modo noturno. Implementou a comunicação MQTT e a integração com os sensores. |
| **Caroline** |  **Dashboard** - Desenvolveu a interface web para controle remoto. Implementou a conexão entre o circuito e a plataforma online via MQTT. Criou a visualização em tempo real dos dados. |
| **Lucas** |  **Montagem** - Contribuiu com parte da montagem física e parte da documentação final. Adicionou os detalhes de funcionamento do circuito e suas funcionalidades. |
| **Mariana** |  **Montagem e Documentação** - Desenvolveu parte da montagem física e a base da documentação. Estruturou e organizou os entregáveis do projeto. |
| **Nicole** |  **Código e Documentação** - Adicionou funções cruciais do código para a lógica de modo noturno e diurno. Ajudou na documentação. |
| **Paulo Victor** |  **Montagem e Vídeo** - Ajudou na montagem do protótipo. Ajudou no roteiro do vídeo e demosntração. |
| **Sofia** |  **Documentação** - Contribuiu com documentação técnica e base para README, sendo essencial para a demonstração da atividade de forma didática. |

---

## Conclusão

O projeto **Semáforo Inteligente** demonstra com sucesso a implementação de um sistema IoT funcional para Smart City. A integração de múltiplos sensores, comunicação MQTT e interface web criou uma solução prática e escalável para controle de tráfego inteligente.

---

