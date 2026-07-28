# Handoff — Scroll externo persistente no hub de chats (`/dashboard/chats`)

Documento de transferência para depuração local com browser real. Contém o sintoma, tudo
que já foi corrigido e verificado, o que isso **descarta**, as hipóteses restantes em ordem
de probabilidade e os snippets de console que decidem entre elas.

**Branch:** `claude/chats-module-implementation-plan-r2iqla`
**Commits relevantes (em ordem):** `f1e5c11` → `0e19f2d` → `57ab4af`

---

## 1. Sintoma

Na página `/dashboard/chats` (desktop), o conteúdo visual está corretamente contido na
viewport — nada é cortado, o hub ocupa exatamente a tela — mas **uma barra de scroll
vertical continua ativa na borda direita da janela**, permitindo rolar "a página" mesmo
com o conteúdo cabendo. Os scrolls internos (lista de conversas, thread de mensagens,
painel de contexto) funcionam normalmente.

Histórico de tentativas:

| Rodada | Fix | Resultado relatado |
| --- | --- | --- |
| 1 | `overflow-y-auto` no `SidebarInset` + `min-h-0` na cadeia da página | Conteúdo passou a caber na viewport, mas scroll externo continuou |
| 2 | `h-svh overflow-hidden` no `SidebarProvider` (`f1e5c11`) | Scroll externo continuou |
| 3 | Clamp de documento via `html/body:has([data-app-shell])` (`0e19f2d`) | **Melhorou, mas persiste** (estado atual) |

O "melhorou" da rodada 3 é um dado importante: sugere que o clamp está ativo e reduziu o
problema, mas existe um scroller adicional que ele não alcança.

---

## 2. Arquitetura do shell (o que renderiza o quê)

```
<html>                                    ← :has([data-app-shell]) → height:100%; overflow:hidden
└─ <body class="min-h-screen min-w-screen overflow-x-hidden ...">
                                          ← :has([data-app-shell]) → height:100%; overflow:clip !important
   ├─ FullScreenWrapper                   components/Layouts/FullScreenWrapper.tsx
   │  div.flex.min-h-screen.w-screen.max-w-full.flex-col
   │  └─ div.flex.min-h-full.grow
   │     └─ div.flex.w-full.grow.flex-col
   │        └─ SidebarProvider            app/dashboard/layout.tsx:30
   │           div[data-app-shell].flex.min-h-svh.w-full.h-svh.overflow-hidden
   │           ├─ AppSidebar              (gap div em fluxo + container `fixed`)
   │           └─ SidebarInset            <main class="relative flex w-full flex-1 flex-col
   │              ├─ AppHeader                overflow-y-auto p-6 gap-3">   ← ÚNICO scroller
   │              ├─ ChatsPage                                                "de página" legítimo
   │              │  div.flex.min-h-0.w-full.flex-1.flex-col.overflow-hidden
   │              │  └─ ChatHub → ChatSidebar (lista rola) | ChatThread (mensagens rolam)
   │              │                                        | ChatContextPanel (aba rola)
   │              ├─ OnboardingQualityBubble  (fixed bottom-6 right-6)
   │              └─ SubscriptionPaywall      (null ou overlay fixed)
   ├─ Toaster (sonner, fixed)
   ├─ MarketingTrackingScript (SDK do Control: injeta DOM em runtime — conteúdo desconhecido)
   ├─ @vercel/analytics
   └─ GoogleTagManager (container pode injetar DOM em runtime)
```

Arquivos-chave:

- `app/dashboard/layout.tsx` — `SidebarProvider` com `data-app-shell` + `h-svh overflow-hidden`
- `styles/globals.css` (último `@layer base`) — regras `html:has(...)` / `body:has(...)`
- `components/ui/sidebar.tsx:125` — wrapper do provider (`min-h-svh` base)
- `components/ui/sidebar.tsx:276` — `SidebarInset`
- `components/Layouts/FullScreenWrapper.tsx` — 3 divs entre body e o shell
- `app/layout.tsx:81` — classes do body

---

## 3. O que já foi verificado empiricamente (e o que isso descarta)

Reproduzi o esqueleto DOM acima com **as classes exatas pós-`cn()`** e o **CSS compilado do
próprio projeto** (`@tailwindcss/cli -i styles/globals.css`), renderizado em Chromium
headless 1668×950 via Playwright, com conteúdo volumoso (40 conversas, 30 mensagens, 25
compras no painel). Resultados:

