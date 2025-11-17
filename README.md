# Semáforo Inteligente — Atividade Ponderada em Grupo

Este projeto faz parte da proposta de Smart City, onde semáforos não apenas controlam o tráfego, mas percebem o ambiente, se adaptam automaticamente e podem ser controlados online.
Nosso grupo desenvolveu dois semáforos físicos conectados a um único ESP32, utilizando um sensor LDR para detectar luminosidade e alternar para modo noturno quando necessário.
O sistema também envia e recebe dados via **MQTT**, permitindo alteração remota dos parâmetros de funcionamento por meio da plataforma **HiveMQ**.

---

## Objetivos do Projeto

• Montar dois semáforos físicos com LEDs.
• Integrar sensor LDR ao ESP32 para detectar presença e luminosidade.
• Criar uma interface online para visualizar dados do LDR **e controlar o modo operacional via MQTT**.
• Demonstrar o projeto completo em vídeo.
• Implementar lógica de funcionamento inteligente simulando o comportamento de um cruzamento real:
– Rua principal permanece verde por padrão
– Rua secundária só recebe verde quando um “veículo” é detectado
– Em modo noturno ambos piscam amarelo

---

## Componentes Utilizados

• 1 ESP32 DevKit
• 2 conjuntos de LEDs (vermelho, amarelo e verde)
• 1 sensor LDR
• Resistor para divisor de tensão
• Jumpers e protoboard
• Interface online
• **Broker MQTT (HiveMQ Cloud)** para publicação e controle remoto
• (**Opcional**) Fonte 5V externa

---

## Parte 1: Montagem Física e Programação

### Semáforos

Cada semáforo foi construído com três LEDs (vermelho, amarelo e verde).
A lógica implementada foi:

1. Verde, depois amarelo, depois vermelho
2. Ciclo contínuo
3. Alternância entre os dois semáforos, garantindo que enquanto um abre, o outro fecha
4. **Rua principal permanece com verde até que um evento seja detectado na secundária**

### Sensor LDR

O sensor LDR foi conectado ao ADC do ESP32 para medir a luminosidade ambiente.
Esse valor foi utilizado para:

• Detectar variação de luz simulando passagem de veículos (ex.: cobrindo o sensor)
• Ativar automaticamente o modo noturno
• Enviar o valor continuamente via MQTT para visualização na interface

### Modo Noturno

Quando a luminosidade fica abaixo do limite estabelecido, ambos os semáforos entram no modo noturno.
Comportamento implementado:

• **Pisca-amarelo simultâneo nos dois semáforos**, independente de “veículos”
• Esse modo também pode ser ativado manualmente via MQTT

---

## Parte 2: Interface Online

A interface desenvolvida permite:

• Visualizar o valor em tempo real do LDR
• Ativar e desativar manualmente o modo noturno
• Alterar comportamento dos semáforos
• Acompanhar o estado atual dos LEDs
• **Publicar comandos MQTT e ler status do ESP32 em tempo real**

### Comunicação MQTT

Tópicos utilizados:

| Tópico                  | Função                                           |
| ----------------------- | ------------------------------------------------ |
| `semaforo/status`       | ESP32 publica estado (LEDs, modo, luminosidade)  |
| `semaforo/mode/set`     | Interface envia comandos (`normal` ou `noturno`) |
| `semaforo/luminosidade` | Publicação contínua do valor lido do LDR         |

Link da Interface:
➡️ *(Inserir link do HiveMQ Web Client ou página personalizada)*

---

## Vídeo de Demonstração

Clique aqui para ver o vídeo

O vídeo inclui:
• Montagem física
• Funcionamento dos dois semáforos
• Leitura do LDR
• Ativação automática do modo noturno
• Controles pela interface
• **Publicações MQTT visíveis em tempo real**

---

## Funcionamento Geral

1. Os semáforos seguem o ciclo tradicional.
2. O ESP32 realiza leitura contínua do sensor LDR.
3. Com baixa luminosidade, o sistema ativa o modo noturno automaticamente.
4. A interface permite controle manual adicional.
5. Ambos os semáforos foram implementados utilizando um único ESP32.
6. **O estado atual é enviado via MQTT e pode ser monitorado remotamente.**
7. **Em modo normal, o semáforo da rua principal permanece verde até uma detecção simular veículo na rua menor.**

---

## Integrantes do Grupo

* Ana Júlia
* Carol Paz
* Lucas Michel
* Mariana Lacerda
* Nicole Zanin
* Paulo Victor
* Sofia Arone

---
