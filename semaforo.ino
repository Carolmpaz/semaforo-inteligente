#include <WiFi.h>
#include <PubSubClient.h>

// ================= WIFI ===================
const char* ssid = "iPhone de Ana Julia";
const char* password = "anajuliaa";

// ================= MQTT ===================
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

const char* topic_ldr_valor = "semaforo/01/ldr/valor";
const char* topic_modo = "semaforo/01/modo";
const char* topic_comando_modo = "semaforo/01/comando/modo";

WiFiClient espClient;
PubSubClient client(espClient);

// ================= PINOS ===================
const int LED_VERMELHO_1 = 2;
const int LED_AMARELO_1 = 4;
const int LED_VERDE_1 = 16;

const int LED_VERMELHO_2 = 17;
const int LED_AMARELO_2 = 5;
const int LED_VERDE_2 = 18;

const int LDR_PIN = 34;

// ================= CONFIG ===================
int TEMPO_VERDE = 5000;
int TEMPO_AMARELO = 2000;
int TEMPO_TROCA = 1000;

// LDR como sensor de luz ambiente
int LIMIAR_LDR = 800;   
int HIS = 50;   

int TEMPO_PISCA_NOITE = 500;

// ================= FLAGS ===================
bool modoNoturnoAtivo = false;
bool modoNoturnoForcado = false;

// ================= TIMERS ===================
unsigned long agora;
unsigned long timerLDR = 0;
unsigned long timerMQTT = 0;
unsigned long timerSemaforo = 0;
unsigned long timerPisca = 0;

const int INTERVALO_LDR = 1000;
const int INTERVALO_MQTT = 2000;

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

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
  }

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

// MQTT 
void reconectarMQTT() {
  while (!client.connected()) {
    if (client.connect("semaforo01")) {
      client.subscribe(topic_comando_modo);
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
      modoNoturnoAtivo   = true;
      client.publish(topic_modo, "NOITE");
    } else {
      modoNoturnoForcado = false;
      modoNoturnoAtivo   = false;
      client.publish(topic_modo, "DIA");
    }
  }
}

void loop() {
  agora = millis();

  if (!client.connected()) reconectarMQTT();
  client.loop();

  lerLDR();
  publicarMQTT();

  if (modoNoturnoAtivo) {
    modoNoturno();
  } else {
    cicloSemaforo();
  }
}
//LEITURA LDR
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

// MQTT OUT
void publicarMQTT() {
  if (agora - timerMQTT >= INTERVALO_MQTT) {
    timerMQTT = agora;
  }
}

// MODO NOTURNO 
void modoNoturno() {
  //Serial.println("[MODO NOTURNO]");

  if (agora - timerPisca >= TEMPO_PISCA_NOITE) {
    timerPisca = agora;

    int estadoPisca = digitalRead(LED_AMARELO_1) == LOW;

    // Pisca amarelo nos dois cruzamentos
    digitalWrite(LED_AMARELO_1, estadoPisca);
    digitalWrite(LED_AMARELO_2, estadoPisca);

    // Desliga verde/vermelho
    digitalWrite(LED_VERDE_1, LOW);
    digitalWrite(LED_VERMELHO_1, LOW);
    digitalWrite(LED_VERDE_2, LOW);
    digitalWrite(LED_VERMELHO_2, LOW);
  }
}

// SEMÁFORO NORMAL
void cicloSemaforo() {
  Serial.println("[MODO DIA]");

  // Garante amarelos do noturno desligados
  digitalWrite(LED_AMARELO_1, LOW);
  digitalWrite(LED_AMARELO_2, LOW);

  switch (estadoAtual) {

    case VERDE_1:
      digitalWrite(LED_VERMELHO_1, LOW);
      digitalWrite(LED_VERDE_1, HIGH);
      digitalWrite(LED_VERMELHO_2, HIGH);

      if (agora - timerSemaforo >= TEMPO_VERDE) {
        timerSemaforo = agora;
        digitalWrite(LED_VERDE_1, LOW);
        estadoAtual = AMARELO_1;
      }
      break;

    case AMARELO_1:
      digitalWrite(LED_AMARELO_1, HIGH);
      if (agora - timerSemaforo >= TEMPO_AMARELO) {
        timerSemaforo = agora;
        digitalWrite(LED_AMARELO_1, LOW);
        digitalWrite(LED_VERMELHO_1, HIGH);
        estadoAtual = TROCA_1;
      }
      break;

    case TROCA_1:
      if (agora - timerSemaforo >= TEMPO_TROCA) {
        timerSemaforo = agora;
        digitalWrite(LED_VERMELHO_2, LOW);
        digitalWrite(LED_VERDE_2, HIGH);
        estadoAtual = VERDE_2;
      }
      break;

    case VERDE_2:
      if (agora - timerSemaforo >= TEMPO_VERDE) {
        timerSemaforo = agora;
        digitalWrite(LED_VERDE_2, LOW);
        estadoAtual = AMARELO_2;
      }
      break;

    case AMARELO_2:
      digitalWrite(LED_AMARELO_2, HIGH);
      if (agora - timerSemaforo >= TEMPO_AMARELO) {
        timerSemaforo = agora;
        digitalWrite(LED_AMARELO_2, LOW);
        digitalWrite(LED_VERMELHO_2, HIGH);
        estadoAtual = TROCA_2;
      }
      break;

    case TROCA_2:
      if (agora - timerSemaforo >= TEMPO_TROCA) {
        timerSemaforo = agora;
        digitalWrite(LED_VERMELHO_1, LOW);
        estadoAtual = VERDE_1;
      }
      break;
  }
}
