#include <WiFi.h>
#include <PubSubClient.h>

// WIFI
const char* ssid = "iPhone de Ana Julia";
const char* password = "anajuliaa";

// MQTT
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

const char* topic_ldr_valor = "semaforo/01/ldr/valor";
const char* topic_ultrassonico_valor = "semaforo/01/ultrassonico/valor";
const char* topic_modo = "semaforo/01/modo";
const char* topic_comando_modo = "semaforo/01/comando/modo";
const char* topic_estado = "semaforo/01/estado";

WiFiClient espClient;
PubSubClient client(espClient);

// PINOS
const int LED_VERMELHO_2 = 17;
const int LED_AMARELO_2  = 4;
const int LED_VERDE_2    = 16;

const int LED_VERMELHO_1 = 2;
const int LED_AMARELO_1  = 5;
const int LED_VERDE_1    = 18;

// LDR 
const int LDR_PIN = 34;

// Ultrassônico
const int TRIG_PIN = 22;
const int ECHO_PIN = 21;

// CONFIG 
int TEMPO_VERDE = 5000;
int TEMPO_AMARELO = 2000;
int TEMPO_TROCA = 1000;

int LIMIAR_LDR = 400;
int HIS = 50;

int TEMPO_PISCA_NOITE = 500;

// Ultrassônico
int DISTANCIA_LIMIAR = 20;  // Indica presença de carro a 20cm de distãncia 
int TEMPO_EXTENSAO = 3000;  // Aumenta o verde em +3s

bool carroPresente = false;

// FLAGS
bool modoNoturnoAtivo = false;
bool modoNoturnoForcado = false;
bool modoNoturnoAnterior = false;

// TIMERS
unsigned long agora;
unsigned long timerLDR = 0;
unsigned long timerMQTT = 0;
unsigned long timerSemaforo = 0;
unsigned long timerPisca = 0;
unsigned long timerUltrassom = 0;

const int INTERVALO_LDR = 1000;
const int INTERVALO_MQTT = 2000;
const int INTERVALO_ULTRASSOM = 500;

// ESTADOS 
enum Estado {
  VERDE_1,
  AMARELO_1,
  TROCA_1,
  VERDE_2,
  AMARELO_2,
  TROCA_2
};

Estado estadoAtual = VERDE_1;
Estado estadoAnterior = VERDE_1;

// PROTÓTIPOS
void publicarMQTT();
void lerLDR();
void lerUltrassom();
void modoNoturno();
void cicloSemaforo();
void publicarEstado();
void desligarTodosLEDs();

void setup() {
  Serial.begin(115200);

  pinMode(LED_VERMELHO_1, OUTPUT);
  pinMode(LED_AMARELO_1, OUTPUT);
  pinMode(LED_VERDE_1, OUTPUT);

  pinMode(LED_VERMELHO_2, OUTPUT);
  pinMode(LED_AMARELO_2, OUTPUT);
  pinMode(LED_VERDE_2, OUTPUT);

  // Desligar todos os LEDs inicialmente
  desligarTodosLEDs();

  // Espera estabilizar
  delay(300);

  // Agora define o estado inicial REAL
  estadoAtual = VERDE_1;
  estadoAnterior = VERDE_1;
  timerSemaforo = millis();

  pinMode(LDR_PIN, INPUT);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
  }

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  publicarEstado();
  Serial.println("Sistema iniciado - Modo Dia");
}


