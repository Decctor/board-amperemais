# Novo onboarding: CRM e ERP

Status: planejamento de produto e implementação, consolidado em 05/09/2026. Este documento descreve o comportamento desejado; não representa funcionalidades já implementadas.

## 1. Objetivo e posicionamento

Criar duas jornadas de ativação com um cadastro de organização compartilhado. Cada jornada conduz ao primeiro resultado relevante para o produto escolhido.

| Produto | Promessa principal | Primeiro resultado desejado |
| --- | --- | --- |
| CRM | Fazer os clientes voltarem, com fidelização, cashback e campanhas. | Entender o incentivo à próxima compra, reconhecer sua base e preparar ações de retenção. |
| ERP | Oferecer uma experiência melhor para vender, no balcão, no catálogo/cardápio e nos fluxos de compra. | Experimentar uma compra com seus produtos e acompanhar sua chegada à operação. |

O CRM permanece o principal motor comercial da RecompraCRM. No ERP, organização, estoque, compras e backoffice sustentam a venda e aparecem em segundo plano na apresentação inicial.

O cashback participa dos dois produtos: no ERP, integra a experiência de compra; no CRM, oferece um incentivo para o retorno do cliente.

## 2. Princípios comuns

- Preservar a intenção de quem chegou: a origem comercial do cadastro determina a jornada quando conhecida.
- Reaproveitar dados da organização ao habilitar o segundo produto. Não repetir o cadastro nem configurações compartilhadas já concluídas.
- Pedir informações no momento em que elas alteram a experiência ou são necessárias para uma ação.
- Salvar o progresso e permitir retomada após fechar a página, trocar de dispositivo ou retornar de uma autorização externa.
- Separar cadastro concluído, recurso configurado, recurso pronto para uso e resultado comercial alcançado.
- Permitir continuidade enquanto importações e aprovações externas estão em andamento.
- Exibir estados reais. Selecionar uma campanha ou conectar um número não significa que os envios já funcionam.
- Não exigir demonstrações com dados reais quando uma simulação identificada resolve a compreensão. Simulações não geram efeitos comerciais.
- Não prometer aumento de receita nem apresentar estimativas sem dados suficientes.

Quando a intenção de entrada for desconhecida, perguntar:

> O que você quer melhorar primeiro?
>
> Fazer meus clientes voltarem · Preparar minha empresa para vender

A escolha define o primeiro percurso, sem impedir o uso posterior do outro produto. Não significa contratação automática de módulos ou mudança de plano.

## 3. Jornada do CRM

### 3.1. Sequência principal

| Etapa | Informação ou decisão | Resultado e continuidade |
| --- | --- | --- |
| 1. Conhecer a empresa | Dados básicos, segmento e sistema utilizado para registrar vendas. | Criar ou reutilizar a organização e orientar os próximos passos. |
| 2. Preparar a entrada de dados | Conectar o sistema existente ou escolher começar pelo registro no balcão. | Iniciar a importação em segundo plano assim que a integração estiver disponível. Permitir configurar depois. |
| 3. Preparar o cashback | Revisar o preset do segmento e confirmar as condições. | Deixar o programa preparado e explicar como ele participa da próxima compra. |
| 4. Preparar campanhas iniciais | Selecionar sugestões compatíveis com segmento e programa. | Salvar campanhas preparadas, com dependências visíveis; não exigir histórico completo. |
| 5. Preparar o WhatsApp | Conectar pelo caminho oficial e orientar pagamento e templates. | Acompanhar a prontidão dos envios. Permitir conectar depois. |
| 6. Entrar no CRM | Exibir o que já funciona, progresso de importação e próxima ação. | Continuar a ativação no espaço de trabalho. |

As etapas organizam a interface, mas não serializam todo o trabalho técnico. A carga de dados continua durante cashback, campanhas e WhatsApp. Processos de aprovação começam assim que seus requisitos estiverem atendidos.

### 3.2. Dados da empresa

