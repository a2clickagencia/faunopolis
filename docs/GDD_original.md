# FAUNÓPOLIS

> Documento de design original usado como base do jogo. O título provisório do rascunho foi substituído pelo nome oficial, **Faunópolis**, em todo o documento.

## Documento de visão, conceito e design do jogo

**Versão:** 1.0\
**Data:** 17 de novembro de 2026\
**Tipo de documento:** Game Design Document (GDD) --- visão conceitual
completa\
**Gênero:** Simulação, construção, gerenciamento e estratégia\
**Perspectiva:** 2D com visão superior (top-down)\
**Referência visual:** jogos de gerenciamento 2D no estilo de *Urbs*\
**Plataforma e tecnologia:** a definir

------------------------------------------------------------------------

# 1. Visão geral

## 1.1. Conceito

O jogo é um simulador de construção e administração de zoológico. O
jogador começa com um terreno pequeno, recursos limitados e poucas
espécies. A partir daí, precisa planejar o espaço, construir e ampliar
recintos, adquirir animais, cuidar deles, contratar funcionários, atrair
visitantes, definir o preço dos ingressos e administrar receitas e
despesas.

O objetivo é transformar um zoológico simples em um grande parque de
referência, com diversos biomas, espécies, serviços e atrações. O
crescimento deve trazer oportunidades, mas também novas
responsabilidades: mais animais significam mais alimentação, limpeza,
manutenção, funcionários e riscos de saúde.

A experiência central não é apenas colecionar animais ou decorar um
parque. É equilibrar quatro dimensões que se influenciam mutuamente:

1.  **Bem-estar animal:** saúde, espaço, alimentação, ambiente e
    cuidados.
2.  **Experiência dos visitantes:** variedade, atrações, organização,
    acessibilidade e satisfação.
3.  **Saúde financeira:** ingressos, serviços, custos operacionais e
    investimentos.
4.  **Qualidade ambiental e visual:** limpeza, paisagismo, decoração e
    adequação dos habitats.

Uma expansão opcional poderá introduzir criaturas fantásticas, como
dragões, centauros e grifos, mantendo a mesma lógica de construção e
gestão em um universo mais fantástico.

## 1.2. Fantasia do jogador

A fantasia principal é: **"Construir o zoológico que sempre quis,
descobrir e cuidar de diversas espécies e fazer o parque crescer sem
perder o controle da operação."**

O jogador deve sentir que: - Está construindo algo próprio e visualmente
reconhecível. - Cada recinto tem uma função, uma capacidade e uma
condição. - Os animais são seres que exigem cuidados, não apenas objetos
decorativos. - O crescimento é recompensador, mas exige planejamento. -
Suas decisões têm consequências financeiras e operacionais. - Sempre
existe uma nova área, espécie, estrutura ou melhoria a conquistar.

## 1.3. Pilares de design

### Construir e personalizar

Liberdade para organizar recintos, caminhos, áreas temáticas, serviços e
decoração.

### Cuidar e equilibrar

A população, a alimentação, a limpeza, a saúde e o espaço dos animais
precisam ser administrados.

### Crescer com responsabilidade

Um zoológico maior pode gerar mais receita, mas também consome mais
recursos e exige uma operação mais complexa.

### Descobrir e desbloquear

Novas espécies, biomas, estruturas e conteúdos especiais mantêm a
progressão interessante.

### Ler o parque de forma intuitiva

A interface deve comunicar informações rapidamente, especialmente por
meio de indicadores ao passar o mouse sobre recintos e objetos.

------------------------------------------------------------------------

# 2. Identidade visual e apresentação

## 2.1. Estilo gráfico

O jogo deve usar arte 2D com visão superior (*top-down*), inspirada na
clareza e na leitura espacial de jogos de gerenciamento como *Urbs*.

Características desejadas: - Cenário construído com elementos 2D
modulares. - Recintos, caminhos, vegetação, construções e animais
visíveis no mapa. - Personagens e animais com silhuetas fáceis de
reconhecer. - Cores que diferenciem claramente cada bioma. - Animações
simples que deem vida ao parque. - Interface compacta, sem esconder
desnecessariamente o mapa. - Elementos interativos com estados visuais
claros.

A referência a *Urbs* é principalmente de apresentação e leitura do
mundo: o parque deve ser visto como um espaço vivo que o jogador observa
e administra. Não é necessário copiar sua arte, interface ou sistemas.

## 2.2. Perspectiva e navegação

A câmera deve permitir: - Visualizar o zoológico inteiro em escalas
menores. - Aproximar para construir e observar recintos. - Afastar para
planejar a organização geral. - Deslocar a câmera pelo terreno. -
Selecionar objetos, construções, animais e recintos. - Passar o mouse
sobre elementos para obter informações rápidas.

## 2.3. Interface principal

A interface deve priorizar o mapa. Os painéis aparecem quando o jogador
seleciona uma área ou abre um menu.

### Barra superior

Informações sugeridas: - Dinheiro disponível. - Receita e despesas do
período. - Quantidade de visitantes. - Reputação ou avaliação do
zoológico. - Data, horário ou velocidade do jogo. - Alertas importantes.

### Menu de construção

Categorias sugeridas: - Recintos. - Caminhos e acessos. - Vegetação e
decoração. - Instalações para visitantes. - Instalações operacionais. -
Áreas temáticas. - Estruturas especiais.