// MQTT
void reconectarMQTT() {
  while (!client.connected()) {
    if (client.connect("semaforo01")) {
      client.subscribe(topic_comando_modo);
      publicarEstado();
    } else {
      delay(2000);
    }
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (int i = 0; i < length; i++) msg += (char)payload[i];

  if (String(topic) == topic_comando_modo) {
    if (msg == "NOITE") {
      modoNoturnoForcado = true;
      modoNoturnoAtivo = true;
      client.publish(topic_modo, "NOITE");
    } else {
      modoNoturnoForcado = false;
      modoNoturnoAtivo = false;
      client.publish(topic_modo, "DIA");
    }
  }
}


void loop() {
  agora = millis();

  if (!client.connected()) reconectarMQTT();
  client.loop();

  lerLDR();
  lerUltrassom();
  publicarMQTT();

  // DETECTAR MUDANÇA DE MODO
  if (modoNoturnoAtivo != modoNoturnoAnterior) {
    modoNoturnoAnterior = modoNoturnoAtivo;
    
    if (!modoNoturnoAtivo) {
      // SAINDO DO MODO NOTURNO
      // Reinicializar timer e estado
      timerSemaforo = agora;
      estadoAtual = VERDE_1;
      estadoAnterior = VERDE_1;
      
      publicarEstado();
      Serial.println("Modo diário ativado - retornando ao ciclo normal");
      
    } else {
      // ENTRANDO NO MODO NOTURNO
      // Desligar todos os LEDs (exceto os amarelos que vão piscar)
      desligarTodosLEDs();
      timerPisca = agora;
      Serial.println("Modo noturno ativado - piscando amarelo");
    }
  }

  // EXECUTAR LÓGICA DO SEMÁFORO 
  if (modoNoturnoAtivo) {
    modoNoturno();
  } else {
    cicloSemaforo();
  }
  
  // Publicar estado se mudou
  if (estadoAtual != estadoAnterior) {
    publicarEstado();
    estadoAnterior = estadoAtual;
  }
}

// Leitura LDR 
void lerLDR() {
  if (agora - timerLDR >= INTERVALO_LDR) {
    timerLDR = agora;

    int leitura = analogRead(LDR_PIN);
    Serial.print("LDR = ");
    Serial.println(leitura);

    if (!modoNoturnoForcado) {
      if (leitura < (LIMIAR_LDR - HIS) && !modoNoturnoAtivo) {
        modoNoturnoAtivo = true;
        client.publish(topic_modo, "NOITE");
      }
      else if (leitura > (LIMIAR_LDR + HIS) && modoNoturnoAtivo) {
        modoNoturnoAtivo = false;
        client.publish(topic_modo, "DIA");
      }
    }

    char buffer[10];
    snprintf(buffer, sizeof(buffer), "%d", leitura);
    client.publish(topic_ldr_valor, buffer);
  }
}

// Leitura Ultrassônico 
void lerUltrassom() {
  // Sempre ler o sensor
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duracao = pulseIn(ECHO_PIN, HIGH, 30000);
  
  int distancia = 0;
  if (duracao > 0) {
    distancia = duracao * 0.034 / 2;
  }

  carroPresente = (distancia > 0 && distancia < DISTANCIA_LIMIAR);

  Serial.print("Distância: ");
  Serial.print(distancia);
  Serial.print(" cm | Carro detectado: ");
  Serial.println(carroPresente ? "SIM" : "NÃO");

  if (agora - timerUltrassom >= INTERVALO_ULTRASSOM) {
    timerUltrassom = agora;
    
    if (client.connected()) {
      char buffer[10];
      snprintf(buffer, sizeof(buffer), "%d", distancia);
      client.publish(topic_ultrassonico_valor, buffer);
      Serial.println("Ultrassônico publicado via MQTT");
    }
  }
}

// MQTT OUT
void publicarMQTT() {
  if (agora - timerMQTT >= INTERVALO_MQTT) {
    timerMQTT = agora;
  }
}

// PUBLICAR ESTADO 
void publicarEstado() {
  if (!client.connected()) return;
  
  const char* estadoStr;
  switch(estadoAtual) {
    case VERDE_1: estadoStr = "VERDE_1"; break;
    case AMARELO_1: estadoStr = "AMARELO_1"; break;
    case TROCA_1: estadoStr = "TROCA_1"; break;
    case VERDE_2: estadoStr = "VERDE_2"; break;
    case AMARELO_2: estadoStr = "AMARELO_2"; break;
    case TROCA_2: estadoStr = "TROCA_2"; break;
    default: estadoStr = "UNKNOWN"; break;
  }
  client.publish(topic_estado, estadoStr);
  Serial.print("📤 Estado publicado: ");
  Serial.println(estadoStr);
}

void desligarTodosLEDs() {
  digitalWrite(LED_VERMELHO_1, LOW);
  digitalWrite(LED_AMARELO_1, LOW);
  digitalWrite(LED_VERDE_1, LOW);
  digitalWrite(LED_VERMELHO_2, LOW);
  digitalWrite(LED_AMARELO_2, LOW);
  digitalWrite(LED_VERDE_2, LOW);
}

// MODO NOTURNO 
void modoNoturno() {
  if (agora - timerPisca >= TEMPO_PISCA_NOITE) {
    timerPisca = agora;

    int estado = digitalRead(LED_AMARELO_1) == LOW;

    digitalWrite(LED_AMARELO_1, estado);
    digitalWrite(LED_AMARELO_2, estado);

    // Garantir que outros LEDs estão desligados
    digitalWrite(LED_VERDE_1, LOW);
    digitalWrite(LED_VERMELHO_1, LOW);
    digitalWrite(LED_VERDE_2, LOW);
    digitalWrite(LED_VERMELHO_2, LOW);
  }
}

// SEMÁFORO NORMAL 
void cicloSemaforo() {
  switch (estadoAtual) {
    case VERDE_1:
      // PRIMEIRO: Desligar TODOS os LEDs
      desligarTodosLEDs();
      
      // DEPOIS: Ligar apenas os LEDs corretos
      digitalWrite(LED_VERDE_1, HIGH);      
      digitalWrite(LED_VERMELHO_2, HIGH);  

      if (carroPresente) {
        if (agora - timerSemaforo >= TEMPO_VERDE + TEMPO_EXTENSAO) {
          timerSemaforo = agora;
          estadoAtual = AMARELO_1;
        }
      } else {
        if (agora - timerSemaforo >= TEMPO_VERDE) {
          timerSemaforo = agora;
          estadoAtual = AMARELO_1;
        }
      }
      break;

    case AMARELO_1:
      // PRIMEIRO: Desligar TODOS os LEDs
      desligarTodosLEDs();
      
      // DEPOIS: Ligar apenas os LEDs corretos
      digitalWrite(LED_AMARELO_1, HIGH);    
      digitalWrite(LED_VERMELHO_2, LOW);   
      
      if (agora - timerSemaforo >= TEMPO_AMARELO) {
        timerSemaforo = agora;
        estadoAtual = TROCA_1;
      }
      break;

    case TROCA_1:
      // PRIMEIRO: Desligar TODOS os LEDs
      desligarTodosLEDs();
      
      // DEPOIS: Ligar apenas os LEDs corretos
      digitalWrite(LED_VERMELHO_1, HIGH);   
      digitalWrite(LED_VERMELHO_2, HIGH);   
      
      if (agora - timerSemaforo >= TEMPO_TROCA) {
        timerSemaforo = agora;
        estadoAtual = VERDE_2;
      }
      break;

    case VERDE_2:
      // PRIMEIRO: Desligar TODOS os LEDs
      desligarTodosLEDs();
      
      // DEPOIS: Ligar apenas os LEDs corretos
      digitalWrite(LED_VERMELHO_1, HIGH);   
      digitalWrite(LED_VERDE_2, HIGH);      
      
      if (agora - timerSemaforo >= TEMPO_VERDE) {
        timerSemaforo = agora;
        estadoAtual = AMARELO_2;
      }
      break;

    case AMARELO_2:
      // PRIMEIRO: Desligar TODOS os LEDs
      desligarTodosLEDs();
      
      // DEPOIS: Ligar apenas os LEDs corretos
      digitalWrite(LED_VERMELHO_1, HIGH);   
      digitalWrite(LED_AMARELO_2, LOW);    
      
      if (agora - timerSemaforo >= TEMPO_AMARELO) {
        timerSemaforo = agora;
        estadoAtual = TROCA_2;
      }
      break;

    case TROCA_2:
      // PRIMEIRO: Desligar TODOS os LEDs
      desligarTodosLEDs();
      
      // DEPOIS: Ligar apenas os LEDs corretos
      digitalWrite(LED_VERMELHO_1, HIGH);   
      digitalWrite(LED_VERMELHO_2, HIGH);
      
      if (agora - timerSemaforo >= TEMPO_TROCA) {
        timerSemaforo = agora;
        estadoAtual = VERDE_1;
      }
      break;
  }
}