Solicitar apenas dados necessários à criação da organização, às obrigações já existentes do cadastro e à personalização. Segmento e sistema atual têm prioridade por influenciarem o programa e a integração. Logo, informações complementares e perguntas de aquisição que não alteram o percurso podem ser adiadas.

A implementação deve revisar quais campos são realmente obrigatórios nos contratos atuais antes de simplificar a interface. Este plano não determina remover validações de cadastro indiscriminadamente.

### 3.3. Entrada de dados

Oferecer conexão com o sistema utilizado, registro pelo balcão/Ponto de Interação e continuidade para configuração posterior. Importação por arquivo pode ser uma alternativa quando suportada; não deve ser apresentada como disponível sem implementação.

Escolher uma fonte, autorizar uma integração e receber dados são acontecimentos diferentes. A interface deve distinguir cada um.

Para uma organização sem histórico, orientar como começar a registrar clientes e compras. A falta de dados antigos não impede configurar cashback e campanhas destinadas a eventos futuros.

### 3.4. Cashback

Aplicar um preset por nicho como ponto de partida editável. O lojista confirma se a oferta faz sentido para seu negócio.

Dar destaque a acúmulo, validade e condições de resgate; deixar detalhes avançados acessíveis progressivamente. O exemplo deve refletir a configuração selecionada:

> Uma compra de R$ 100 gera R$ 5 para usar na próxima visita.

Os valores acima são ilustrativos. Mostrar também a validade e o limite de uso correspondentes. Não apresentar o preset como garantia de margem ou retorno.

Uma simulação deve demonstrar compra, crédito e uso posterior sem criar saldo, venda ou movimentação real. A experiência real de fidelização começa quando o programa é utilizado com um cliente.

### 3.5. Campanhas iniciais

Apresentar poucas sugestões, com uma recomendação principal e alternativas. Explicar quem recebe, quando recebe e qual mensagem será enviada.

Antes de haver cobertura suficiente do histórico, fundamentar a recomendação no segmento e na configuração confirmada do programa:

> Para começar, sugerimos estas campanhas para seu segmento e programa de cashback.

Não afirmar que uma campanha tem um público identificado quando ele ainda não foi calculado com dados suficientes.

| Campanha | Dependência a considerar |
| --- | --- |
| Boas-vindas na primeira compra | Capacidade de determinar primeira compra; não confundir primeira venda importada com primeira compra real. |
| Recuperação de clientes | Histórico suficiente para localizar candidatos e verificar ausência de compras posteriores. |
| Cashback prestes a expirar | Créditos existentes, regras de validade e público elegível. |
| Aniversário | Datas de aniversário disponíveis e demais condições de envio. |

Uma campanha selecionada pode estar preparada e ainda depender de dados, canal, pagamento, template ou liberação pelo usuário. A contagem de campanhas selecionadas não deve aparecer como contagem de automações em execução.

Quando os dados permitirem, acrescentar públicos e oportunidades reais. A disponibilidade dessa informação não altera o que o usuário já configurou sem sua escolha.

### 3.6. WhatsApp e dependências externas

A conexão oficial é o caminho principal e recomendado. Retirar a apresentação da conexão não oficial como opção equivalente ou como vantagem de começar “sem burocracia”. Se mantida, deixá-la em opções adicionais ou em um percurso assistido.

Permitir avançar com uma ação secundária clara:

> Conectar depois
>
> Você pode preparar suas campanhas agora. Os envios ficam pendentes até concluir a configuração.

Representar separadamente:

- Número conectado e utilizável.
- Configuração de pagamento necessária ao canal.
- Template submetido, em análise, aprovado ou com pendência.
- Dados e destinatários suficientes para a campanha.
- Escolha do usuário de habilitar os envios.

Não prometer prazo fixo para aprovação externa. Quando houver falha ou rejeição, indicar uma ação específica de correção. A liberação posterior deve respeitar a escolha explícita de ativação, evitando disparos inesperados quando uma dependência for resolvida.

### 3.7. Conclusão e primeiro valor