### Menus de gestão

-   Animais e espécies.
-   Funcionários.
-   Alimentação e estoque.
-   Saúde e veterinária.
-   Visitantes e satisfação.
-   Finanças.
-   Pesquisa e desbloqueios.
-   Relatórios e notificações.

------------------------------------------------------------------------

# 3. Estrutura do zoológico

## 3.1. Terreno inicial

O jogador começa com um terreno limitado e uma quantia inicial de
dinheiro. O espaço deve ser suficiente para construir uma entrada,
alguns caminhos, instalações básicas e os primeiros recintos, mas não
para criar imediatamente um parque enorme.

A expansão acontece por meio da compra ou desbloqueio de novos terrenos.

## 3.2. Construção e edição

O jogador poderá: - Construir recintos de diferentes tamanhos e
formatos. - Aumentar recintos já existentes. - Remover ou reorganizar
estruturas. - Criar caminhos para visitantes e funcionários. -
Posicionar entradas, saídas e acessos de serviço. - Colocar árvores,
arbustos, pedras, lagos e elementos decorativos. - Construir instalações
operacionais e comerciais. - Comprar novas parcelas de terreno.

A construção deve considerar custos, espaço disponível, acesso e
compatibilidade com o tipo de instalação.

## 3.3. Recintos

O recinto é uma das unidades fundamentais do jogo. Cada recinto
possui: - Identificação e nome. - Área e tamanho. - Capacidade máxima. -
População atual. - Espécies permitidas ou compatíveis. - Condição de
limpeza. - Qualidade ambiental. - Adequação ao habitat da espécie. -
Estado de alimentação. - Bem-estar dos animais. - Estado de saúde dos
animais. - Custo de manutenção.

O jogador deve conseguir ampliar um recinto para aumentar sua
capacidade, melhorar o espaço disponível e acomodar uma população maior.

### Capacidade

A capacidade deve ser exibida em formato direto:

**5 / 15 animais**

Isso significa que o recinto abriga cinco animais e comporta até quinze.

O indicador deve mudar de estado conforme a ocupação: - Baixa ocupação:
há bastante espaço disponível. - Ocupação adequada: população dentro da
faixa recomendada. - Próximo do limite: alerta preventivo. - Acima da
capacidade: superlotação e penalidades.

A capacidade máxima não deve ser o único critério de qualidade. Um
recinto pode estar abaixo do limite e ainda assim ser inadequado por ter
pouca vegetação, água insuficiente, habitat incorreto ou falta de
estruturas.

## 3.4. Informações ao passar o mouse

Uma característica central da interface é mostrar informações sem
obrigar o jogador a abrir vários menus.

Ao passar o mouse sobre um recinto, uma pequena janela informativa deve
mostrar, por exemplo:

-   Nome do recinto.
-   Espécie ou espécies presentes.
-   População atual e capacidade (ex.: 5/15).
-   Bem-estar.
-   Limpeza.
-   Alimentação.
-   Saúde.
-   Qualidade do habitat.
-   Estado geral.

Ao clicar, o jogador abre o painel completo de administração daquele
recinto.

## 3.5. Áreas temáticas e biomas

A organização recomendada combina **regiões geográficas e biomas**, em
vez de separar tudo exclusivamente por continente. Isso permite que o
parque tenha áreas com identidade visual e necessidades ambientais
próprias.

As áreas são expansões físicas do zoológico, compostas por vários
recintos, caminhos, vegetação, decoração e serviços temáticos.

### África --- Savana

Possíveis espécies: - Leões. - Girafas. - Zebras. - Elefantes. -
Suricatos. - Rinocerontes. - Avestruzes.

Elementos ambientais: - Gramíneas. - Árvores esparsas. - Rochas. - Áreas
abertas. - Pontos de água.

### Brasil --- Floresta e Cerrado

Possíveis espécies: - Onças-pintadas. - Capivaras. - Antas. - Tucanos. -
Araras. - Tamanduás. - Lobos-guarás.

Elementos ambientais: - Vegetação tropical. - Árvores densas. -
Bromélias e arbustos. - Áreas de sombra. - Lagos e cursos d'água,
conforme o habitat.

### Manguezal e Pantanal

Possíveis espécies: - Jacarés. - Capivaras. - Ariranhas. - Tuiuiús. -
Lontras. - Aves aquáticas.

Elementos ambientais: - Água rasa. - Lama. - Raízes e vegetação de
mangue. - Margens alagadas. - Ilhas e áreas secas.

### Região árida e desértica

Possíveis espécies: - Suricatos. - Raposas-do-deserto. - Camelos. -
Lagartos. - Tartarugas.

Elementos ambientais: - Areia. - Rochas. - Vegetação resistente. -
Abrigos contra calor. - Áreas de sombra.

### Ásia --- Florestas tropicais e outros habitats

Possíveis espécies: - Pandas-vermelhos. - Tigres. - Orangotangos. -
Elefantes-asiáticos. - Gibões.

Elementos ambientais: - Vegetação densa. - Árvores. - Plataformas e
estruturas de escalada. - Lagos e áreas de sombra.

### Região polar

Possíveis espécies: - Pinguins. - Ursos-polares. - Raposas-do-ártico.

Elementos ambientais: - Neve e gelo cenográficos ou funcionais. - Água
fria. - Abrigos climatizados. - Rochas e áreas de descanso.

### Área fantástica

