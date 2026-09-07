# Landing page redesign — plano

Referência visual: [visorfinance.app](https://visorfinance.app). Direção de arte: a mesma família de
ilustrações do onboarding (`docs/onboarding/asset-generation-prompts.md`). Geração de imagens pelo
Vercel AI Gateway com o AI SDK (`generateImage`).

Status: **aprovado em 2026-09-07**. Decisões da seção 10 fechadas: título A, hero split, seção Problema
antes de "Como funciona", linha estática de cidades no lugar do marquee, modelo `openai/gpt-image-2`,
copy principal com WhatsApp oficial (gateway interno citado como alternativa não indicada).

## 1. Objetivo

Trocar os "demos" em HTML (mockups de campanha, WhatsApp, clientes em risco, PDI, fluxo animado) por
imagens ilustradas de alta qualidade, no estilo já aprovado no onboarding, e reescrever a copy para que
cada seção defenda uma única ideia. A página deve ficar mais leve de ler, mais "produto premium" e
mais fácil de manter: uma imagem por seção, texto sempre em HTML.

O que **não** muda: cases reais (vídeo Mux + métricas), integrações reais (logos), planos, FAQ,
analytics (`landing_*`), ids de âncora usados pela navbar e pelo rodapé.

## 2. O que a referência faz (e o que copiamos)

| Visor | Copiamos? | Como fica no RecompraCRM |
| --- | --- | --- |
| Um objeto 3D "emoji premium" por seção/card (cofrinho dormindo, casa, carro, avião), fundo creme, sem texto na imagem | **Sim** | Objetos porcelana/cobalto/dourado da família do onboarding, PNG com alpha, sem letras |
| Screenshots do produto emoldurados (celular/desktop) | Parcial | Não temos screenshots prontos; usamos ilustração + **chips HTML sobrepostos** com dados de exemplo (o texto continua sendo texto) |
| Hero em duas colunas: título curto orientado a resultado + prova social + visual grande | **Sim** | Hero split: copy à esquerda, ilustração à direita com chips flutuantes |
| Seção "Recursos" com 4 cards, um visual por card | **Sim** | Funcionalidades continuam 4, alternadas, cada uma com um raster |
| Seção "Segurança" com bullets de confiança | **Sim** | Nova seção "WhatsApp oficial e dados protegidos" |
| Seção de conversa com IA | Não | Não é uma promessa da landing hoje |
| Depoimentos em massa (App Store) | Não | Mantemos os 2 cases com vídeo, que são mais fortes |
| Muito espaço em branco, poucas animações | **Sim** | Mantemos `Reveal` (fade/write-in), removemos marquee auto-play no mobile, ticker de preço e auto-advance |

## 3. Direção de arte dos novos assets

Herdada do onboarding, sem exceções:

- Cobalto `#24549c`, dourado `#ffb900`, porcelana, azul-claro. Cerâmica acetinada e resina fosca,
  luz suave do alto-esquerda, bisel arredondado, sombra de contato curta.
- Câmera três-quartos frontal, perspectiva contida. Sem chão, sem cena de fundo, sem confete,
  sem brilhos, sem pessoas, sem logos (exceto marcas Meta/WhatsApp já existentes), **sem letras ou
  números**. Números e textos entram como HTML por cima (chips, selos, placa da loja).
- Canvas quadrado (1024 ou 1536) com a silhueta nos 75–80 % centrais; hero em 3:2.
- A sacola azul com alça dourada continua sendo o objeto recorrente da marca.
- Reaproveitamos os 4 PNGs do onboarding sempre que a cena for a mesma. Não duplicar objeto na
  mesma página: cada asset aparece uma vez.

## 4. Nova estrutura da página

Ordem final (ids de âncora entre parênteses; os existentes são preservados):

1. Navbar (sem mudança estrutural)
2. **Hero** (`#top`) — novo layout split + `hero-return-loop.png`
3. **Faixa de integrações** — mantida dentro do hero (logos reais)
4. **Problema** (`#problema`, nova) — 3 cards, 3 objetos pequenos
5. **Como funciona** (`#como-funciona`) — 3 passos, 3 objetos
6. **Resultado comprovado** (`#movimento`) — cases, sem mudança de conteúdo
7. **Funcionalidades** (`#inventario`) — 4 entradas alternadas, rasters no lugar dos mockups
8. **Integrações** (`#integracoes`) — mantida, cards mais compactos
9. **Confiança** (`#confianca`, nova) — WhatsApp oficial, LGPD, suporte humano + `whatsapp-connection.png`
10. **Planos** (`#saldo`) — mantida; remover `TickerNumber`
11. **FAQ** (`#faq`) — mantida; respostas revisadas para a nova copy
12. **CTA final** (`#contato`) — `storefront.png` com placa "Sua loja" em HTML
13. Footer (sem mudança)

Removidos: `CampaignMockup`, `WhatsAppMockup`, `RiskMockup`, `PoiMockup` (em `Features.tsx`),
`_primitives/CampaignFlow.tsx`, `_primitives/HowItWorksFlow.tsx`, `_primitives/LiveClock.tsx`,
`_primitives/TickerNumber.tsx` (se ficar sem uso após o Pricing). Os badges numerados de seção
("02", "03"...) saem; fica só o rótulo em caixa alta (eyebrow) e a linha.

## 5. Copy (PT-BR)

Tom: direto, confiante, sem exclamação, sem jargão. Uma ideia por seção. Números só onde existe
fonte (cases, planos).

### 5.1 Hero

**Título (recomendado, A):**
> Seus clientes já compraram uma vez.
> Faça eles voltarem no automático.

Alternativas:
- B: "Faça o cliente voltar sem depender de anúncio novo." — ataca o custo de aquisição, que já é
  o argumento do título atual.
- C: "Cada venda vira a próxima. Pelo WhatsApp da sua loja." — mais mecânica, menos emocional.

**Subtítulo:**
> O RecompraCRM registra a venda, percebe quem está sumindo e manda a mensagem certa pelo WhatsApp
> da sua própria loja. Cashback, campanhas e clientes em risco em um só lugar.

**CTA primário:** "Testar 15 dias grátis" (mantido). **Secundário:** "Ver como funciona" (âncora).
**Linha de confiança:** "Sem cartão de crédito · Configuração em um dia · Suporte humano".
**Faixa de integrações:** "Funciona com o que sua loja já usa" + logos.

Chips HTML sobre a ilustração (exemplo ilustrativo, não dados reais):
- "Maria voltou · 3ª compra"
- "Aniversário · 12 mensagens enviadas"
- "Cashback disponível · R$ 28,50"

### 5.2 Problema (nova)

Eyebrow: "Por que o cliente some". Título: **"Não é falta de cliente. É falta de motivo para voltar."**

| Card | Título | Texto | Asset |
| --- | --- | --- | --- |
| 1 | Ele esquece da loja. | Sem um motivo concreto para voltar, a próxima compra vai para quem apareceu primeiro no feed. | `bag-asleep.png` |
| 2 | Você descobre tarde demais. | Quando percebe que o cliente sumiu, já se passaram dois meses. Planilha nenhuma avisa. | `calendar-hourglass.png` |
| 3 | Mandar mensagem na mão não escala. | Copiar número, escrever, esperar. Funciona com 10 clientes. Não funciona com 1.000. | `phone-pile.png` |

### 5.3 Como funciona

Eyebrow: "Como funciona". Título: **"Da venda à próxima visita, sem ninguém precisar lembrar."**
Subtítulo: "Os dados entram uma vez. O CRM decide quem acionar. A conversa acontece no WhatsApp da loja."

| Passo | Rótulo | Título | Texto | Asset |
| --- | --- | --- | --- | --- |
| 01 | A venda entra | O sistema reconhece a compra. | Pelo tablet no balcão, QR Code ou integração com seu ERP, delivery ou loja online. Sem retrabalho no caixa. | `poi-tablet.png` |
| 02 | O CRM decide | Cada cliente recebe o estímulo certo. | Primeira compra, aniversário, inatividade, cashback expirando e perfil RFM definem quem deve ser acionado e quando. | `crm-sorter.png` |
| 03 | A mensagem sai | A loja volta a conversar. | Enviada pelo número e com a identidade da sua marca, pronta para virar uma nova visita. | `message-out.png` |

Fecho: "Menos operação manual. Mais clientes lembrando de voltar." (mantido)

### 5.4 Resultado comprovado

Sem alteração de conteúdo. Ajuste de copy do título: **"Sem achismo. Com nome, cidade e número."**

### 5.5 Funcionalidades

Eyebrow: "Funcionalidades". Título: **"Tudo que você precisa. Nada que você não vai usar."** (mantido)

| # | Header | Título | Bullets | Asset | Chip HTML sobreposto |
| --- | --- | --- | --- | --- | --- |
| 01 | Campanhas inteligentes | Gatilhos e filtros para agir no momento exato. | mantidos | `campaign-triggers.png` | "Aniversário · Inatividade · RFM" |
| 02 | WhatsApp da loja | Sai pelo seu número, com a sua marca. | mantidos | `whatsapp-gateway.png` (reuso) | balão: "Oi, Maria! Seu saldo de R$ 28,50 vence em 5 dias." |
| 03 | Clientes em risco | Saiba quem vai sumir antes que ele suma. | mantidos | `at-risk-lens.png` | "Em risco · 47 dias" |
| 04 | Programa de fidelidade | Cashback e resgate para quem vende no balcão. | mantidos | `cashback-reward.png` (reuso) | "Resgate no balcão · sem app" |

Descrições atuais são mantidas com pequenos cortes (máx. 2 frases cada).

### 5.6 Integrações

Título: **"Conecta com o que sua loja já usa. Seus dados entram sozinhos."** (mantido). Cards ficam
mais baixos (logo + nome + uma frase). Sem asset novo.

### 5.7 Confiança (nova)

Eyebrow: "Oficial e seguro". Título: **"Mensagem oficial. Dados protegidos. Gente do outro lado."**

Bullets:
- **WhatsApp oficial.** Envio pela API oficial da Meta, com o número da própria loja. Nada de chip
  avulso nem número desconhecido. (Existe um gateway interno como alternativa, mas não é o caminho
  indicado e a landing não o promove.)
- **LGPD.** Os dados dos seus clientes são seus. Consentimento registrado e exclusão sob demanda.
- **Suporte humano.** Time comercial e de suporte no WhatsApp, em horário comercial. Pagamento via Stripe.

Asset: `whatsapp-connection.png` (reuso, com o tile Meta).

### 5.8 Planos

Mantido. Título **"Você opera. Ou a gente opera por você."** Remover animação do preço.

### 5.9 FAQ

Mantido. Revisar a resposta 1 ("O que é o RecompraCRM?") e 5 ("Como faz meus clientes voltarem?")
para alinhar com a nova copy do hero. JSON-LD continua vindo de `LANDING_FAQS`.

### 5.10 CTA final

Título: **"Sua loja já tem clientes. Agora faça eles voltarem."** (mantido). Ilustração `storefront.png`
centralizada acima do título, com a placa preenchida em HTML: "Sua loja".

### 5.11 Metadata

- `<title>`: "RecompraCRM — Faça seus clientes voltarem no automático"
- description: "CRM de recompra para o varejo: cashback no balcão, campanhas automáticas no WhatsApp
  oficial da loja e alerta de clientes em risco. 15 dias grátis, sem cartão."

## 6. Inventário de assets

Pasta: `public/images/landing/`. Formato: PNG com alpha (verificado), servido por `next/image` com
`sizes` responsivo. Fonte original de geração guardada fora do repo (scratch); só o PNG final entra.

| Arquivo | Seção | Canvas | Origem |
| --- | --- | --- | --- |
| `hero-return-loop.png` | Hero | 1536×1024 (3:2) | **novo** |
| `bag-asleep.png` | Problema 1 | 1024² | **novo** |
| `calendar-hourglass.png` | Problema 2 | 1024² | **novo** |
| `phone-pile.png` | Problema 3 | 1024² | **novo** |
| `poi-tablet.png` | Como funciona 01 | 1024² | **novo** |
| `crm-sorter.png` | Como funciona 02 | 1024² | **novo** |
| `message-out.png` | Como funciona 03 | 1024² | **novo** |
| `campaign-triggers.png` | Funcionalidade 01 | 1024² | **novo** |
| `at-risk-lens.png` | Funcionalidade 03 | 1024² | **novo** |
| `whatsapp-gateway.png` | Funcionalidade 02 | 1254² | reuso (`/images/onboarding/`) |
| `cashback-reward.png` | Funcionalidade 04 | 1254² | reuso |
| `whatsapp-connection.png` | Confiança | 1254² | reuso |
| `storefront.png` | CTA final | 1254² | reuso |

9 imagens novas. Com 2–3 variantes por prompt para escolha, ~25–30 gerações.

### 6.1 Prompts

Prefixo compartilhado (vai antes de cada prompt, igual ao onboarding):

> Production illustration asset for a premium Brazilian retail CRM landing page. Match an existing
> dimensional asset family: cobalt blue #24549c, warm gold #ffb900, porcelain white and pale blue;
> satin ceramic and matte resin materials, precise rounded bevels, tactile surfaces; one coherent soft
> studio light from the upper left; short soft contact shadow only; three-quarter front camera with
> restrained perspective. Square canvas, actual transparent alpha background, no floor, no background
> scene, no frame. Entire silhouette inside the central 78 percent with generous margin. Calm,
> sophisticated composition. No people, no logos, no lettering, no numbers, no currency symbols, no
> confetti, no sparkles, no watermark.

Sufixo para o hero: "Landscape 3:2 canvas instead of square; cluster occupies the central 80 percent."

| Arquivo | Prompt (após o prefixo) |
| --- | --- |
| `hero-return-loop.png` | A refined still life that tells "a purchase becomes the next visit": on the left a miniature porcelain storefront with cobalt-and-porcelain striped awning and an EMPTY sign panel; center-right an upright slightly tilted porcelain smartphone with cobalt frame and a blank pale screen, one rounded WhatsApp-green chat bubble floating beside it with no text; in front a small matte cobalt shopping bag with gold handles; a thick satin-gold coin with an embossed curved return arrow leaning against the bag. Objects arranged in a gentle arc reading left to right. |
| `bag-asleep.png` | A single matte cobalt shopping bag with gold handles, slumped and slightly deflated, handles drooping to one side; a tiny porcelain crescent moon floating above it. Mood: forgotten, quiet. No other objects. |
| `calendar-hourglass.png` | A porcelain desk calendar block with cobalt binding rings and blank pages (no digits), and a satin-gold hourglass with pale blue sand standing beside it, sand almost fully run through to the bottom bulb. |
| `phone-pile.png` | An upright porcelain smartphone with cobalt frame and blank screen, with an unruly stack of six rounded chat bubbles in pale blue and porcelain piled up and spilling over its top edge, one bubble tipping off the side. Bubbles are blank. Mood: overwhelming manual work. |
| `poi-tablet.png` | A porcelain tablet on a small cobalt counter stand, angled toward the viewer, blank pale screen; a porcelain purchase receipt curling out from behind it with three embossed blue-gray lines and no text; a small matte cobalt shopping bag with gold handles at its foot. |
| `crm-sorter.png` | A cobalt porcelain sorting tray with three shallow compartments; several small round porcelain client tokens in pale blue rest in the compartments, and one satin-gold token is lifted above the tray as if being picked. A small gold gear leans at the base. Conveys "the system chooses who to contact". |
| `message-out.png` | One large rounded WhatsApp-green chat bubble in satin ceramic with two embossed check marks (no letters), tilted as if just sent, hovering above a small matte cobalt shopping bag with gold handles; a smaller pale-blue reply bubble rising behind. |
| `campaign-triggers.png` | A porcelain alarm clock with cobalt hands and a satin-gold bell on top, blank face with no digits; three small floating porcelain tag cards with cobalt eyelets and gold string fanning out beside it, all blank. Conveys "triggers and filters at the right time". |
| `at-risk-lens.png` | A satin-gold magnifying glass with a cobalt handle hovering over three small round porcelain client tokens; the token under the lens glows warm amber and is slightly cracked, the other two are pale blue. Conveys "spot who is about to leave". |

Edições esperadas (mesma técnica do onboarding): se o modelo pintar xadrez ou fundo sólido, pedir
"remove only the background, preserve all objects, output actual PNG alpha". Se aparecer letra/
número, pedir a remoção do elemento, mantendo o resto.

## 7. Pipeline de geração

### 7.1 Pré-requisito

`AI_GATEWAY_API_KEY` no ambiente (hoje **não** está presente na sessão). Passo 0 do plano é um smoke
test com uma geração de 1024² para confirmar chave, modelo e custo.

### 7.2 Modelo

- **Primário:** `openai/gpt-image-2` via `generateImage` (imagem-only, `result.images[0].base64`).
  É a mesma família do ImageGen usado no onboarding, então a consistência de estilo é a maior.
  Usar `providerOptions.openai = { background: "transparent", quality: "high", output_format: "png" }`
  e `size: "1024x1024"` (hero: `"1536x1024"`).
- **Secundário (edições com referência):** `google/gemini-3-pro-image` via `generateText`, enviando
  os PNGs do onboarding como partes de imagem na mensagem para ancorar estilo. Não gera alpha, então só
  vale para estudos; o final sempre sai do primário.

### 7.3 Script

`scripts/generate-landing-assets.ts` (rodado com `npx tsx`, padrão dos outros scripts):

- Manifesto tipado `LANDING_ASSETS: { file, size, prompt }[]` com os prompts da seção 6.1 e o prefixo.
- Flags: `--only <file>`, `--variants <n>` (default 2), `--out <dir>` (default
  `.generated/landing`, ignorado pelo git).
- Salva `<file>.v<n>.png`, imprime custo/uso retornado pelo gateway.
- Pós-processo com `sharp` (já é dependência): valida canal alpha (`metadata().hasAlpha` e borda
  100 % transparente), `trim()` das margens vazias e re-padding para a silhueta ocupar 78 % do canvas
  final, para que todos os objetos tenham a mesma escala visual. Não redimensiona para menos de 1024.
- Escolha manual: revisar variantes, copiar a vencedora para `public/images/landing/<file>`.

Nenhuma imagem gerada é commitada sem passar pela validação de alpha e pela revisão visual.

## 8. Implementação (componentes)

Diretório: `app/_components/ledger/` (mantemos o "ledger" como sistema visual).

1. **`_primitives/LandingArt.tsx`** — `next/image` com `aspect` (`square` | `wide`), `sizes`
   responsivos, `priority` opcional (hero), `float` sutil (desligado com `prefers-reduced-motion`) e
   slot `overlay` para chips HTML posicionados por `className`. Mobile: 160–220 px acima do texto,
   como no onboarding.
2. **`Hero.tsx`** — grid `lg:grid-cols-[1.05fr_0.95fr]`; copy à esquerda, `LandingArt` à direita com
   3 chips; faixa de integrações abaixo, largura total.
3. **`Problem.tsx`** (novo) — 3 cards com raster pequeno (`max-w-[180px]`), título e texto.
4. **`HowItWorks.tsx`** — 3 colunas no desktop, cada uma com raster + rótulo + título + texto;
   empilha no mobile. Remove o card-lista atual.
5. **`Features.tsx`** — mantém o grid 7/5 alternado; `mockup` vira `art: { file, overlay }`.
   Remove as quatro funções de mockup.
6. **`Trust.tsx`** (novo) — raster à esquerda, 3 bullets à direita.
7. **`Pricing.tsx`** — remove `TickerNumber`; preço estático.
8. **`Footer.tsx`** — `LedgerClosingCTA` ganha `storefront.png` com `storeLabel` HTML.
9. **`Integrations.tsx`** — cards compactos.
10. **`page.tsx`** — nova ordem; `LandingAnalyticsTracker` recebe `problema` e `confianca` na lista
    de seções observadas; JSON-LD e metadata atualizados.
11. **Limpeza** — apagar primitives sem uso (`CampaignFlow`, `HowItWorksFlow`, `LiveClock`,
    `TickerNumber`). Em `app/_components/`, os legados sem nenhum import (verificado):
    `BentoGrid`, `CampaignsSection`, `Hero`, `Navbar`, `POSSection`, `Pricing`, `SimpleCase`,
    `SimpleFeatures`, `SimpleHero`, `SimpleHowItWorks`, `SimplePricing`, `SiteHeader`, `SocialProof`.
    `BrandHeader` e `Footer` ficam: são usados pelos layouts de `(brand-marketing)`.
12. **CSS** — em `ledger.css`, remover keyframes órfãos (`flow-pulse`, `step-progress`, `marquee`
    se o marquee sair) e adicionar `ledger-float` com fallback para movimento reduzido.

## 9. Fases e critérios de aceite

| Fase | Entrega | Aceite |
| --- | --- | --- |
| 0 | Smoke test do gateway (1 imagem) | Chave válida, PNG com alpha salvo, custo conhecido |
| 1 | Script + manifesto + 9 assets aprovados em `public/images/landing/` + `docs/landing/asset-generation-prompts.md` | Todos com alpha verificado, mesma escala, sem texto |
| 2 | Componentes novos e reescritos, ordem nova em `page.tsx` | `npm run lint` e `tsc` limpos; sem imports órfãos |
| 3 | Copy final aplicada (hero, problema, FAQ, metadata, JSON-LD) | Revisão de copy com a skill `copy-editing` |
| 4 | QA visual: 360, 768, 1024, 1440; movimento reduzido; LCP do hero (`priority` + `sizes`) | Sem scroll horizontal; hero LCP < 2,5 s em 4G simulado; peso total de imagens da página < 1,5 MB servido |

Cada fase é um commit separado no branch `claude/landing-page-redesign-z68kqd`.

## 10. Decisões para confirmar

1. **Título do hero:** A (recomendado), B ou C.
2. **Hero split** (copy esquerda, arte direita) em vez do centrado atual. Recomendado: split.
3. **Seção Problema** entra antes de "Como funciona". Recomendado: sim (a referência abre com dor,
   e o título atual "Atrair clientes é caro" já vinha fazendo esse papel dentro do hero).
4. **Marquee de cidades**: manter só no desktop (como hoje) ou trocar por linha estática
   "Lojas em operação em 14 cidades de MG". Recomendado: linha estática, menos movimento.
5. **Modelo primário** `openai/gpt-image-2` com fundo transparente. Se a chave não tiver acesso a
   ele, alternativa é `google/gemini-3-pro-image` + recorte de fundo sólido no `sharp`, com perda de
   qualidade nas bordas.
6. **Claim "WhatsApp oficial"** na seção Confiança: o onboarding também suporta o gateway interno
   (não-Meta). Se parte da base opera por esse caminho, a copy vira "Envio pelo número da própria
   loja, com opção de API oficial da Meta" e o asset passa a ser `whatsapp-gateway.png`.