Substituir a conclusão genérica “Tudo pronto” por uma mensagem coerente com o estado real, como “Seu programa está preparado”.

No espaço de trabalho, mostrar:

- Vendas válidas e clientes já disponíveis.
- Período completamente importado e trabalho ainda em andamento.
- Funcionalidades que já podem ser utilizadas.
- Próxima ação relevante sob controle do usuário.
- Oportunidades fundamentadas, quando a base permitir.

O primeiro valor não precisa ocorrer em uma etapa fixa. Reconhecer seus clientes cria confiança; experimentar o cashback explica a proposta; identificar uma oportunidade torna o CRM acionável. A primeira recompra é um resultado posterior e deve ser medida separadamente.

## 4. Importação de histórico em segundo plano

### 4.1. Escopo inicial

Buscar uma base comercial relevante, sem limitar a carga total a 10 ou 25 pedidos.

Ponto de partida proposto: importar vendas válidas dos últimos 90 dias e ampliar gradualmente até 12 meses, conforme disponibilidade do provedor e necessidade do produto. Esses períodos são parâmetros iniciais de planejamento, a validar por segmento e volume; não são prazos nem critérios universais de ativação.

Separar:

| Decisão | Regra |
| --- | --- |
| Escopo desejado | Janela de histórico comercial que queremos completar. |
| Lote de execução | Quantidade de trabalho que pode ser executada com segurança antes de salvar progresso e reagendar. |
| Liberação de análises | Cobertura e qualidade exigidas por cada cálculo ou campanha. |

Começar por intervalos recentes e avançar para trás, concluindo janelas menores. Respeitar os filtros e a ordenação efetivamente suportados pelo provedor; não assumir que sua primeira página contém as vendas mais recentes.

A organização continua o onboarding e pode sair da aplicação enquanto a carga avança.

### 4.2. Filtrar antes de enriquecer

1. Aplicar filtros de situação na API quando disponíveis e compatíveis com a definição de venda válida do produto.
2. Avaliar a situação na listagem antes de buscar detalhes, quando essa informação for suficiente.
3. Buscar detalhes dos pedidos elegíveis. Buscar detalhes para decidir elegibilidade apenas quando necessário.
4. Resolver os clientes associados, evitando consultas repetidas desnecessárias.
5. Persistir os dados essenciais e o progresso do lote.
6. Adiar enriquecimentos de produtos que não sejam necessários à função inicial do CRM.

Reutilizar as regras de validade existentes e verificar sua correspondência com os estados de cada provedor. Não criar uma regra independente apenas para onboarding. Estados desconhecidos não devem ser descartados silenciosamente como inválidos.

Priorizar identificador, data, situação, valor da venda e vínculo com o cliente. Dados dos itens podem continuar necessários à estrutura de importação, mas isso não exige buscar imediatamente todo o cadastro de cada produto.

### 4.3. Carga histórica e sincronização contínua

Na carga histórica, pedidos inválidos podem ser ignorados para enriquecimento e persistência comercial, conforme a política de importação.

Na sincronização contínua, acompanhar transições: um pedido ignorado pode tornar-se válido, e uma venda importada pode ser cancelada ou corrigida. O filtro inicial não pode impedir essas atualizações.

Vendas novas e atualizações operacionais devem ter prioridade sobre o histórico antigo. Definir um marco de início da carga e reconciliar a sobreposição entre histórico e atualizações para evitar lacunas e duplicação.

Importar histórico não deve, por padrão:

- Disparar mensagens de boas-vindas ou outros eventos passados.
- Conceder cashback retroativo.
- Movimentar estoque ou financeiro como se uma nova venda tivesse acabado de ocorrer.

Qualquer migração de saldos ou efeitos retroativos exige um processo próprio, com regras explícitas.

### 4.4. Execução e recuperação