Área especial, preferencialmente desbloqueada em uma etapa avançada ou
como expansão temática.

Possíveis criaturas: - Dragões. - Centauros. - Unicórnios. - Grifos. -
Fênix. - Outras criaturas originais.

A área fantástica deve ter identidade visual própria e regras de habitat
específicas. Ela pode reutilizar os sistemas de recinto, alimentação,
saúde, reprodução, visitantes e finanças, adaptando-os às criaturas.

------------------------------------------------------------------------

# 4. Sistema de animais

## 4.1. Animais como entidades individuais

Cada animal deve existir como uma entidade do jogo, vinculada a um
recinto e a uma espécie. O nível de detalhe individual pode ser
simplificado na primeira versão e aprofundado posteriormente.

Dados possíveis por animal: - Espécie. - Nome ou identificador. - Sexo,
quando relevante. - Idade ou estágio de vida. - Saúde. - Bem-estar. -
Fome. - Estado de comportamento. - Condição reprodutiva. - Histórico de
nascimento, aquisição ou transferência.

## 4.2. Compra de animais

O jogador poderá adquirir animais por meio de fornecedores, negociações
ou sistemas de transferência.

Antes de comprar, deve verificar: - Preço. - Espécie. - Quantidade
disponível. - Sexo e idade, se aplicável. - Compatibilidade com o
recinto. - Necessidades ambientais. - Custo recorrente de manutenção.

A compra deve ser bloqueada ou gerar um alerta quando não houver recinto
adequado, espaço suficiente ou condições mínimas para receber o animal.

## 4.3. Venda e transferência

Quando houver excesso de animais, o jogador poderá vender, transferir ou
encaminhar indivíduos para outros zoológicos ou programas de
conservação.

A venda deve considerar: - Espécie. - Idade. - Estado de saúde. -
Raridade ou disponibilidade. - Demanda do mercado. - Regras de
conservação definidas pelo jogo.

O sistema deve evitar que o jogador venda tantos animais que deixe o
recinto vazio ou inviabilize a reprodução.

## 4.4. Reprodução

Os animais poderão se reproduzir de tempos em tempos, de acordo com
regras próprias de cada espécie.

A reprodução pode depender de: - Existência de indivíduos compatíveis. -
Idade e maturidade. - Condição de saúde. - Bem-estar. - Qualidade do
recinto. - Condições ambientais. - Intervalo reprodutivo da espécie.

Os nascimentos aumentam a população e podem gerar filhotes que exigem
cuidados próprios.

O jogador deve receber avisos sobre: - Gravidez ou período reprodutivo,
quando aplicável. - Nascimento. - Crescimento dos filhotes. - População
próxima do limite. - Necessidade de ampliar o recinto ou transferir
animais.

A reprodução não deve ser uma fonte ilimitada de animais sem
consequência. Ela é uma mecânica de gestão populacional.

## 4.5. Controle de população

O painel de população do recinto deve exibir: - População total. -
Capacidade. - Quantidade de machos e fêmeas, quando relevante. -
Quantidade de filhotes. - Nascimentos recentes. - Previsão ou indicação
de reprodução futura, quando possível.

Exemplo:

  Indicador                 Exemplo
  ----------------------- ---------
  População atual                12
  Capacidade                     20
  Machos                          5
  Fêmeas                          7
  Filhotes                        3
  Nascimentos previstos           2

**Observação:** os filhotes fazem parte da população atual. Eles não
devem ser somados novamente ao total.

O jogador deve evitar dois extremos: 1. Superlotação, que reduz o
bem-estar, piora o recinto e aumenta custos. 2. População insuficiente,
que pode reduzir a atratividade do recinto e comprometer a reprodução ou
a experiência dos visitantes.

## 4.6. Envelhecimento e morte

Como possível sistema avançado, os animais podem envelhecer e morrer
naturalmente. A saúde, a alimentação e os cuidados podem influenciar sua
longevidade, sem transformar o jogo em uma punição constante.

A morte por negligência deve ser possível se o jogo oferecer esse nível
de simulação, mas precisa ser comunicada com antecedência por alertas
claros e oportunidades de correção.

------------------------------------------------------------------------

# 5. Alimentação e estoque

## 5.1. Alimentação simplificada --- primeira versão

Na versão inicial, o jogador administra a compra de alimentos e o
estoque geral do zoológico.

Cada espécie consome uma quantidade e um tipo de alimento. O custo
aumenta conforme a população cresce.

O sistema deve: - Informar o consumo estimado. - Mostrar o estoque
disponível. - Alertar quando o estoque estiver baixo. - Permitir comprar
mais alimentos. - Calcular o custo por período. - Indicar quais recintos
ou espécies estão em risco de ficar sem alimento.

## 5.2. Alimentação avançada

Em uma versão mais detalhada, o jogador poderá: - Comprar diferentes
tipos de alimento. - Preparar ou organizar dietas. - Programar horários
de alimentação. - Acompanhar a alimentação por recinto. - Designar
tratadores. - Identificar animais que não estão comendo. - Gerenciar
armazenamento e desperdício.

## 5.3. Consequências da falta de alimentação

Se o estoque acabar ou a alimentação não for realizada: - A fome
aumenta. - O bem-estar diminui. - A saúde pode piorar. - O animal pode
adoecer. - Em casos extremos, pode morrer.

O jogo deve emitir alertas progressivos antes de consequências graves.

