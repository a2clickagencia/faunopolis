# Faunópolis 2.4: celular e tablet bem mais leves

A versão 2.4 é uma versão de desempenho: todas as funções da 2.3 continuam. Os animais ficam iguais de perto e são desenhados de forma mais leve quando estão longe da câmera, onde a diferença não aparece.

## O que mudou
- **Animais à distância (LOD):** longe da câmera, cada animal vira **uma malha única e simplificada** (corpo + pernas), com as mesmas cores, listras e manchas.
  - São cerca de 1.000 triângulos em vez de 3.800, e 1 desenho em vez de 5.
  - De perto (e na câmera "Seguir animal") continua o modelo completo, com pernas animadas, juba e chifres.
- **Árvores e decoração à distância:** com a câmera afastada, árvores e pedras usam uma versão simplificada (até 60% menos triângulos). Itens rasteiros muito pequenos na tela (flores, capim, brinquedos) deixam de ser desenhados quando a câmera está bem longe.
- **Distância de troca por qualidade:** na qualidade Alta (PC) o detalhe completo vai bem mais longe; nas qualidades Baixa e Mínima (celular) a troca acontece mais perto.
- **Ctrl+Z no celular:** o histórico de desfazer guarda 12 ações no celular e no tablet (30 no computador), para poupar memória.

## Resultado medido (celular simulado, parque com 60 animais, qualidade baixa)
| | 2.3 | 2.4 |
|---|---|---|
| Triângulos por quadro (vista normal) | 374 mil | 178 mil |
| Chamadas de desenho (vista normal) | 223 | 94 |
| Triângulos por quadro (câmera afastada) | 995 mil | 346 mil |
| Chamadas de desenho (câmera afastada) | 400 | 142 |
| Tempo de CPU por quadro (câmera afastada) | 11,2 ms | 5,5 ms |

## Dicas para aparelhos simples
- Em ☰ Menu → Gráficos 3D, escolha **Mínima**.
- A visão **2D** (botão 🗺️ → 2D) é a mais leve de todas.
- Deixe a **🔋 Economia de bateria** ligada (30 quadros por segundo).