- Usar trabalho persistente em segundo plano, independente da aba e da requisição do onboarding.
- Salvar progresso por integração, intervalo e página/cursor, incluindo pendências e falhas.
- Coordenar limites entre processos conforme o escopo da quota do provedor, não apenas em memória dentro de uma instância.
- Respeitar rate-limit, instruções de espera e limites diários; reagendar sem manter uma requisição longa aguardando.
- Repetir trabalho de maneira idempotente, sem duplicar entidades nem efeitos comerciais.
- Evitar que o término de uma página ou o limite técnico de uma execução seja interpretado como conclusão de toda a janela.
- Preservar dados e progresso válidos quando uma etapa falhar. Indicar separadamente necessidade de reconexão e espera temporária.
- Retomar após refresh, retorno de OAuth ou reconexão sem criar cargas concorrentes duplicadas.

A escolha de infraestrutura de jobs, persistência de progresso e tamanho dos lotes pertence ao detalhamento técnico. Deve partir dos mecanismos existentes no repositório.

### 4.5. Cobertura e confiança

Quantidade recebida não equivale a cobertura temporal completa.

Uma análise de recuperação precisa localizar candidatos e confirmar que não há compras posteriores no período pertinente. Uma primeira compra importada não estabelece que o cliente nunca comprou antes. Segmentações e métricas devem respeitar a janela efetivamente coberta.

Se houver lacunas, falhas de páginas ou status ainda não resolvidos, não classificar a cobertura como concluída para os cálculos que dependem desses dados.

Durante a carga, permitir listas e prévias identificadas como parciais. Não liberar conclusões que dependam de ausência de eventos apenas porque já existem alguns registros.

### 4.6. Comunicação de progresso

Exemplo ilustrativo:

> 126 vendas importadas. Estamos buscando o restante do histórico.
>
> Você pode continuar configurando suas campanhas.

Mostrar o período concluído separadamente do período em processamento. Evitar porcentagens quando o total for desconhecido. Não transformar a página inicial em uma tela de espera bloqueante.

### 4.7. Evidências que orientam o plano

O teste exploratório local do Bling mostrou uma listagem rápida, enquanto detalhes, contatos e produtos ampliaram o custo de requisições. Uma amostra de 100 pedidos encontrou 91 contatos e 252 produtos distintos, e o enriquecimento foi interrompido por rate-limit. A transformação local das amostras menores foi pequena em comparação com o tempo de rede e de controle de requisições.

Nas amostras de 10 e 25 pedidos, somente dois eram vendas válidas pelas regras atuais. Isso reforça a prioridade de filtrar antes de enriquecer, mas não demonstra a distribuição de situações de toda a conta nem o ganho exato dessa otimização.

Esses testes não mediram o histórico inteiro, a persistência comercial nem o ambiente de produção. Uma máquina mais potente não elimina quotas do provedor. Os artefatos temporários do teste foram removidos; o plano preserva apenas as conclusões relevantes.

## 5. Jornada do ERP

### 5.1. Entrada orientada à venda

Perguntar:

> Como você quer vender com a Recompra?

Oferecer balcão, catálogo/cardápio digital e mesas/comandas, conforme os recursos disponíveis. Permitir múltiplos usos, escolhendo um para preparar primeiro.

Usar segmento e canal para aplicar presets. Não exigir que o usuário configure todos os módulos antes de experimentar a venda.

### 5.2. Sequência principal

| Etapa | Experiência | Critério de progresso |
| --- | --- | --- |
| 1. Escolher como vender | Definir o canal inicial e conhecer a operação. | Percurso adequado à intenção do lojista. |
| 2. Colocar os primeiros produtos | Importar ou cadastrar um conjunto que permita experimentar a compra. | Produtos com os dados necessários ao canal, sem exigir catálogo completo. |
| 3. Preparar a experiência | Ajustar apresentação, categorias e opções de compra relevantes. | Uma experiência reconhecível como a loja do usuário. |
| 4. Preparar um incentivo | Oferecer cashback ou cupom e mostrar seu efeito na compra. | Confirmar as condições ou configurar depois. |
| 5. Experimentar uma compra | Percorrer o lado do cliente e acompanhar a chegada à operação. | Compreender o fluxo completo em ambiente de teste identificado. |
| 6. Começar a vender | Resolver pendências necessárias e disponibilizar o canal. | Canal apto ao uso real pretendido. |