## 5.4. Tratadores

Tratadores são funcionários responsáveis pela rotina dos animais,
especialmente alimentação e acompanhamento diário.

Podem ser contratados para: - Um recinto específico. - Um conjunto de
recintos. - Uma área temática.

A produtividade deve depender da quantidade de recintos e animais
atribuídos. Um único tratador não deve conseguir atender um zoológico
inteiro.

------------------------------------------------------------------------

# 6. Limpeza e manutenção dos recintos

## 6.1. Limpeza

Os recintos acumulam sujeira com o passar do tempo. A velocidade de
acúmulo pode depender de: - Quantidade de animais. - Espécie. - Tamanho
do recinto. - Frequência de manutenção. - Tipo de ambiente.

A limpeza influencia: - Qualidade visual. - Bem-estar. - Saúde. -
Reputação do zoológico. - Satisfação dos visitantes.

## 6.2. Limpeza simplificada

Na primeira versão, o jogador pode acompanhar um indicador de limpeza
por recinto e executar ou pagar pela limpeza.

## 6.3. Limpeza avançada

Em uma versão posterior, o jogador contrata auxiliares de limpeza e
atribui áreas de trabalho. A equipe precisa ter capacidade suficiente
para manter o parque em boas condições.

## 6.4. Manutenção geral

Além dos recintos, o parque pode exigir manutenção de: - Caminhos. -
Cercas. - Portões. - Lagos e sistemas de água. - Instalações para
visitantes. - Estruturas de alimentação e serviço. - Decoração e
paisagismo.

------------------------------------------------------------------------

# 7. Funcionários

## 7.1. Contratação

O jogador começa podendo realizar algumas tarefas de forma simplificada.
Conforme o zoológico cresce, deve contratar funcionários para manter a
operação.

Cada funcionário gera custo recorrente, mas aumenta a capacidade
operacional.

## 7.2. Tipos de funcionários

  Funcionário           Responsabilidades
  --------------------- ------------------------------------------
  Tratador              Alimentação e rotina dos animais
  Auxiliar de limpeza   Limpeza dos recintos e áreas
  Veterinário           Exames, diagnósticos e tratamentos
  Biólogo               Acompanhamento das espécies e reprodução
  Administrador         Apoio à gestão geral e operação

A lista pode crescer com funções específicas, como segurança,
manutenção, atendimento e guias.

## 7.3. Atribuições e capacidade

Funcionários podem ser atribuídos a: - Recintos individuais. - Grupos de
recintos. - Áreas temáticas. - Instalações específicas.

Cada funcionário deve ter uma capacidade de trabalho. Quanto maior o
parque, mais funcionários serão necessários.

O jogo deve alertar quando uma equipe estiver sobrecarregada, quando um
recinto não tiver responsável ou quando uma tarefa estiver atrasada.

------------------------------------------------------------------------

# 8. Saúde, doenças e veterinária

## 8.1. Saúde animal

Cada animal ou grupo de animais possui um estado de saúde. O estado pode
ser influenciado por: - Alimentação. - Limpeza. - Bem-estar. - Qualidade
do habitat. - Estresse. - Condições próprias da espécie. - Doenças.

## 8.2. Notificações narrativas

Uma característica importante é comunicar problemas por meio de
mensagens de funcionários.

Exemplo:

> **Tratador --- Recinto dos papagaios**\
> "O papagaio está sem comer há 2 dias e apresenta um comportamento
> diferente."

Outro exemplo:

> **Veterinário**\
> "Foi identificada uma possível doença contagiosa no recinto dos
> felinos."

As mensagens devem apontar o problema e oferecer uma ação para o jogador
investigar.

## 8.3. Doenças

As doenças podem: - Afetar um animal. - Se espalhar para outros animais
da mesma espécie ou de recintos próximos, conforme as regras do jogo. -
Reduzir saúde e bem-estar. - Aumentar despesas. - Exigir isolamento e
tratamento.

O contágio deve ser compreensível e justo. O jogador precisa receber
sinais e tempo para reagir, em vez de perder uma população inteira sem
aviso.

## 8.4. Clínica veterinária

O jogador poderá construir uma clínica veterinária para: - Examinar
animais. - Diagnosticar doenças. - Realizar tratamentos. - Acompanhar
recuperação. - Isolar animais. - Apoiar medidas preventivas.

## 8.5. Quarentena

Animais recém-adquiridos ou suspeitos de doença podem passar por
quarentena antes de serem integrados aos recintos.

O sistema pode incluir: - Área de isolamento. - Tempo de observação. -
Exames. - Liberação após avaliação.

## 8.6. Vacinação e prevenção

Como sistema avançado, o jogador pode investir em prevenção, vacinação e
protocolos sanitários. Isso reduz riscos, mas gera custos e exige equipe
adequada.

------------------------------------------------------------------------

# 9. Visitantes e experiência do público

## 9.1. Visitantes no mapa

Os visitantes devem circular pelo zoológico, observar os animais e
utilizar as instalações.

Eles não devem ser apenas um número na interface: sua presença dá vida
ao parque e permite visualizar o funcionamento do espaço.

## 9.2. Fatores de satisfação

A satisfação pode depender de: - Variedade de espécies. - Quantidade e
diversidade de áreas. - Visibilidade dos animais. - Qualidade dos
recintos. - Limpeza. - Organização dos caminhos. - Banheiros e locais de
descanso. - Alimentação e lojas. - Preço do ingresso. - Lotação e
filas. - Atrações e eventos.

