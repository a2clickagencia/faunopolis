# Faunópolis 2.3: novidades

> Numeração: a partir desta versão o jogo usa a mesma numeração do site da A² LABS (2.1, 2.2, 2.3…). A 2.2 corresponde às versões internas 7.2.x (celular e tablet).

## Construção mais rápida e sem medo de errar
- **Ctrl+Z desfaz** a última ação: caminho, recinto, ampliação, área nova, lago, aterro, terreno, vegetação, decoração, brinquedo, instalação, demolição e compra de lote. Guarda as últimas 30 ações. No celular e no tablet, use o botão **↶** no fim da barra de construção.
- **Demolir remove só o item.** Se a área marcada tem itens (brinquedo, árvore, pedra, banco, poste…), só eles saem e o recinto ou o caminho embaixo continuam. Sem itens na área, a ferramenta demole caminhos e partes de recintos como antes.
- **Terreno por área.** Em 🏞️ Terreno e biomas, arraste um retângulo (uma linha, um 3×3, uma área grande), como ao desenhar um recinto, e todo o terreno é trocado de uma vez. A prévia mostra quantos tiles mudam e o custo. O **pincel** (1×1, 3×3, 5×5) continua disponível no botão 🖌️ Pincel.
- **⛰️ Aterrar água.** Novo item em Terreno e biomas: arraste sobre qualquer área e só a água vira terra firme (grama, ou o último terreno escolhido). Funciona dentro e fora dos recintos.

## Itens no caminho
- **Banco, lixeira e ponto de informação** podem ficar no próprio caminho dos visitantes. Eles ficam na borda, menores, sem bloquear a passagem e sem gastar um tile vizinho.
- **Poste de luz, poste duplo, luminária de jardim e placa educativa** também ficam na borda do caminho.

## Itens indicados para cada animal
- Ao passar o mouse sobre um terreno, planta, decoração ou brinquedo (ou ao tocar nele, no celular), a gaveta mostra **"Mais indicado para"** e **"Também serve para"**, com as espécies.
- Ao escolher a ferramenta, a dica no topo repete a indicação.
- Como cada indicação é calculada:
  - **Terreno:** pela afinidade de cada espécie com o terreno.
  - **Plantas:** pelas plantas que cada espécie aprecia.
  - **Abrigo e enriquecimento:** pelas espécies que exigem o item.
  - **Brinquedos:** pelos grupos que adoram cada um.

## Comedouro e bebedouro com função de verdade
- **🚰 Bebedouro:** para quem só precisa **beber** (água desejada abaixo de 10%), basta como fonte de água, e o recinto não precisa de lago. Quem precisa **nadar ou mergulhar** (hipopótamo, jacaré, capivara, pinguim, foca, ariranha…) precisa de **lago/piscina**; para essas espécies o bebedouro rende só 25–45% da nota de água.
- **🍽️ Comedouro (novo, R$ 220):** a comida fica protegida. Os animais do recinto sentem **25% menos fome** e cada refeição gasta **15% menos ração**.
- O painel do recinto mostra se há bebedouro e comedouro e avisa quando alguma espécie precisa de lago.

## 8 brinquedos novos (17 no total)
| Brinquedo | Preço | Mais indicado para |
|---|---|---|
| Túnel de troncos | R$ 130 | animais pequenos (suricato, quati, mico-leão, raposas…) |
| Bola gigante | R$ 160 | elefantes e animais grandes |
| Picolé de frutas | R$ 100 | primatas e animais polares |
| Saco de aromas | R$ 120 | felinos (leão, onça, tigre, guepardo, caracal, leopardo-das-neves) |
| Escorregador aquático | R$ 300 | quem nada (etapa 2) |
| Espelho para aves | R$ 90 | aves |
| Monte de folhas e sementes | R$ 60 | herbívoros e animais pequenos |
| Orbe mágico | R$ 800 | animais fantásticos (etapa 5) |

## Entrada mais realista
- O portal não tem mais o nome do jogo: a placa **ENTRADA ▸** (verde) fica de um lado e **◂ SAÍDA** (vermelha) do outro, nos dois sentidos, em 2D e 3D.

## Quadrúpedes em 3D esculpidos no Blender
- Os quadrúpedes deixaram de ter todos o mesmo corpo. São **10 anatomias** modeladas no Blender, cada uma com pernas próprias (pata ou casco, dianteira e traseira com jarrete):
  - **felino:** leão, onça, tigre, guepardo, caracal, leopardo-das-neves;
  - **canídeo:** lobo-guará, raposas, lobo-ártico, hiena;
  - **cervídeo/antílope:** cervo, veado, impala, órix, gnu, rena;
  - **equino:** zebra, unicórnio, pégaso, kirin;
  - **pesado:** rinoceronte, hipopótamo, anta, facocero;
  - **urso:** urso-polar, panda;
  - **pequeno:** capivara, quati, panda-vermelho;
  - **mustelídeo:** ariranha, suricato, tamanduá;
  - **camelo;**
  - **girafa.**
- Cada espécie ajusta o tamanho e mantém a sua pelagem (listras, manchas, rosetas, faixas), além de orelhas, olhos, focinho, cauda, juba, crina e chifres próprios.
- O script e o arquivo do Blender ficam em `scripts/blender/` (`animais.py` e `animais.blend`).

## Correções
- **Grama:** escolher Grama em Terreno e biomas dava o erro "Cannot read properties of undefined (reading 'cor')". Corrigido: a Grama tem o número 0 e o jogo a tratava como "nenhum terreno".
- **Quarentena:** se o recinto de origem deixou de existir (por exemplo, porque o grupo foi transferido para outro recinto), o animal não podia mais sair da quarentena. Agora:
  - **✅ Liberar da quarentena** leva o animal para o recinto de origem; se ele não existir ou não tiver espaço, leva para onde está o grupo da mesma espécie; se não houver, para o recinto compatível com melhor habitat;
  - **🔀 Liberar em outro recinto** deixa você escolher o recinto manualmente;
  - o painel do animal mostra para qual recinto ele volta.
- O bebedouro, o comedouro e os brinquedos só podem ser postos dentro de recintos, com mensagem clara.
