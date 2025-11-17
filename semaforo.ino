#include <WiFi.h>
#include <PubSubClient.h>

// ================= WIFI ===================
const char* ssid = "iPhone de Ana Julia";
const char* password = "anajuliaa";

// ================= MQTT ===================
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

const char* topic_ldr_valor = "semaforo/01/ldr/valor";
const char* topic_ultrassonico_valor = "semaforo/01/ultrassonico/valor";
const char* topic_modo = "semaforo/01/modo";
const char* topic_comando_modo = "semaforo/01/comando/modo";
const char* topic_estado = "semaforo/01/estado"; // NOVO: para publicar estado do semáforo

WiFiClient espClient;
PubSubClient client(espClient);

// ================= PINOS ===================
const int LED_VERMELHO_1 = 2;
const int LED_AMARELO_1  = 4;
const int LED_VERDE_1    = 16;

const int LED_VERMELHO_2 = 17;
const int LED_AMARELO_2  = 5;
const int LED_VERDE_2    = 18;

const int LDR_PIN = 34;

// Ultrassônico
const int TRIG_PIN = 22;
const int ECHO_PIN = 21;

// ================= CONFIG ===================
int TEMPO_VERDE = 5000;
int TEMPO_AMARELO = 2000;
int TEMPO_TROCA = 1000;

int LIMIAR_LDR = 400;
int HIS = 50;

int TEMPO_PISCA_NOITE = 500;

// Ultrassônico
int DISTANCIA_LIMIAR = 20;  // Menos que 20 cm = carro presente
int TEMPO_EXTENSAO = 3000;  // Aumenta o verde em +3s

bool carroPresente = false;

// ================= FLAGS ===================
bool modoNoturnoAtivo = false;
bool modoNoturnoForcado = false;

// ================= TIMERS ===================
unsigned long agora;
unsigned long timerLDR = 0;
unsigned long timerMQTT = 0;
unsigned long timerSemaforo = 0;
unsigned long timerPisca = 0;
unsigned long timerUltrassom = 0; // NOVO: timer para ultrassônico

const int INTERVALO_LDR = 1000;
const int INTERVALO_MQTT = 2000;
const int INTERVALO_ULTRASSOM = 500; // Publicar a cada 500ms

// ================= ESTADOS ===================
enum Estado {
  VERDE_1,
  AMARELO_1,
  TROCA_1,
  VERDE_2,
  AMARELO_2,
  TROCA_2
};

Estado estadoAtual = VERDE_1;
Estado estadoAnterior = VERDE_1; // NOVO: para detectar mudanças

// ==========================================================
// ======================= PROTÓTIPOS ========================
// ==========================================================
void publicarMQTT();
void lerLDR();
void lerUltrassom();
void modoNoturno();
void cicloSemaforo();
void publicarEstado(); // NOVO: função para publicar estado

// ==========================================================
// ======================= SETUP ============================
// ==========================================================
void setup() {
  Serial.begin(115200);

  pinMode(LED_VERMELHO_1, OUTPUT);
  pinMode(LED_AMARELO_1, OUTPUT);
  pinMode(LED_VERDE_1, OUTPUT);

  pinMode(LED_VERMELHO_2, OUTPUT);
  pinMode(LED_AMARELO_2, OUTPUT);
  pinMode(LED_VERDE_2, OUTPUT);

  pinMode(LDR_PIN, INPUT);

  // Ultrassônico
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
  }

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  // Publicar estado inicial
  publicarEstado();
}