## 9.3. Comentários e avaliações

Os visitantes podem gerar comentários que ajudam o jogador a identificar
problemas.

Exemplos: - "Adorei a área dos felinos!" - "O zoológico está muito
bonito!" - "Os recintos parecem pequenos." - "Faltam bancos para
descansar." - "Não encontrei nenhum lugar para comer." - "O ingresso
está caro para o que o parque oferece."

Os comentários devem refletir situações reais do parque e servir como
orientação, não apenas como mensagens aleatórias.

## 9.4. Circulação e infraestrutura

O jogador deve planejar caminhos e instalações para evitar: - Áreas sem
acesso. - Caminhos confusos. - Congestionamentos. - Longas distâncias
sem descanso. - Falta de serviços.

------------------------------------------------------------------------

# 10. Ingressos e reputação

## 10.1. Preço do ingresso

O jogador pode definir o preço de entrada. O preço influencia a receita
por visitante e a disposição do público em visitar o parque.

O preço ideal deve depender da qualidade e da reputação do zoológico.

## 10.2. Fatores que justificam preços maiores

-   Quantidade de espécies.
-   Diversidade das áreas temáticas.
-   Qualidade dos recintos.
-   Bem-estar dos animais.
-   Limpeza e organização.
-   Paisagismo e decoração.
-   Instalações para visitantes.
-   Atrações especiais.
-   Reputação e satisfação.

O tamanho do zoológico pode contribuir para seu potencial de receita,
mas não deve, sozinho, garantir ingressos caros. Um parque grande e mal
cuidado precisa ser menos atrativo que um parque menor e bem
administrado.

## 10.3. Exemplo ilustrativo de progressão de preço

Os valores abaixo são apenas exemplos de balanceamento, não preços
finais:

  Estágio do zoológico        Exemplo de ingresso
  ------------------------- ---------------------
  Pequeno zoológico                     R\$ 15,00
  Zoológico intermediário               R\$ 35,00
  Zoológico completo                    R\$ 65,00

O jogo deve permitir ajustar o preço e observar o impacto esperado na
procura, na receita e na satisfação.

## 10.4. Reputação

A reputação é uma medida geral da imagem do zoológico. Pode ser
influenciada por: - Bem-estar animal. - Avaliações dos visitantes. -
Limpeza. - Variedade. - Qualidade das instalações. - Ocorrências
negativas. - Eventos e projetos especiais.

A reputação pode desbloquear novas oportunidades, espécies, parcerias e
áreas.

------------------------------------------------------------------------

# 11. Economia e finanças

## 11.1. Receitas

Fontes de renda possíveis: - Ingressos. - Lanchonetes. - Restaurantes. -
Lojas de lembranças. - Estacionamento. - Passeios guiados. -
Experiências especiais. - Eventos temáticos. - Patrocínios e parcerias.

## 11.2. Despesas

Custos possíveis: - Compra de animais. - Alimentação. - Salários. -
Medicamentos. - Tratamentos veterinários. - Limpeza. - Manutenção. -
Construções. - Expansão do terreno. - Decoração. - Equipamentos. -
Serviços e utilidades.

## 11.3. Gestão financeira

O jogador deve ter acesso a: - Saldo atual. - Receita por período. -
Despesas por categoria. - Lucro ou prejuízo. - Custos de cada área. -
Custo por animal ou recinto. - Histórico financeiro. - Previsão de
gastos recorrentes.

## 11.4. Risco de falência

A expansão descontrolada pode levar à falência. O jogador deve
equilibrar investimentos e custos operacionais.

O jogo pode emitir alertas quando: - O saldo estiver baixo. - As
despesas superarem as receitas. - O estoque estiver prestes a acabar. -
Houver funcionários em excesso. - Um recinto gerar custos muito altos. -
A expansão planejada for financeiramente arriscada.

------------------------------------------------------------------------

# 12. Instalações e atrações

Além dos recintos, o zoológico precisa oferecer serviços e estruturas.

## 12.1. Instalações para visitantes

-   Entrada e bilheteria.
-   Banheiros.
-   Bancos e áreas de descanso.
-   Lanchonetes.
-   Restaurantes.
-   Lojas de lembranças.
-   Estacionamento.
-   Bebedouros.
-   Áreas cobertas.
-   Pontos de informação.

## 12.2. Instalações operacionais

-   Depósito de alimentos.
-   Área de preparo de alimentação.
-   Clínica veterinária.
-   Quarentena.
-   Almoxarifado.
-   Centro de manutenção.
-   Instalações para funcionários.

## 12.3. Atrações especiais

-   Passeios guiados.
-   Experiências educativas.
-   Eventos sazonais.
-   Visitas escolares.
-   Programas de conservação.
-   Atividades temáticas.

As atrações devem acrescentar valor à experiência e à economia sem
substituir a importância do cuidado com os animais.

------------------------------------------------------------------------

# 13. Progressão e desbloqueios

A progressão deve dar objetivos claros e apresentar sistemas aos poucos.

## Etapa 1 --- Pequeno zoológico

-   Terreno limitado.
-   Poucas espécies.
-   Recintos básicos.
-   Compra e venda de animais.
-   Capacidade dos recintos.
-   Alimentação e limpeza simplificadas.
-   Ingressos e controle financeiro básico.