1. **A estrutura estática é contida.** Sem as regras `:has`, com `h-svh overflow-hidden` no
   provider: `document.scrollHeight === innerHeight === 950`; apenas `chatlist`,
   `messages` e o painel de contexto rolam internamente. ⇒ **A árvore de layout do app em
   si não produz scroll de documento.** Se o scroll persiste, a causa é algo fora desse
   esqueleto ou uma diferença entre o esqueleto e o app real.

2. **Conteúdo injetado no fim do `<body>` reativa o scroll.** Um `div` de 1px em fluxo após
   o wrapper torna o documento rolável (`scrollHeight` 952) — e `scrollIntoView` rola o
   documento de verdade. É o mecanismo clássico de pixel/GTM. ⇒ motivou o clamp da rodada 3.

3. **O clamp atual neutraliza esse mecanismo.** Com as regras de `0e19f2d` e um widget de
   400px injetado no fim do body: `docScrollable: false`, `window.scrollTo(0,300)` → 0,
   `body.scrollTop = 300` → 0, `scrollIntoView()` no widget → nada se move,
   `getComputedStyle(body).overflowY === "clip"`, scrolls internos intactos.
   Detalhe que custou uma iteração: sem `!important`, o `overflow-x-hidden` utilitário do
   body rebaixa o `clip` para `hidden` (regra de computed value do CSS Overflow 3) e o body
   volta a ser rolável por script (medi `scrollIntoView` deslocando 401px silenciosamente).

**Consequência lógica central:** com o clamp aplicado, **a viewport não consegue exibir
scrollbar** (html com `overflow:hidden` não mostra barra; body com `clip` idem). Portanto,
se uma scrollbar continua visível na borda da janela, só há duas possibilidades:

- **(A)** o clamp **não está ativo** no ambiente do usuário (build desatualizado, atributo
  ausente no DOM, regra não compilada); ou
- **(B)** a scrollbar **não é do documento** — é de um elemento interno cujo trilho encosta
  na borda direita da janela e é visualmente indistinguível de uma barra de página. O
  candidato óbvio é o `SidebarInset` (`overflow-y-auto`), que é o elemento mais à direita e
  ocupa a altura toda. O segundo candidato é a aba do `ChatContextPanel`.

O harness diz que o inset **não deveria** ter overflow — então, se (B) for o caso, existe
uma diferença real entre o app e o esqueleto que eu não consegui reproduzir sem browser
logado (o app real precisa de sessão + dados; o ambiente remoto não tem `.env`).

---

## 4. Diagnóstico decisivo (rodar no console, com a página aberta)

### 4.1 Identificar QUEM rola — resolve tudo de uma vez

```js
// Cole antes de rolar; depois role com a roda do mouse sobre a área problemática
// e arraste a scrollbar suspeita.
window.addEventListener(
  "scroll",
  (e) => {
    const t = e.target === document ? document.scrollingElement : e.target;
    console.log("SCROLLER →", t.tagName, t.id || t.dataset?.slot || t.className?.slice?.(0, 80));
  },
  { capture: true, passive: true },
);
```

- Log `HTML` → o scroller é o documento ⇒ hipótese (A), vá para 4.2.
- Log `MAIN … sidebar-inset` → é o inset ⇒ hipótese (B), vá para 4.4.
- Outro elemento → achamos o culpado direto; anotar e inspecionar.

### 4.2 O clamp está ativo?

```js
console.log("attr:", !!document.querySelector("[data-app-shell]"));          // esperado: true
console.log("html overflow:", getComputedStyle(document.documentElement).overflowY); // esperado: "hidden"
console.log("body overflow:", getComputedStyle(document.body).overflowY);    // esperado: "clip"
console.log("doc overflow px:", document.scrollingElement.scrollHeight - window.innerHeight); // esperado: 0
```

Qualquer valor fora do esperado ⇒ build/CSS desatualizado ou regra não aplicada:

- `attr: false` → o deploy não contém `0e19f2d` (ou o `SidebarProvider` não repassou o
  atributo — ele repassa `{...props}` para o div em `components/ui/sidebar.tsx`, mas vale
  confirmar no Elements).
