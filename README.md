# Semáforo Inteligente — Atividade Ponderada em Grupo

Este projeto faz parte da proposta de Smart City, onde semáforos não apenas controlam o tráfego, mas percebem o ambiente, se adaptam automaticamente e podem ser controlados online.  
Nosso grupo desenvolveu dois semáforos físicos conectados a um único ESP32, utilizando um sensor LDR para detectar luminosidade e alternar para modo noturno quando necessário.

---

## Objetivos do Projeto

• Montar dois semáforos físicos com LEDs.  
• Integrar sensor LDR ao ESP32 para detectar presença e luminosidade.  
• Criar uma interface online para visualizar dados do LDR. 
• Demonstrar o projeto completo em vídeo.

---

## Componentes Utilizados

• 1 ESP32 DevKit  
• 2 conjuntos de LEDs (vermelho, amarelo e verde)  
• 1 sensor LDR  
• Resistor para divisor de tensão  
• Jumpers e protoboard  
• Interface online 

---

## Parte 1: Montagem Física e Programação

### Semáforos
Cada semáforo foi construído com três LEDs (vermelho, amarelo e verde).  
A lógica implementada foi:

1. Verde, depois amarelo, depois vermelho  
2. Ciclo contínuo  
3. Alternância entre os dois semáforos, garantindo que enquanto um abre, o outro fecha

### Sensor LDR
O sensor LDR foi conectado ao ADC do ESP32 para medir a luminosidade ambiente.  
Esse valor foi utilizado para:

• Detectar variação de luz simulando passagem de veículos  
• Ativar automaticamente o modo noturno

### Modo Noturno
Quando a luminosidade fica abaixo do limite estabelecido, ambos os semáforos entram no modo noturno.  
Comportamento implementado:

• Pisca-amarelo simultâneo nos dois semáforos  
(Ajustar aqui caso o grupo tenha escolhido outro modo)

---

## Parte 2: Interface Online

A interface desenvolvida permite:

• Visualizar o valor em tempo real do LDR  
• Ativar e desativar manualmente o modo no noturno  
• Alterar comportamento dos semáforos  
• Acompanhar o estado atual dos LEDs

Link da Interface:  
Adicionar aqui o link da interface

---

## Vídeo de Demonstração

Clique aqui para ver o vídeo

O vídeo inclui:  
• Montagem física  
• Funcionamento dos dois semáforos  
• Leitura do LDR  
• Ativação automática do modo noturno  
• Controles pela interface

---


## Funcionamento Geral

1. Os semáforos seguem o ciclo tradicional.  
2. O ESP32 realiza leitura contínua do sensor LDR.  
3. Com baixa luminosidade, o sistema ativa o modo noturno automaticamente.  
4. A interface permite controle manual adicional.  
5. Ambos os semáforos foram implementados utilizando um único ESP32.

---

## Integrantes do Grupo

- Ana Júlia
- Carol Paz
- Lucas Michel
- Mariana Lacerda
- Nicole Zanin
- Paulo Victor
- Sofia Arone