## Etapa 2 --- Expansão

-   Novas áreas temáticas.
-   Mais espécies.
-   Recintos maiores.
-   Novas instalações.
-   Funcionários básicos.
-   Maior fluxo de visitantes.

## Etapa 3 --- Gestão completa

-   Reprodução e controle populacional aprofundados.
-   Estoque de alimentos.
-   Tratadores e auxiliares.
-   Clínica veterinária.
-   Saúde e doenças.
-   Quarentena.
-   Gestão detalhada dos recintos.

## Etapa 4 --- Grande zoológico

-   Grandes áreas temáticas.
-   Espécies raras.
-   Atrações especiais.
-   Eventos.
-   Pesquisa e conservação.
-   Operação com várias equipes.

## Etapa 5 --- Conteúdo fantástico

-   Área mística.
-   Criaturas fantásticas.
-   Recintos especiais.
-   Novos recursos e desafios.
-   Eventos exclusivos.

Os desbloqueios podem exigir reputação, dinheiro, objetivos concluídos
ou desenvolvimento de áreas anteriores.

------------------------------------------------------------------------

# 14. Sistemas adicionais e expansões futuras

Estes sistemas não precisam estar presentes na primeira versão. São
possibilidades para aprofundar o jogo depois que o ciclo principal
estiver divertido e estável.

## 14.1. Estações do ano

Mudanças sazonais podem afetar: - Aparência do parque. - Necessidades de
algumas espécies. - Consumo de recursos. - Frequência de visitantes. -
Decoração e eventos.

## 14.2. Clima

Chuva, calor e frio podem influenciar o funcionamento do parque e exigir
adaptações nos habitats.

## 14.3. Eventos

Exemplos: - Noite no zoológico. - Semana dos felinos. - Festival de
aves. - Eventos educativos. - Datas comemorativas. - Exposições
temporárias.

## 14.4. Pesquisa e desenvolvimento

Investimentos em pesquisa podem desbloquear: - Melhorias de habitat. -
Novos alimentos. - Tratamentos. - Equipamentos. - Estruturas. -
Programas de conservação.

## 14.5. Resgate animal

O zoológico pode receber animais resgatados que precisam de tratamento,
reabilitação ou um recinto adequado.

## 14.6. Conservação

Projetos de conservação podem gerar reputação, objetivos e recompensas.
O jogador pode participar de programas de reprodução e preservação.

## 14.7. Fugas

Cercas e portões mal conservados podem permitir fugas. Esse sistema deve
ser introduzido apenas quando o jogador tiver ferramentas suficientes
para prevenir e resolver ocorrências.

## 14.8. Educação ambiental

Placas informativas, visitas escolares e atividades educativas podem
aumentar a satisfação e a reputação.

## 14.9. Genética e reprodução avançada

Como recurso opcional, espécies podem ter características hereditárias
ou programas de reprodução específicos. Isso deve ser implementado com
cuidado para não transformar o gerenciamento em excesso de microgestão.

------------------------------------------------------------------------

# 15. Ciclo principal de jogabilidade

O ciclo principal deve ser fácil de compreender e se repetir de forma
interessante:

1.  **Planejar:** observar o terreno, o orçamento e as necessidades do
    zoológico.
2.  **Construir:** criar caminhos, recintos e instalações.
3.  **Adquirir:** comprar animais adequados aos recintos.
4.  **Cuidar:** garantir alimentação, limpeza, saúde e bem-estar.
5.  **Atrair:** oferecer variedade, qualidade e serviços aos visitantes.
6.  **Receber:** vender ingressos e gerar receitas.
7.  **Administrar:** pagar custos, contratar funcionários e corrigir
    problemas.
8.  **Expandir:** investir em novos terrenos, biomas, espécies e
    atrações.
9.  **Otimizar:** melhorar recintos, controlar população e aumentar a
    eficiência.
10. **Desbloquear:** conquistar novos conteúdos e desafios.

O ciclo deve criar decisões recorrentes: ampliar um recinto ou construir
outro? Comprar uma nova espécie ou contratar mais tratadores? Aumentar o
ingresso ou melhorar a experiência? Vender animais excedentes ou
expandir o espaço?

------------------------------------------------------------------------

# 16. Sistemas conectados: exemplos de causa e consequência

A profundidade do jogo vem da conexão entre os sistemas.

## Exemplo A --- Crescimento populacional

1.  Os animais se reproduzem.
2.  A população do recinto aumenta.
3.  O consumo de alimento cresce.
4.  A limpeza precisa ser mais frequente.
5.  O espaço disponível diminui.
6.  O bem-estar pode cair.
7.  O jogador precisa ampliar o recinto, transferir ou vender animais.

## Exemplo B --- Zoológico maior

1.  O jogador compra um novo terreno.
2.  Constrói novos recintos e áreas.
3.  Adquire mais espécies.
4.  O parque atrai mais visitantes.
5.  A receita potencial aumenta.
6.  Os custos de alimentação, salários e manutenção também aumentam.
7.  O jogador precisa contratar e organizar equipes.

## Exemplo C --- Problema de saúde

1.  Um tratador percebe que um animal não está comendo.
2.  O jogador recebe uma notificação.
3.  O animal é investigado.
4.  O veterinário identifica uma doença.
5.  O animal é tratado ou isolado.
6.  O jogador evita ou reduz a propagação.
7.  A prevenção e a estrutura veterinária passam a ter valor
    estratégico.

