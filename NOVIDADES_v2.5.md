# Faunópolis 2.5: correções de recintos, terreno e celular

## Correções
- **Recintos novos com 0 tiles / "construa um caminho encostado" mesmo com caminho:** o mapa de recintos guardava o número de cada recinto em 16 bits, mas esse número vem do mesmo contador das árvores, bancos e outros itens. Num parque grande ele passava de 32.767 e "estourava": o recinto aparecia vazio (0 tiles), os visitantes não o enxergavam e ele sumia do controle biológico. Agora o mapa usa 32 bits.
- **Jogos salvos são consertados ao carregar:** os tiles dos recintos afetados voltam para os seus recintos (com aviso na tela). Recintos que ficaram sem tiles e sem animais são removidos da lista.
- **Recintos e animais fora do zoológico:** o zoológico termina na linha da entrada. Não dá mais para comprar lotes depois da entrada nem construir lá (recinto, caminho, instalação, terreno). Lotes vazios que já tinham sido comprados ali são devolvidos com reembolso de R$ 6.000 cada.
- **Dica do caminho mais clara:** quando há caminho encostado no recinto, mas ele não chega à entrada, a dica agora diz exatamente isso.

## Desempenho (celular e tablet, iPhone e Android)
- **Busca de caminho dos visitantes sem desperdício de memória:** antes, cada busca criava uma tabela do tamanho do mapa inteiro, e com centenas de visitantes isso causava travadas de "coleta de lixo". Agora as tabelas são reaproveitadas.
- **Decisões dos visitantes espalhadas entre os quadros:** no máximo 16 por quadro no celular (48 no PC), sem picos quando muitos visitantes decidem ao mesmo tempo.
- **Salvamento ~4x menor e mais rápido:** os mapas são gravados em bytes (base64). Isso evita travar ao salvar sozinho e o erro de "sem espaço" no iPhone. Os saves antigos continuam abrindo normalmente.
- **Painel lateral sem travar a rolagem:** o painel só é redesenhado quando o conteúdo muda e espera o dedo soltar.
- **Lotes não comprados (2D):** só os visíveis são desenhados, de uma vez só. Antes eram cerca de 300 retângulos por quadro.
- **Abertura mais rápida com internet lenta:** as fontes carregam sem bloquear a tela inicial.

## 2.5.1: vários animais de uma vez e cobra nova no 3D
- **Ações em grupo:** no painel do recinto, toque em **☑️ Selecionar vários**. Marque os animais um a um ou use os atalhos (Todos, Machos, Fêmeas, Filhotes, Idosos ou por espécie). Depois escolha:
  - **🔀 Mover** para outro recinto. A compatibilidade e o espaço são conferidos animal por animal.
  - **💲 Vender.** O valor total aparece antes de confirmar.
  - **🌍 Conservação.** Os animais vão para programas de conservação e o zoológico ganha reputação.
  - Errou? É só usar o Ctrl+Z (↶ Desfazer).
- **Cobra no 3D:** o corpo agora é um cilindro liso de verdade, deitado no chão numa curva em "S", com ventre claro e manchas no dorso. Antes era uma rosca enrolada e cheia de "ondinhas". Vale para a sucuri e o basilisco.
