# Homologação do Merchant do iFood — roteiro de demonstração

Roteiro para o vídeo e para a reunião com o analista. A ordem segue os critérios oficiais
(<https://developer.ifood.com.br/pt-BR/docs/guides/modules/merchant/homologacao>), porque é a ordem
em que ele vai conferir.

Vale a mesma regra de ouro registrada no [roteiro do Catalog](./ifood-catalog-homologation-demo.md):
a homologação avalia a aplicação inteira, e demonstrar por `curl` cancela a reunião. Tudo abaixo é
feito pela interface; o terminal só aparece onde o critério é sobre comportamento invisível.

Loja de teste: `20724247-a275-4171-9466-72bc91e24b79` · Organização
`59c2b238-bc21-4710-b47b-db6e2a380079`

---

## Antes de gravar

1. **Deixe o polling rodando numa aba de terminal** — é ele que mantém o aplicativo ONLINE no iFood
   durante a sessão:

   ```bash
   npm run ifood:homologation-polling
   ```

2. Remova as pausas programadas que sobraram de testes anteriores. A seção precisa começar vazia,
   porque o vazio é o primeiro estado que o critério pede (`GET /interruptions` → array vazio).
3. Deixe os horários de funcionamento **já cadastrados e coerentes** — pelo menos 5 dias com um ou
   dois períodos. Uma tabela vazia não demonstra o `GET`.
4. Confira no cabeçalho do dashboard que o pill do iFood aparece com o estado certo. Se não
   aparecer, a integração não está conectada nesta organização.
5. Segunda aba com o Portal do Parceiro, para mostrar propagação quando fizer sentido.

---

## 1. Autenticação e listagem de lojas

| O que mostrar | Onde | Critério |
| --- | --- | --- |
| A página carrega já autenticada, com as lojas vindas da API | `/dashboard/integrations/ifood` | `GET /merchants` |
| O seletor de lojas no canto superior direito, com `id` e nome | cabeçalho da página | Listagem de lojas |

**Fale enquanto mostra:** o token é OAuth com *refresh* automático — a aplicação renova sozinha 10
minutos antes de expirar, e o lojista nunca vê isso. Quando o refresh falha, a tela não quebra: cai
no *gate* de reconexão.

**Critério de token inválido → `401`:** não é reproduzível pela interface sem quebrar a conexão da
loja de teste no meio da gravação. Diga ao analista que o tratamento existe e mostre o código se ele
pedir — `lib/integrations/ifood/errors.ts` distingue `401` (reconecte) de `403` (permissão
faltando), justamente porque pedem ações opostas do lojista.

---

## 2. Detalhes e status da loja

Seção **LOJA**, dividida em dois blocos.

| Bloco | O que prova | Critério |
| --- | --- | --- |
| **CADASTRO** | `id`, tipo, endereço completo, CEP e as operações da loja | `GET /merchants/{id}` |
| **DISPONIBILIDADE** | Uma linha por operação, com estado, mensagem do iFood e validações pendentes | `GET /merchants/{id}/status` |

Os quatro estados do critério estão mapeados: `OK` e `WARNING` aparecem como **ABERTA** e
**ATENÇÃO**, `CLOSED` como **FECHADA**, `ERROR` como **ERRO**.

**Aponte a frase no rodapé do bloco de cadastro:** o cadastro é somente leitura porque a API pública
do iFood não expõe escrita para foto, descrição e dados da loja — isso é Portal do Parceiro. Dizer
isso antes que ele pergunte mostra que a fronteira foi entendida, não ignorada.

**Diferencial que vale mostrar:** o mesmo status aparece como *pill* no cabeçalho de **todas** as
páginas do sistema, com o logotipo do iFood e o estado ao lado. O lojista percebe que a loja fechou
sem precisar entrar na tela da integração.

> **Armadilha de gravação:** o pill tem cache de 60s no servidor e revalida a cada 60s. Ele **não**
> vira instantaneamente quando você cria uma pausa. Não fique esperando na frente da câmera —
> explique a cadência e siga. Se quiser mostrar a virada, grave em dois momentos ou recarregue a
> página depois de um minuto.

---

## 3. Horários de funcionamento

Seção **HORÁRIOS DE FUNCIONAMENTO** — a tabela dos sete dias.

1. Mostre a tabela preenchida: é o `GET /opening-hours` renderizado, com `dayOfWeek`, início e
   duração traduzidos para "período das 08:00 às 18:00".
2. Adicione um segundo período num dia (almoço e jantar) e ajuste o horário de outro.
3. Note que **nada foi enviado ainda** — a barra de alterações acumula as edições.
4. APLICAR. Explique: o `PUT` do iFood substitui o conjunto inteiro de turnos, então a tela edita
   localmente e envia tudo de uma vez. Enviar a cada tecla apagaria os outros dias.
5. Recarregue para provar que voltou do iFood.

**Mostre a replicação:** o botão de replicar copia os períodos de um dia para os outros. É o que
transforma "cadastrar a semana" de 14 campos em 2.

**Mostre a detecção de sobreposição:** crie dois períodos que se cruzam no mesmo dia. A barra
bloqueia com *"Sobrepõe 12:00–18:00 de segunda-feira"*. Explique o detalhe técnico, que é o ponto
forte aqui: a duração é em minutos e pode passar da meia-noite, então sexta 18:00 por 8h termina
sábado às 02:00 — a verificação projeta os turnos num círculo de uma semana inteira, em vez de
comparar dia a dia. Sem isso, um turno que vira o dia passaria batido.

---

## 4. Pausas programadas

Esta é a sequência mais completa da demonstração, porque encadeia quatro critérios numa tomada só.

1. **Seção vazia** — `GET /interruptions` devolvendo array vazio, com o estado vazio da tela.
2. **PAUSAR LOJA** → preencha motivo, início e fim → confirme. `POST /interruptions`, a pausa
   aparece na lista com o `id` que o iFood devolveu.
3. **Volte à seção LOJA** e mostre a disponibilidade agora **FECHADA**. É o critério "loja fechada →
   `state: CLOSED`" demonstrado por consequência de uma ação, não por coincidência de horário.
4. **Crie uma segunda pausa sobreposta à primeira.** O iFood recusa com `409 InterruptionOverlap` e
   a aplicação mostra a mensagem em português no *toast*. Este é o único cenário de erro do checklist
   que dá para provocar ao vivo pela interface — não pule.
5. **Remova a pausa** pelo botão de excluir. `DELETE`, resposta `204` sem corpo, a loja volta a
   operar e a lista esvazia.

> Ensaie o passo 4 antes de gravar. Se o iFood devolver o `409` sem mensagem, o texto que aparece é
> um fallback genérico de conflito, e vale saber disso antes de estar ao vivo.

---

## 5. Resiliência (não dá para mostrar na tela)

Comportamento invisível. Mostre o teste:

```bash
npx tsx --test lib/data-connectors/ifood/retry.test.ts
```

Explique em três frases:

- **`5xx` e timeout** são repetidos com backoff exponencial (1s, 2s, teto de 30s), mas **só em
  métodos idempotentes** — um `POST` de pausa que estourou pode ter sido aplicado antes de falhar, e
  repetir criaria uma pausa duplicada.
- **`429`** é repetido em qualquer método, respeitando o header `Retry-After` quando ele vem — o rate
  limit recusa antes de processar, então repetir é seguro.
- **O refresh de token fica de fora de propósito:** o iFood rotaciona o refresh token a cada uso, e
  repetir um refresh já aplicado invalidaria a conexão da loja.

E o polling, que já está rodando desde o item 1 do "antes de gravar": intervalo padrão de 30s, o
mínimo recomendado. Mostre o terminal com as iterações acontecendo — prova de presença ONLINE.

---

## 6. O que dizer sobre as lacunas

Honestidade aqui vale mais que maquiagem — o analista testa ao vivo e vai achar.

- **Paginação em `GET /merchants` (`?page=1&size=10`):** não implementada. A aplicação lê a lista
  completa. Diga que a loja de teste tem poucas unidades e que a paginação entra quando houver rede
  grande — não finja que existe.
- **Turnos sobrepostos → `400`:** a aplicação **bloqueia antes de enviar**, então o `400` do iFood
  nunca chega. É uma decisão de produto, não uma lacuna: o lojista recebe o erro na hora, apontando
  qual período conflita, em vez de um `400` genérico depois do envio. Se o analista quiser ver o
  `400` da API, explique que a validação local é mais estrita que a dele e ofereça mostrar o código.
- **Limite de 1.000 req/s:** não há controle explícito de vazão. O volume real da aplicação é de
  ordens de grandeza abaixo disso — polling a cada 30s e chamadas sob demanda na tela. Diga o número,
  não invente um mecanismo.
- **Requisição sem token → `401`:** tratado, mas não demonstrável pela interface sem derrubar a
  conexão da loja de teste durante a gravação.

---

## Ordem sugerida da gravação

1. Conexão, seletor de lojas, cadastro e disponibilidade · **~3 min**
2. Horários: editar, replicar, aplicar, recarregar · **~3 min**
3. Horários: sobreposição bloqueando, com a explicação do turno que vira o dia · **~2 min**
4. Pausas: vazio → criar → status FECHADA → `409` sobreposto → remover · **~4 min**
5. Pill do cabeçalho aparecendo nas outras telas do sistema · **~1 min**
6. Terminal: teste de retry e o polling de 30s rodando · **~2 min**

Total ~15 minutos. Se precisar cortar, corte o item 5. **Mantenha o item 4 inteiro** — é a sequência
que cobre mais critérios de uma vez, e é o único erro do checklist provocável ao vivo.