## Exemplo D --- Qualidade e preço do ingresso

1.  O jogador melhora os recintos e a limpeza.
2.  A satisfação dos visitantes aumenta.
3.  A reputação melhora.
4.  O parque passa a justificar um ingresso maior.
5.  O jogador ajusta o preço.
6.  A procura e a receita mudam conforme o equilíbrio entre preço e
    qualidade.

------------------------------------------------------------------------

# 17. Notificações e comunicação com o jogador

O jogo deve comunicar problemas de forma clara, contextual e acionável.

Tipos de notificação: - Avisos de capacidade. - Estoque baixo. -
Alimentação pendente. - Limpeza atrasada. - Animal doente. - Possível
contágio. - Nascimento. - Recinto vazio. - Funcionário sobrecarregado. -
Queda de satisfação. - Problema financeiro. - Oportunidade de
desbloqueio.

Cada notificação importante deve, quando possível, oferecer um atalho
para o local ou painel relacionado.

Exemplos: - "O recinto das capivaras está próximo da capacidade
máxima." - "O estoque de frutas está baixo." - "A limpeza da área
africana está atrasada." - "Um novo filhote nasceu no recinto dos
pinguins." - "Os visitantes estão reclamando da falta de bancos." - "O
veterinário identificou sintomas que exigem investigação."

As mensagens narrativas devem complementar indicadores objetivos, não
substituí-los.

------------------------------------------------------------------------

# 18. Balanceamento e princípios de justiça

O jogo deve ser desafiador, mas não injusto.

Princípios: - Problemas graves devem ser precedidos por alertas. - O
jogador precisa entender por que um indicador piorou. - Ações
importantes devem mostrar custos e consequências. - O crescimento deve
aumentar tanto as oportunidades quanto as responsabilidades. - Nenhum
sistema deve exigir microgerenciamento excessivo o tempo todo. - A
automação por funcionários deve ser uma escolha estratégica. - O jogador
deve poder corrigir erros antes de perder animais ou falir. - O tamanho
do zoológico não deve ser a única medida de sucesso. - Bem-estar animal
deve ter peso real na avaliação do parque.

------------------------------------------------------------------------

# 19. Escopo recomendado de desenvolvimento

Para tornar o projeto viável, recomenda-se desenvolver em fases. A
primeira meta é criar um ciclo de jogo funcional, não implementar todos
os sistemas de uma vez.

## Fase 1 --- Protótipo jogável (prioridade máxima)

### Construção

-   Mapa 2D top-down.
-   Terreno inicial.
-   Construção de recintos.
-   Caminhos básicos.
-   Expansão de recintos.
-   Decoração simples.

### Animais

-   Algumas espécies iniciais.
-   Compra e venda.
-   População atual e capacidade.
-   Indicadores básicos por recinto.
-   Reprodução simples.

### Operação

-   Alimentação simplificada.
-   Limpeza simplificada.
-   Custos recorrentes.
-   Alertas de superlotação.

### Visitantes e economia

-   Visitantes representados no mapa ou por sistema simplificado.
-   Venda de ingressos.
-   Preço ajustável.
-   Receita e despesas.
-   Satisfação básica.

### Interface

-   Barra de recursos.
-   Menus de construção e animais.
-   Tooltip ao passar o mouse.
-   Painel de recinto.
-   Notificações básicas.

**Critério de conclusão:** o jogador consegue construir um recinto,
adquirir animais, cuidar deles, receber visitantes, gerar receita e
expandir o zoológico.

## Fase 2 --- Gestão aprofundada

-   Funcionários.
-   Atribuição de equipes.
-   Estoque de alimentos.
-   Alimentação mais detalhada.
-   Limpeza por funcionários.
-   Veterinários.
-   Clínica.
-   Doenças.
-   Tratamentos.
-   Quarentena.
-   Reprodução mais detalhada.
-   Visitantes com avaliações.
-   Serviços comerciais.
-   Relatórios financeiros.

**Critério de conclusão:** o zoológico funciona como uma operação com
equipes, rotinas, problemas e decisões administrativas.

## Fase 3 --- Conteúdo e profundidade

-   Novos biomas.
-   Mais espécies.
-   Estações e clima.
-   Eventos.
-   Pesquisa.
-   Conservação.
-   Resgate animal.
-   Atrações especiais.
-   Novas instalações.
-   Expansões de terreno.

**Critério de conclusão:** o jogador possui objetivos de longo prazo e
variedade suficiente para desenvolver um parque singular.

## Fase 4 --- Universo fantástico

-   Área mística.
-   Criaturas originais.
-   Habitats especiais.
-   Regras e recursos próprios.
-   Eventos e objetivos exclusivos.

**Critério de conclusão:** o conteúdo fantástico amplia a experiência
sem comprometer a coerência dos sistemas principais.

------------------------------------------------------------------------

# 20. Requisitos funcionais resumidos

