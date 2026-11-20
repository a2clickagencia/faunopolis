# Faunópolis v7.2: celular e tablet

O jogo agora funciona completo no celular e no tablet, pelo navegador ou instalado como app. É o mesmo jogo do computador: o mesmo zoológico, as 64 espécies e os modos 2D e 3D.

## Como instalar
| Aparelho | Como |
|---|---|
| Android | Abra **faunopolis.a2clickagencia.workers.dev** no Chrome e toque em **Instalar o jogo** no menu do jogo (ou ⋮ → Instalar app). |
| iPhone / iPad | Abra o site no Safari, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**. |
| Windows | Botão **Baixar para Windows** no menu, ou `releases/latest/download/Faunopolis-Setup.exe`. |

Depois de instalado, o jogo abre em tela cheia pelo ícone e funciona **sem internet**: todos os arquivos do jogo são guardados na primeira visita.

## Controles de toque
- **1 dedo**: arrasta o mapa. **Toque**: abre o painel do animal, recinto ou instalação.
- **2 dedos**: movem o mapa. **Pinça**: zoom. No 3D, **girar os dedos** gira a câmera e **arrastar os 2 dedos para cima ou para baixo** inclina.
- **Construir**: escolha a ferramenta e **arraste 1 dedo** para desenhar (caminho em reta ou "L", recinto, lago, terreno, demolição). Ao soltar, tudo é construído de uma vez. Instalações e lotes: toque no lugar.
- **Botões à direita**:
  - **✋**: mover o mapa sem construir.
  - **＋ / －**: zoom.
  - **⤒ / ⤓**: inclinar a câmera no 3D.
  - **🗺️**: minimapa, lentes e câmeras 2D/3D.

## Layout
- **Celular em pé**: números no topo, velocidade logo abaixo, ferramentas e gestão em barras roláveis embaixo. Os painéis abrem como gaveta.
- **Celular deitado**: ferramentas na lateral e gestão embaixo.
- **Tablet**: o layout do computador, com botões maiores.

## Pensado para estudantes
- **Salvamento**: o jogo salva sozinho a cada 3 dias de jogo e sempre que você sai do app (troca de aplicativo, tela bloqueada, aula começando…).
- **Qualidade gráfica automática**: alta no PC, média em tablets bons e baixa em celulares. Se o 3D ficar lento, ela baixa sozinha. Também dá para escolher em ☰ Menu → Gráficos 3D.
- **🔋 Economia de bateria**: o jogo roda a 30 quadros por segundo. Vem ligada no celular e no tablet.
- **Wi-Fi do campus instável**: se a rede demora mais de 4 segundos, o jogo usa a cópia guardada no aparelho.
- **Levar o zoológico para outro aparelho**: Salvar → **Exportar / enviar arquivo** abre o "Compartilhar" (Drive, WhatsApp, e-mail). No outro aparelho, Carregar → Importar arquivo.
- O navegador é instruído a não apagar os jogos salvos para liberar espaço.

## v7.2.1: celular muito mais leve
- **3D desenha só o que aparece na tela**: árvores, decoração, grama, cercas, meio-fios, luzes, pessoas e animais fora da tela não são mais enviados à placa de vídeo, e o terreno é desenhado só na faixa visível.
- **Correção**: num parque sem recintos, o jogo desenhava 60 mil peças de cerca invisíveis (2,2 milhões de triângulos a cada quadro). Isso pesava em todo jogo novo.
- **Qualidade baixa (celular)**: sem sombras, grama 3D e reflexos do céu; iluminação por vértice; terreno, árvores e animais com menos polígonos; visão até menos longe. Nova qualidade **Mínima** para aparelhos fracos, aplicada sozinha se o 3D ficar lento.
- **2D**: o chão é pré-desenhado em pedaços de 16×16 tiles, refeitos só quando mudam (cerca de 6 vezes mais rápido). Em telas de alta densidade, o 2D usa até 1,5× de resolução.
- **Minimapa**: cerca de 25 vezes mais rápido e não é desenhado quando está escondido. Antes travava o jogo duas vezes por segundo.
- **Resultado medido** (celular simulado, qualidade baixa):
  - triângulos por quadro: de 1,8–4 milhões para cerca de 250 mil;
  - abertura do 3D: cerca de 4 vezes mais rápida.
