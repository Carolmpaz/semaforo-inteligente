### **Documentação do Projeto – Semáforo Inteligente com ESP32 e MQTT**

---

## **1. Introdução**

Este projeto consiste na implementação de um sistema de controle semafórico inteligente utilizando um microcontrolador **ESP32**, dois conjuntos de semáforos (totalizando 6 LEDs) e comunicação via **MQTT**. O sistema simula uma interseção entre uma **rua principal (grande)** e uma **rua secundária (pequena)**, alterando o fluxo de veículos de acordo com as condições de tráfego e luminosidade.

O objetivo é demonstrar o funcionamento de um cruzamento real utilizando sensores, atuadores e controle remoto via nuvem.

---

## **2. Componentes Utilizados**

* **ESP32 DevKit**
* **6 LEDs** (2 conjuntos de semáforo: vermelho, amarelo e verde para cada rua)
* **Resistores 220Ω** para cada LED
* **Sensor de presença ou fotoresistor (LDR)** para detecção de veículo na rua pequena
* **Protoboard e jumpers**
* **Fonte USB 5V**
* **Broker MQTT (HiveMQ Cloud ou local)**

---

## **3. Funcionamento do Sistema**

### **3.1 Modos de Operação**

#### **➡️ Modo Normal (diurno)**

* A luz verde **permanece na rua grande** por padrão.
* Quando o sensor detectar a presença de um veículo na rua pequena:

  1. O semáforo da rua grande passa de **verde → amarelo → vermelho**
  2. O semáforo da rua pequena fica **verde** por alguns segundos
  3. Após o tempo definido, o fluxo retorna para a rua grande
* **Se não houver detecção**, o semáforo da rua pequena permanece vermelho.

#### **➡️ Modo Noturno**

* Ambos os semáforos **piscarão amarelo** simultaneamente
* Não há monitoramento de tráfego nesse modo
* É um comportamento de economia energética e alerta, típico de madrugadas.

### **3.2 Estados dos LEDs por semáforo**

Cada semáforo possui:

| Estado          | Rua Grande       | Rua Pequena      |
| --------------- | ---------------- | ---------------- |
| Padrão          | Verde            | Vermelho         |
| Carro detectado | Vermelho         | Verde            |
| Noturno         | Amarelo piscando | Amarelo piscando |

---

## **4. Comunicação MQTT**

O ESP32 publica e recebe mensagens através de tópicos MQTT hospedados no **HiveMQ**.

### **Tópicos MQTT**

| Tópico                | Função                                                                      |
| --------------------- | --------------------------------------------------------------------------- |
| `semaforo/status`     | Publica o estado atual (cores dos LEDs, modo, sensor)                       |
| `semaforo/mode/set`   | Recebe comandos de mudança de modo (`normal`, `noturno`)                    |
| `semaforo/timers/set` | Configuração de tempos de cada fase (ex.: tempo do verde, vermelho, piscar) |

### **Exemplo de payload publicado**

```json
{
  "modo": "normal",
  "rua_grande": "verde",
  "rua_pequena": "vermelho",
  "sensor_carro": false
}
```

### **Interface HiveMQ**

* Permite alterar:

  * Modo de operação
  * Tempo de sinalização do verde/vermelho
  * Frequência de pisca no modo noturno
* Permite monitorar o estado do sistema em tempo real

---

## **5. Fluxo Lógico Simplificado**

```
INÍCIO
|
|--> Verificar modo selecionado
      |
      |--> Modo Normal?
      |      |--> Ler sensor de presença
      |      |--> SE carro detectado → Troca prioridade para rua pequena
      |      |--> SENÃO → Mantém verde na rua grande
      |
      |--> Modo Noturno?
             |--> Ambos piscam amarelo continuamente
      |
      |--> Publicar estado via MQTT
      |
LOOP
```

---

## **6. Possível Diagrama de Ligação (resumo)**

* Pinos GPIO do ESP32 conectados aos LEDs com resistores
* Sensor de luminosidade/presença ligado a uma entrada analógica
* Todos GNDs em comum

*(Inserir imagem ou esquema futuramente)*

---

## **7. Possíveis Melhorias Futuras**

* Display OLED mostrando estados
* Adição de buzzer para acessibilidade
* Integração com aplicativo móvel
* Detecção de fluxo de veículos via câmera ou ultrassom

---

## **8. Autores e Contribuições**

| Nome    | Contribuição |
| ------- | ------------ |
| Autor 1 |              |
| Autor 2 |              |
| Autor 3 |              |
| Autor 4 |              |
| Autor 5 |              |
| Autor 6 |              |
| Autor 7 |              |

*(Preencher com responsabilidades como: hardware, firmware, MQTT, documentação, testes, etc.)*

---

## **9. Conclusão**

Este projeto demonstra o funcionamento de um **semáforo inteligente de baixo custo**, capaz de:

✔ Controlar o tráfego conforme demanda
✔ Operar em modo automático ou remoto
✔ Enviar e receber dados via nuvem utilizando MQTT
✔ Simular um sistema real com lógica condicional e sensores

O uso do ESP32 permite grande flexibilidade, escalabilidade e possibilidade de expansão para aplicações reais de IoT.