Esta lista serve como referência para planejamento e implementação.

  ID      Sistema        Requisito
  ------- -------------- ---------------------------------------------
  RF-01   Mapa           Exibir o zoológico em visão 2D superior
  RF-02   Construção     Permitir construir recintos
  RF-03   Construção     Permitir ampliar recintos
  RF-04   Construção     Permitir construir caminhos e instalações
  RF-05   Terreno        Permitir expansão do parque
  RF-06   Recintos       Controlar capacidade e população
  RF-07   Interface      Exibir dados ao passar o mouse
  RF-08   Animais        Permitir comprar animais
  RF-09   Animais        Permitir vender ou transferir animais
  RF-10   Animais        Controlar espécie e população
  RF-11   Reprodução     Gerar nascimentos segundo regras da espécie
  RF-12   Alimentação    Controlar estoque e consumo
  RF-13   Limpeza        Controlar condição de limpeza dos recintos
  RF-14   Saúde          Controlar saúde e bem-estar
  RF-15   Funcionários   Permitir contratar e atribuir funcionários
  RF-16   Veterinária    Permitir diagnóstico e tratamento
  RF-17   Doenças        Representar doenças e possíveis contágios
  RF-18   Visitantes     Gerar fluxo de visitantes
  RF-19   Visitantes     Calcular satisfação
  RF-20   Economia       Permitir definir preço do ingresso
  RF-21   Economia       Calcular receitas e despesas
  RF-22   Progressão     Desbloquear biomas e espécies
  RF-23   Notificações   Alertar sobre problemas e eventos
  RF-24   Áreas          Permitir organizar o zoológico por biomas
  RF-25   Conteúdo       Suportar área fantástica futura

------------------------------------------------------------------------

# 21. Indicadores principais do jogo

Quatro indicadores devem sintetizar a saúde geral do zoológico:

## Bem-estar animal

Considera saúde, espaço, alimentação, limpeza, habitat e cuidados.

## Satisfação dos visitantes

Considera variedade, visibilidade dos animais, preço, serviços,
circulação e qualidade geral.

## Saúde financeira

Considera saldo, receitas, despesas, salários, manutenção e
investimentos.

## Qualidade ambiental

Considera paisagismo, limpeza, vegetação, decoração e adequação dos
recintos.

Esses indicadores devem ser detalhados por recinto ou área sempre que
possível. Uma média geral não pode esconder um recinto em situação
crítica.

------------------------------------------------------------------------

# 22. Decisões de design ainda em aberto

Os pontos abaixo precisam ser definidos durante o planejamento técnico e
o protótipo:

1.  **Formato exato da câmera:** top-down puro ou perspectiva 2D
    levemente isométrica.
2.  **Construção em grade:** definir tamanho dos tiles, liberdade de
    posicionamento e regras de colisão.
3.  **Simulação de visitantes:** agentes individuais no mapa ou cálculo
    agregado no início.
4.  **Escala temporal:** duração de um dia, velocidade do tempo e
    pausas.
5.  **Nível de detalhe animal:** indivíduos com dados próprios ou grupos
    simplificados na primeira versão.
6.  **Reprodução:** frequência, condições e regras específicas por
    espécie.
7.  **Compra e venda:** mercado fixo, fornecedores, negociações ou
    sistema de ofertas.
8.  **Funcionários:** contratação individual, equipes e limites de
    atribuição.
9.  **Alimentação:** estoque global ou estoques por área.
10. **Doenças:** nível de complexidade, frequência e formas de
    prevenção.
11. **Expansão:** compra de terrenos ou desbloqueio por objetivos.
12. **Progressão:** campanha com objetivos, modo livre ou ambos.
13. **Área fantástica:** conteúdo desbloqueável no mesmo jogo ou
    expansão separada.
14. **Plataformas e tecnologia:** ainda não definidas.

Essas decisões não impedem a concepção do jogo. Devem ser resolvidas com
protótipos e testes, priorizando diversão, clareza e desempenho.

------------------------------------------------------------------------

# 23. Resumo executivo

**Faunópolis** é um jogo de construção, simulação e gestão de
zoológico com visão superior 2D, inspirado na leitura visual de jogos
como *Urbs*.

O jogador começa com um parque pequeno e deve construir recintos,
adquirir animais, controlar a população, garantir alimentação e limpeza,
contratar funcionários, cuidar da saúde dos animais, atrair visitantes e
administrar o dinheiro.

O zoológico cresce por meio da expansão do terreno e da criação de áreas
temáticas baseadas em biomas e regiões, como África, Brasil, manguezal,
região árida, Ásia e região polar. Cada área possui identidade visual e
espécies próprias.

Os recintos têm capacidade definida e exibem informações rápidas ao
passar o mouse, como população atual/capacidade, bem-estar, limpeza e
saúde. Os animais podem se reproduzir, fazendo com que o jogador precise
equilibrar crescimento populacional, espaço e custos.

A qualidade do parque influencia sua reputação, a satisfação dos
visitantes e o preço que pode cobrar pelos ingressos. Ao mesmo tempo, o
aumento de visitantes e animais eleva despesas com alimentação,
salários, manutenção e serviços.

A primeira versão deve priorizar construção, recintos, animais,
capacidade, reprodução simples, alimentação e limpeza simplificadas,
visitantes e economia. Funcionários, doenças, veterinária, pesquisa,
conservação, clima e eventos podem aprofundar o jogo em fases
posteriores.

Por fim, uma área fantástica pode expandir o universo com dragões,
centauros, grifos e outras criaturas, usando os mesmos fundamentos de
gestão em habitats especiais.

**A essência do jogo é fazer o jogador crescer sem perder o controle: um
zoológico maior pode render mais, mas só será realmente bem-sucedido se
os animais estiverem bem cuidados, os visitantes satisfeitos e as contas
equilibradas.**
