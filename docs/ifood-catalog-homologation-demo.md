# Homologação do Catalog do iFood — roteiro de demonstração

Roteiro para o vídeo e para a reunião com o analista. A ordem segue os critérios oficiais
(<https://developer.ifood.com.br/pt-BR/docs/guides/modules/catalog/homologation>), porque é a ordem
em que ele vai conferir.

**Regra de ouro do iFood:** *"A homologação não testa chamadas API isoladas — testa a aplicação
completa. Chamadas curl apenas causarão cancelamento da reunião."* Tudo abaixo é feito pela
interface. O terminal só aparece onde o critério é sobre comportamento invisível (retry, lote).

Loja de teste: `20724247-a275-4171-9466-72bc91e24b79` · Organização
`59c2b238-bc21-4710-b47b-db6e2a380079`

---

## Antes de gravar

1. Rode `npm run test:ifood-catalog -- --cleanup` para garantir que não há resíduo `[TESTE]` no
   catálogo.
2. Deixe o catálogo com pelo menos 2 categorias e 1 item já existente — a tela vazia não demonstra
   nada.
3. Tenha uma segunda aba com o app do iFood ou o Portal do Parceiro, para mostrar a propagação.
4. Feche o rascunho pendente (a barra "Alterações não salvas") se houver, para começar limpo.

---

## 1. Fundamentos do catálogo

| O que mostrar | Onde | Critério |
| --- | --- | --- |
| A tela lista catálogos e categorias vindos da API | `/dashboard/integrations/ifood/catalog` | Listagem e recuperação |
| Criar categoria pelo botão NOVA CATEGORIA | mesma tela | Gerenciamento de categorias |
| Criar item simples com nome, descrição e preço | NOVO ITEM na categoria | Criação de itens simples |

**Fale enquanto mostra:** o seletor de catálogo aparece quando a loja tem mais de um (multi-catálogo),
e a faixa âmbar de "catálogo na versão 1" oferece o upgrade quando necessário.

**Cuidado:** o iFood reescreve o nome da categoria em *title case*. Se você digitar "BEBIDAS", ele
grava "Bebidas". Não é bug nosso — evite comentar como se fosse.

---

## 2. Complementos

| O que mostrar | Onde |
| --- | --- |
| Abrir um item pelo lápis → aba/seção **COMPLEMENTOS** | `/catalog/[itemId]` |
| Criar **dois** grupos: "Ponto da carne" (obrigatório, min 1 / max 1) e "Adicionais" (opcional, min 0 / max 2) | seção Complementos |
| Mostrar a frase que traduz min/max: *"Obrigatório — o cliente escolhe exatamente 1"* | abaixo dos campos |
| Salvar e reabrir o item para provar que voltou do iFood | apply bar → recarregar |

O critério pede **mínimo 2 grupos** com preços e limites min/max. A releitura é o que prova que
gravou — mostre-a explicitamente.

**Mostre também a validação:** ponha `max` maior que a quantidade de opções. A barra bloqueia com
*"O máximo não pode passar de N — é quantas opções o grupo tem."* Explique o porquê: o iFood aceitaria
esse cadastro e o item viraria "não vendível" depois, o que é péssimo de diagnosticar.

**Pizza e combo:** critérios marcados **"(se aplicável)"**. Esta loja não vende pizza nem combo — diga
isso ao analista e siga. Não invente uma pizza só para demonstrar.

---

## 3. Operações em produção

### Atualização em massa

1. Na tabela do catálogo, edite o preço de **vários** itens seguidos (a tabela é navegável por
   teclado, como planilha).
2. Note que nada foi enviado ainda — a barra flutuante mostra *"N itens serão atualizados"*.
3. APLICAR ALTERAÇÕES. Explique: as N edições viram **uma** chamada ao endpoint de lote, não N.
4. A faixa de progresso acompanha o `batchId` até o estado terminal e lista falhas por item, se
   houver.

> Este é o ponto mais forte da demonstração: o lote não é um modo especial escondido num menu, é o
> fluxo normal de edição.

### Preço e status por canal

Na página do item, seção **CANAIS DE VENDA**. Explique que o campo vazio herda o valor do item, e que
a tela só lista os canais que a loja realmente tem — o iFood aceita e descarta em silêncio um canal
inexistente, então oferecer os três seria promessa vazia.

*Se a loja de teste só tiver o contexto `DEFAULT`*, diga isso: a UI é dirigida pelo `GET /catalogs`.

### Agendamento de disponibilidade

O critério fala em "regras por período, dias da semana e datas especiais". Isso **não existe por item**
na Catalog API — existe no módulo **Merchant**, e já está implementado:

- `/dashboard/integrations/ifood` → seção **HORÁRIOS** — turnos por dia da semana.
- Mesma página → **PAUSAS PROGRAMADAS** — interrupção com início e fim.
- Página do item → **ESTOQUE** — quando chega a zero, o iFood pausa o item sozinho. É a única pausa
  automática por item da plataforma.

Mostre os três e explique a divisão. Se o analista esperava agendamento por item no catálogo, essa é
a hora de alinhar.

---

## 4. Qualidade e resiliência

| Critério | Como demonstrar |
| --- | --- |
| Validação de dados | Digite um nome com mais de 100 caracteres e uma descrição com mais de 500 — a aplicação recusa **antes** de chamar o iFood |
| Status restrito | Mostre que status é sempre um seletor de dois valores, nunca texto livre |
| Tratamento de erros | Tente salvar um item sem categoria → mensagem em português, não stack trace |
| Sincronização em até 2s | Mude um preço e mostre o valor novo na listagem |
| Retry com backoff | Ver abaixo |
| Performance em massa | Ver abaixo |

### Retry (não dá para mostrar na tela)

Este é comportamento invisível. Mostre o código e o teste:

```bash
npx tsx --test lib/data-connectors/ifood/retry.test.ts
```

Explique em uma frase: repete 429 sempre; repete 5xx e timeout **só em métodos idempotentes**, porque
um POST que estourou pode ter sido aplicado antes de falhar; **nunca** repete 4xx.

### Prova de ponta a ponta

```bash
npm run test:ifood-catalog -- --confirm
```

40 verificações contra a loja real: cria categoria, cria item com dois grupos e min/max, **relê tudo
pelo `/flat` conferindo campo a campo**, testa canais, testa estoque, dispara lote e acompanha o
`batchId`, e apaga o que criou. Vale mostrar porque prova o que a tela não consegue: que o que foi
enviado é exatamente o que ficou gravado.

---

## 5. Checklist de casos extremos

O analista pode pedir qualquer um ao vivo. Os que valem ensaiar:

- **Campos obrigatórios faltando** → salvar item sem nome/categoria, ver a mensagem.
- **Item inexistente** → abrir `/catalog/<uuid-inventado>?merchantId=...` e mostrar o erro tratado.
- **Caracteres especiais e acentos** → criar item "Açaí com pimentão — 1/2 porção" e mostrar que
  volta idêntico.
- **Multi-idioma** → o checklist pede títulos em pt-BR, es-CO e en-US. **Não é localizar a
  aplicação**: é criar itens com títulos nesses idiomas e conferir a renderização. Crie três itens
  ("Café com leite", "Café con leche", "Coffee with milk") e mostre os três na tabela.
- **Título longo** → 50+ caracteres, conferir que não quebra o layout da tabela.

---

## 6. O que dizer sobre as lacunas

Honestidade aqui vale mais que maquiagem — o analista testa ao vivo e vai achar.

- **Pizza e combo:** não implementados; critério "(se aplicável)" e a loja não vende. Se perguntarem
  sobre o roadmap: a estrutura já está modelada, falta a interface.
- **Lote de 100+ itens em menos de 10s:** o mecanismo está pronto e é uma chamada só, mas **não foi
  cronometrado** com 100 itens. Se o analista pedir o número, diga que não mediu — não chute.
- **Cache de leitura do iFood:** depois de um lote, `GET /items/{id}/flat` ainda devolve o preço
  antigo por alguns segundos, enquanto a listagem por categoria já mostra o novo. Se aparecer no
  vídeo, explique que é cache do lado deles — a listagem é a fonte confiável.

---

## Ordem sugerida da gravação

1. Tela do catálogo: listar, criar categoria, criar item simples · **~3 min**
2. Item: complementos com dois grupos, min/max, validação bloqueando · **~4 min**
3. Item: canais e estoque · **~2 min**
4. Tabela: edição múltipla → lote → progresso do batch · **~3 min**
5. Loja: horários e pausas programadas · **~2 min**
6. Terminal: `npm run test:ifood-catalog -- --confirm` e o teste de retry · **~3 min**

Total ~17 minutos. Se precisar cortar, corte o item 6 e deixe como anexo — mas mantenha os itens 2 e
4, que são os critérios mais pesados.