### 5.3. Primeiro resultado por canal

| Canal | Experiência que deve ser demonstrada |
| --- | --- |
| Balcão | Encontrar produtos, montar a venda, entender pagamento e aplicação de benefício quando configurado. |
| Catálogo/cardápio digital | Ver a loja com seus produtos, escolher itens, percorrer a compra e acompanhar o pedido recebido. |
| Mesas/comandas | Abrir o atendimento pertinente, adicionar um pedido e compreender seu acompanhamento e fechamento. |

Preservar os conceitos do domínio existentes: ponto de atendimento, conta, pedido e venda têm papéis diferentes. O onboarding apresenta o percurso apropriado sem redefinir essas entidades.

O resultado desejado é o lojista reconhecer sua experiência de venda funcionando. A simulação deve ser identificada e isolada de cobranças, estoque, cashback, documentos fiscais e envios reais.

### 5.4. Bases de produtos e clientes

Uma base completa de clientes não é condição para começar. Oferecer importação quando suportada ou permitir construir a base durante os atendimentos.

Para produtos, pedir os campos que o primeiro canal exige. Variantes, adicionais, disponibilidade e outras condições devem aparecer quando necessários ao produto vendido. Um conjunto pequeno e utilizável é suficiente para a primeira experiência; o catálogo pode ser ampliado depois.

### 5.5. Incentivos na compra

Cashback e cupons devem aparecer dentro da experiência de compra e com regras compreensíveis. A organização pode adiar essa configuração.

Reaproveitar programas e configurações existentes quando o CRM já estiver habilitado. Não criar programas duplicados nem oferecer incentivos sem a confirmação das condições pelo lojista.

### 5.6. Operação e backoffice

Apresentar estoque, compras e financeiro como continuidade da venda:

> Acompanhe o estoque dos produtos que você vende.
>
> Veja os recebimentos dos seus pedidos.

Dados e configurações necessários à operação escolhida devem ser resolvidos antes do uso real correspondente. Configuração fiscal pode ser adiada durante cadastro, exploração e simulação; o início da operação precisa considerar os requisitos aplicáveis. Não apresentar a possibilidade de adiar como liberação irrestrita para vender ou emitir documentos.

O checklist de lançamento varia por canal. Não impor uma configuração extensa de backoffice a todos os usuários.

### 5.7. Continuidade para o CRM

Após a primeira experiência de venda, apresentar a próxima oportunidade:

> Prepare um incentivo para a próxima compra do seu cliente.

A ativação do CRM reaproveita organização, produtos, clientes e vendas disponíveis. Completa apenas as configurações necessárias à retenção e ao canal de comunicação, respeitando contratação e permissões.

## 6. Estados e retomada

O progresso deve pertencer à organização e ao produto, com permissões apropriadas para quem configura cada recurso. A etapa visual é uma referência de navegação, não a única fonte de verdade sobre a prontidão.

Manter independentes:

- Cadastro da organização e jornada escolhida.
- Conclusão da configuração inicial de CRM e ERP.
- Fonte de dados conectada, carga em andamento e cobertura disponível.
- Programa de benefícios configurado e habilitado.
- Campanhas selecionadas, prontas e habilitadas para envio.
- Conexão e condições operacionais do WhatsApp.
- Canal de venda do ERP configurado e disponibilizado.

Ao retornar, recuperar os estados reais e indicar a próxima ação pertinente. Não repetir configurações já concluídas nem interpretar uma etapa adiada como uma configuração realizada.

Se o usuário concluir o onboarding com pendências, a aplicação deve oferecer continuidade contextual sem redirecioná-lo permanentemente para o início do fluxo.

## 7. Métricas de ativação

### CRM

