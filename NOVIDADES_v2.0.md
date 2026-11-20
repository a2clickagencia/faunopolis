# Faunópolis — Novidades da versão 2.0

## 1. Recintos que podem ser corrigidos (correção no estilo do Urbis)
No Urbis, uma área zoneada como residencial baixa podia virar média, alta ou comercial sem demolir nada. O Faunópolis agora faz o mesmo com os recintos:
- **Redesignar:** desenhe um novo recinto (ou amplie um existente) **por cima** de outro recinto. Os tiles mudam de dono; o recinto antigo encolhe ou desaparece se ficar vazio. Redesignar custa 1/3 do valor de um tile novo.
- **📐 Redefinir área** (painel do recinto): desenhe a nova área completa. A área antiga é liberada com reembolso e os animais são realocados para dentro da nova área.
- **🔓 Liberar área** (barra lateral ou tecla **X**): remove a designação de recinto sem demolir a vegetação ou a decoração. Se um recinto inteiro for liberado, os animais vão automaticamente para outro recinto compatível com espaço.
- Proteção: um recinto com animais nunca fica com menos de 9 tiles.

## 2. Mapa muito maior e mais variado
- O mapa passou de 72×56 para **160×120 tiles** (4,8 vezes maior, 300 lotes).
- Regiões naturais: norte frio (neve, gelo e rochas), leste árido, oeste de savana, um rio sinuoso, lagos, brejos e florestas com vegetação nativa.
- Preço dos lotes com curva mais suave e teto de R$ 400.000.
- Até 800 visitantes simultâneos (antes 450).
- **Jogos salvos da v1 são convertidos automaticamente**: o zoológico antigo fica no centro-sul do mapa novo.

## 3. Muito mais animais: de 31 para 64 espécies
- **Savana:** impala, gnu, facocero, hiena-malhada, guepardo, babuíno, hipopótamo
- **Brasil:** mico-leão-dourado, quati, ema, bicho-preguiça, veado-campeiro, gavião-real (harpia)
- **Pantanal:** arara-azul, flamingo, cervo-do-pantanal, sucuri
- **Deserto:** órix, caracal, lagarto-monitor
- **Ásia:** pavão, macaco-japonês, panda-gigante, elefante-asiático, leopardo-das-neves, dragão-de-komodo
- **Polar:** foca, morsa, rena, lobo-ártico, coruja-das-neves
- **Fantástico:** pégaso, kirin, basilisco

Novos tipos de sprite: galhadas, chifres longos, focas/morsas, serpentes e cauda em leque. Os eventos "Semana dos Felinos" e "Festival de Aves" passam a valer para as novas espécies.

## 4. Visão 3D em estilo voxel e novos modos de câmera
O mundo inteiro agora é desenhado em 3D com blocos (motor Three.js r128, incluído em `js/lib/`, funciona sem internet): terreno com relevo, água rebaixada, caminhos e estradas em placas, cercas de madeira, árvores, instalações com janelas e telhados, animais, visitantes, carros na avenida, sombras e ciclo de dia e noite.

| Botão | Modo | Controles |
|---|---|---|
| 🗺️ | Vista aérea 2D | o modo clássico, bom para planejar |
| 🏙️ | Isométrica 3D | **Q/E** giram 90°, roda = zoom, botão direito = arrastar |
| 🎥 | Órbita livre 3D | botão do meio (ou Alt + direito) orbita, Shift + roda ou PgUp/PgDn inclinam |
| 🎯 | Seguir animal | a câmera acompanha o animal selecionado |
| 🚶 | Olhar do visitante | 1ª pessoa, andando com um visitante pelo parque |
| 🎬 | Tour cinematográfico | passeio automático pelos recintos e instalações |

A tecla **V** alterna entre os modos. Todas as ferramentas (caminhos, recintos, terreno, objetos, demolição, compra de lotes) funcionam também no 3D. O jogo lembra a última câmera usada.

## 5. Iluminação, placas e itens do cenário
- **Placas de identificação dos recintos:** agora são placas físicas na cerca, viradas para o caminho de observação mais próximo, com o nome do recinto e as espécies. Antes era um rótulo flutuando no meio do recinto.
- **Postes de luz e placas educativas** ficam **na borda do caminho**, sem bloquear a passagem e sem ocupar um tile de grama.
- Novos itens: **poste duplo (praça)**, **luminária de jardim** e **holofote do recinto** (só dentro de recintos). Cada luz tem seu alcance.
- À noite os postes acendem e iluminam o chão, e as janelas das instalações ficam acesas.
- Bancos e lixeiras ficam virados para o caminho no 3D.
- Demolir um poste ou placa que está no caminho remove só o objeto, e o caminho continua lá.