// ======================= MQTT =============================
void reconectarMQTT() {
  while (!client.connected()) {
    if (client.connect("semaforo01")) {
      client.subscribe(topic_comando_modo);
      // Publicar estado ao reconectar
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

// ==========================================================
// ======================= LOOP =============================
// ==========================================================
void loop() {
  agora = millis();

  if (!client.connected()) reconectarMQTT();
  client.loop();

  lerLDR();
  lerUltrassom();
  publicarMQTT();

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

// ==========================================================
// ===================== LEITURA LDR ========================
// ==========================================================
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

// ==========================================================
// =================== LEITURA ULTRASSOM ====================
// ==========================================================
void lerUltrassom() {
  // Sempre ler o sensor
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duracao = pulseIn(ECHO_PIN, HIGH, 30000); // Timeout de 30ms
  
  int distancia = 0;
  if (duracao > 0) {
    distancia = duracao * 0.034 / 2;
  }

  carroPresente = (distancia > 0 && distancia < DISTANCIA_LIMIAR);

  Serial.print("Distância: ");
  Serial.print(distancia);
  Serial.print(" cm | Carro detectado: ");
  Serial.println(carroPresente ? "SIM" : "NÃO");

  // Publicar apenas a cada INTERVALO_ULTRASSOM
  if (agora - timerUltrassom >= INTERVALO_ULTRASSOM) {
    timerUltrassom = agora;
    
    if (client.connected()) {
      char buffer[10];
      snprintf(buffer, sizeof(buffer), "%d", distancia);
      client.publish(topic_ultrassonico_valor, buffer);
      Serial.println("✅ Ultrassônico publicado via MQTT");
    }
  }
}

// ==========================================================
// ====================== MQTT OUT ==========================
// ==========================================================
void publicarMQTT() {
  if (agora - timerMQTT >= INTERVALO_MQTT) {
    timerMQTT = agora;
  }
}

// ==========================================================
// ==================== PUBLICAR ESTADO =====================
// ==========================================================
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

// ==========================================================
// ==================== MODO NOTURNO ========================
// ==========================================================
void modoNoturno() {
  if (agora - timerPisca >= TEMPO_PISCA_NOITE) {
    timerPisca = agora;

    int estado = digitalRead(LED_AMARELO_1) == LOW;

    digitalWrite(LED_AMARELO_1, estado);
    digitalWrite(LED_AMARELO_2, estado);

    digitalWrite(LED_VERDE_1, LOW);
    digitalWrite(LED_VERMELHO_1, LOW);
    digitalWrite(LED_VERDE_2, LOW);
    digitalWrite(LED_VERMELHO_2, LOW);
  }
}

// ==========================================================
// ================= SEMÁFORO NORMAL ========================
// ==========================================================
void cicloSemaforo() {
  switch (estadoAtual) {
    case VERDE_1:
      digitalWrite(LED_VERDE_1, HIGH);
      digitalWrite(LED_VERMELHO_2, HIGH);
      digitalWrite(LED_AMARELO_1, LOW);
      digitalWrite(LED_VERMELHO_1, LOW);
      digitalWrite(LED_VERDE_2, LOW);
      digitalWrite(LED_AMARELO_2, LOW);

      if (carroPresente) {
        if (agora - timerSemaforo >= TEMPO_VERDE + TEMPO_EXTENSAO) {
          timerSemaforo = agora;
          digitalWrite(LED_VERDE_1, LOW);
          estadoAtual = AMARELO_1;
        }
      } else {
        if (agora - timerSemaforo >= TEMPO_VERDE) {
          timerSemaforo = agora;
          digitalWrite(LED_VERDE_1, LOW);
          estadoAtual = AMARELO_1;
        }
      }
      break;

    case AMARELO_1:
      digitalWrite(LED_AMARELO_1, HIGH);
      digitalWrite(LED_VERMELHO_2, HIGH);
      digitalWrite(LED_VERDE_1, LOW);
      digitalWrite(LED_VERMELHO_1, LOW);
      digitalWrite(LED_VERDE_2, LOW);
      digitalWrite(LED_AMARELO_2, LOW);
      
      if (agora - timerSemaforo >= TEMPO_AMARELO) {
        timerSemaforo = agora;
        digitalWrite(LED_AMARELO_1, LOW);
        digitalWrite(LED_VERMELHO_1, HIGH);
        estadoAtual = TROCA_1;
      }
      break;

    case TROCA_1:
      digitalWrite(LED_VERMELHO_1, HIGH);
      digitalWrite(LED_VERMELHO_2, HIGH);
      digitalWrite(LED_VERDE_1, LOW);
      digitalWrite(LED_AMARELO_1, LOW);
      digitalWrite(LED_VERDE_2, LOW);
      digitalWrite(LED_AMARELO_2, LOW);
      
      if (agora - timerSemaforo >= TEMPO_TROCA) {
        timerSemaforo = agora;
        digitalWrite(LED_VERMELHO_2, LOW);
        digitalWrite(LED_VERDE_2, HIGH);
        estadoAtual = VERDE_2;
      }
      break;

    case VERDE_2:
      digitalWrite(LED_VERMELHO_1, HIGH);
      digitalWrite(LED_VERDE_2, HIGH);
      digitalWrite(LED_VERDE_1, LOW);
      digitalWrite(LED_AMARELO_1, LOW);
      digitalWrite(LED_VERMELHO_2, LOW);
      digitalWrite(LED_AMARELO_2, LOW);
      
      if (agora - timerSemaforo >= TEMPO_VERDE) {
        timerSemaforo = agora;
        digitalWrite(LED_VERDE_2, LOW);
        estadoAtual = AMARELO_2;
      }
      break;

    case AMARELO_2:
      digitalWrite(LED_VERMELHO_1, HIGH);
      digitalWrite(LED_AMARELO_2, HIGH);
      digitalWrite(LED_VERDE_1, LOW);
      digitalWrite(LED_AMARELO_1, LOW);
      digitalWrite(LED_VERDE_2, LOW);
      digitalWrite(LED_VERMELHO_2, LOW);
      
      if (agora - timerSemaforo >= TEMPO_AMARELO) {
        timerSemaforo = agora;
        digitalWrite(LED_AMARELO_2, LOW);
        digitalWrite(LED_VERMELHO_2, HIGH);
        estadoAtual = TROCA_2;
      }
      break;

    case TROCA_2:
      digitalWrite(LED_VERMELHO_1, HIGH);
      digitalWrite(LED_VERMELHO_2, HIGH);
      digitalWrite(LED_VERDE_1, LOW);
      digitalWrite(LED_AMARELO_1, LOW);
      digitalWrite(LED_VERDE_2, LOW);
      digitalWrite(LED_AMARELO_2, LOW);
      
      if (agora - timerSemaforo >= TEMPO_TROCA) {
        timerSemaforo = agora;
        digitalWrite(LED_VERMELHO_1, LOW);
        estadoAtual = VERDE_1;
      }
      break;
  }
}