- `attr: true` porém overflow ≠ hidden/clip → a regra não está no CSS servido. Buscar
  `data-app-shell` no CSS da aba Network. Se ausente: cache/build.

### 4.3 Se o documento rola mesmo com o clamp ativo

Não deveria ser possível; se acontecer, listar o que está estendendo o `<html>`:

```js
[...document.body.children].map((el) => ({
  el,
  rect: el.getBoundingClientRect().bottom,
  pos: getComputedStyle(el).position,
}));
// Qualquer filho com pos !== "fixed"/"absolute" e bottom > innerHeight é o extensor.
```

### 4.4 Se o scroller é o SidebarInset (hipótese B — a mais provável)

Descobrir qual filho estoura a altura:

```js
const inset = document.querySelector('[data-slot="sidebar-inset"]');
console.log("inset overflow px:", inset.scrollHeight - inset.clientHeight);
[...inset.children].map((el) => ({
  el,
  h: el.getBoundingClientRect().height,
  minH: getComputedStyle(el).minHeight,
  flex: getComputedStyle(el).flex,
}));
// Esperado: header ≈ 60px e a div da página (flex-1, min-h-0) absorvendo o resto.
// Se a div da página tiver height > (inset.clientHeight - header - paddings - gaps),
// algo dentro dela está impondo min-height — inspecionar a cadeia até achar o elemento
// com min-height/height explícitos.
```

Causas plausíveis se (B) se confirmar:

1. **Toast/elemento em fluxo dentro do inset** que não modelei (ex.: algum componente que
   renderiza placeholder em fluxo antes de virar `fixed`).
2. **`AppHeader` maior do que o modelado** em certas larguras (ele tem `flex-wrap` de
   ações) — improvável causar 4x de overflow, mas barato de conferir.
3. **Diferença de breakpoint**: em `< xl` o painel de contexto vira `Sheet`; em `< md` a
   lista some. Se o teste local estiver numa largura intermediária, a composição muda —
   conferir se o overflow só ocorre em certas larguras.
4. **Scrollbar clássica do SO** (Windows com barras não-overlay): a barra do inset fica
   colada na borda da janela e parece "scroll da página". Nesse caso o bug não é scroll
   nenhum — é só a barra aparecendo quando o inset tem 1–2px de overflow por
   arredondamento de `svh`/zoom. Se `inset.scrollHeight - inset.clientHeight` ≤ 2px em
   zoom ≠ 100%, é isso; a correção seria trocar `overflow-y-auto` do inset por
   `overflow-y-clip` **na página de chats** (que gerencia os próprios scrolls) ou aceitar.

### 4.5 Enumerar todos os scrollers reais (visão geral rápida)

```js
[...document.querySelectorAll("*")]
  .filter((el) => el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY))
  .map((el) => ({ el, extra: el.scrollHeight - el.clientHeight }));
// Esperado na /dashboard/chats: lista de conversas, mensagens da thread, aba do painel
// de contexto, e NADA mais. Qualquer entrada extra é o alvo.
```

---

## 5. Estado esperado quando estiver correto

- Nenhuma scrollbar na borda da janela em `/dashboard/chats` (desktop, zoom 100%).
- `document.scrollingElement.scrollHeight === window.innerHeight`.
- Roda do mouse sobre lista/thread/painel rola apenas o container sob o cursor; sobre o
  header, não rola nada.
- As demais páginas do dashboard (vendas, relatórios…) rolam **dentro do `SidebarInset`**
  (barra começa abaixo de nada — ocupa a altura do main), não no documento.
- Páginas fora de `/dashboard` (marketing, shop) continuam com scroll de documento normal
  — as regras `:has([data-app-shell])` não podem vazar para elas.

## 6. Restrições para a correção

- Não modificar `components/ui/sidebar.tsx` (primitivo shadcn) se houver alternativa na
  camada do app — as correções até aqui vivem em `app/dashboard/layout.tsx` e
  `styles/globals.css`.
- `overflow: clip` (não `hidden`) para o que não deve rolar nunca — `hidden` continua
  rolável por script e `scrollIntoView` da thread de mensagens dispara exatamente isso.
- Atenção ao acoplamento de eixos do CSS Overflow 3: um eixo `hidden` rebaixa `clip` do
  outro eixo para `hidden`. O `!important` no body existe por causa disso.