- Tempo até primeira listagem e primeiro conjunto de vendas válidas disponível.
- Tempo e taxa de conclusão da janela histórica inicial, por provedor.
- Requisições por venda válida, incidência de rate-limit e recuperação de falhas.
- Tempo até visualização da base e da primeira oportunidade fundamentada.
- Programa configurado e primeiro cashback real utilizado no fluxo adequado.
- Campanha preparada, pronta para enviar e primeira entrega real.
- Recompra observada, com critérios de atribuição explícitos quando aplicada a campanhas.

### ERP

- Canal inicial escolhido e primeiros produtos utilizáveis.
- Primeira compra simulada concluída.
- Canal disponibilizado e primeira operação real.
- Uso recorrente nos dias seguintes.
- Adoção de cashback/cupons e ativação posterior de CRM.

### Comuns

- Abandono, adiamento e retomada por etapa.
- Pendências sob controle do usuário versus dependências externas.
- Separação entre configuração concluída, primeiro uso real e resultado comercial.

Não tratar conclusão de formulário ou simulação como prova de retorno financeiro.

## 8. Frentes de implementação

1. Revisar contratos atuais: criação da organização, retomada, integração, validade das vendas, campanhas, cashback e permissões.
2. Estruturar progresso por produto e estados de prontidão, preservando organizações existentes.
3. Implementar a carga histórica persistente com filtro antecipado, cobertura e isolamento de efeitos comerciais.
4. Reordenar o CRM para conectar a fonte cedo, permitir adiamentos e representar campanhas preparadas.
5. Ajustar o caminho principal do WhatsApp e o acompanhamento das dependências.
6. Criar a entrada no CRM com progresso, recursos disponíveis e oportunidades condicionadas à qualidade dos dados.
7. Estruturar o ERP por canal de venda, com catálogo inicial e experiência de compra de teste.
8. Instrumentar os eventos e validar o percurso completo com organizações representativas.

## 9. Critérios de aceite

- A intenção de CRM ou ERP é preservada e o segundo produto reaproveita o cadastro existente.
- O onboarding continua durante importação ou aprovação externa, inclusive após fechar e reabrir a aplicação.
- A primeira carga busca a janela configurada, sem encerrar definitivamente após uma pequena amostra.
- Pedidos inválidos não geram enriquecimento desnecessário quando a listagem permite a decisão.
- Mudanças futuras de situação são reconciliadas e cancelamentos de vendas importadas são tratados.
- Retry e retomada não duplicam registros nem efeitos comerciais.
- Histórico importado não dispara campanhas, cashback ou efeitos operacionais retroativos por padrão.
- Nenhuma análise dependente de cobertura completa é liberada com base apenas em uma amostra parcial.
- WhatsApp oficial tem destaque; adiar é possível e os envios pendentes são explicitados.
- Campanhas selecionadas não são apresentadas como executando antes de estarem prontas e habilitadas.
- O ERP permite experimentar o canal escolhido com produtos próprios sem exigir uma base completa de clientes.
- Simulações são identificadas e não afetam a operação real.
- A conclusão informa o estado real e uma próxima ação útil.

## 10. Definições ainda necessárias

- Confirmar 90 dias como janela inicial e regras de expansão até 12 meses por segmento/provedor.
- Verificar filtros e campos de situação disponíveis em cada conector antes de estimar o ganho do filtro antecipado.
- Definir infraestrutura de execução, orçamento dos lotes e coordenação de quotas a partir dos mecanismos existentes.
- Formalizar os critérios de cobertura e qualidade exigidos por cada análise e campanha.
- Definir quais campanhas serão sugeridas por segmento e em que momento o usuário autoriza sua ativação.
- Definir o tratamento comercial do período de teste quando dependências externas atrasarem a ativação.
- Detalhar a experiência de simulação e o checklist de lançamento de cada canal do ERP.
- Detalhar a localização e disponibilidade da conexão não oficial fora do caminho principal.

Esses pontos não impedem consolidar a direção do produto, mas precisam ser resolvidos antes das implementações que dependem deles.
