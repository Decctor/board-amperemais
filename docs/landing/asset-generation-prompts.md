# Landing asset generation

As ilustrações da landing vivem em `public/images/landing/` e são compostas pelos componentes em
`app/_components/ledger/` através do primitivo `LandingArt` (`_primitives/LandingArt.tsx`). Todas
são PNG com alpha, servidas por `next/image`. Texto, números e marcas nunca fazem parte do raster:
chips, balões e a placa da loja são HTML posicionado por cima (`ArtChip`).

Quatro cenas reaproveitam os PNGs do onboarding (`public/images/onboarding/`, ver
`docs/onboarding/asset-generation-prompts.md`): `whatsapp-gateway.png` (funcionalidade WhatsApp),
`cashback-reward.png` (fidelidade), `whatsapp-connection.png` (confiança) e `storefront.png` (CTA final).

## Geração

`scripts/generate-landing-assets.ts` guarda o manifesto (arquivo, tamanho, prompt) e roda pelo
Vercel AI Gateway com `openai/gpt-image-2` (`generateImage`, `background: transparent`,
`quality: high`). Cada chamada envia `cashback-reward.png` e `storefront.png` como referência de
estilo, o que mantém materiais, paleta e câmera iguais aos do onboarding.

```bash
AI_GATEWAY_API_KEY=... npx tsx ./scripts/generate-landing-assets.ts --variants 2
# um asset só, três variantes:
AI_GATEWAY_API_KEY=... npx tsx ./scripts/generate-landing-assets.ts --only crm-sorter --variants 3
```

Saída em `.generated/landing/` (ignorado pelo git): `<file>.v<n>.raw.png` é a resposta do modelo;
`<file>.v<n>.png` passou pela validação (canal alpha, borda 100 % transparente), teve as margens
aparadas e a silhueta reposicionada para ocupar 78 % do canvas, para que todos os objetos tenham a
mesma escala visual. A escolha da variante é manual: copiar a vencedora para `public/images/landing/`.
Estudos descartados não entram no repositório.

## Direção de arte

Prefixo enviado antes de cada prompt (igual para todos):

> Use the attached images ONLY as style reference (materials, palette, lighting, camera, level of
> stylization). Do not copy their objects. Create a NEW asset in exactly the same family.
> Production illustration asset for a premium Brazilian retail CRM landing page: cobalt blue #24549c,
> warm gold #ffb900, porcelain white and pale blue; toy-like miniature product render in satin ceramic
> and stiff matte resin (never fabric); precise rounded bevels; one coherent soft studio light from the
> upper left, bright and even, no glow, no light halo, no rim light; short soft contact shadow only;
> three-quarter front camera with restrained perspective. Canvas with actual transparent alpha
> background: everything outside the objects and their short contact shadow is fully transparent. No
> floor, no backdrop, no frame. Silhouette inside the central 78 percent with generous margin. No
> people, no logos, no lettering, no numbers, no currency symbols, no confetti, no sparkles, no watermark.

Lições do primeiro lote: sem as imagens de referência o modelo tende a tecido realista e luz
dramática; com elas, o resultado sai na família na primeira tentativa. Palavras de clima ("forgotten",
"quiet") puxam para cena noturna, então os prompts descrevem só objetos e arranjo.

## Prompts e escolha

| Arquivo | Seção | Canvas | Prompt (após o prefixo) | Variante escolhida |
| --- | --- | --- | --- | --- |
| `hero-return-loop.png` | Hero | 1536×1024 | Landscape 3:2 canvas; the cluster occupies the central 80 percent. A refined still life that tells 'a purchase becomes the next visit': on the left a miniature porcelain storefront with a cobalt-and-porcelain striped awning and an EMPTY sign panel; center-right an upright slightly tilted porcelain smartphone with a cobalt frame and a blank pale screen, one rounded WhatsApp-green chat bubble floating beside it with no text; in front a small matte cobalt shopping bag with gold handles; a thick satin-gold coin with an embossed curved return arrow leaning against the bag. Objects arranged in a gentle arc reading left to right. | v1 (balão com marca do WhatsApp) |
| `bag-asleep.png` | Problema 1 | 1024² | A single matte cobalt shopping bag with gold handles, standing but slightly slumped, one handle drooping to the side; a tiny porcelain crescent moon floating above it. Stiff resin surfaces, not cloth. No other objects. | v1 (v2 trouxe um brilho) |
| `calendar-hourglass.png` | Problema 2 | 1024² | A porcelain desk calendar block with cobalt binding rings and blank pages (no digits), and a satin-gold hourglass with pale blue sand standing beside it, sand almost fully run through to the bottom bulb. | v2 |
| `phone-pile.png` | Problema 3 | 1024² | An upright porcelain smartphone with a cobalt frame and blank screen, with an unruly stack of six rounded chat bubbles in pale blue and porcelain piled up and spilling over its top edge, one bubble tipping off the side. Bubbles are blank. | v1 (v2 ficou plano demais) |
| `poi-tablet.png` | Como funciona 01 | 1024² | A porcelain tablet on a small cobalt counter stand, angled toward the viewer, blank pale screen; a porcelain purchase receipt curling out from behind it with three embossed blue-gray lines and no text; a small matte cobalt shopping bag with gold handles at its foot. | v1 |
| `crm-sorter.png` | Como funciona 02 | 1024² | A cobalt porcelain sorting tray with three shallow compartments; several small round porcelain client tokens in pale blue rest in the compartments, and one satin-gold token is lifted above the tray as if being picked. A small gold gear leans at the base. | v1 (v2 trouxe uma concha) |
| `message-out.png` | Como funciona 03 | 1024² | One large rounded WhatsApp-green chat bubble in satin ceramic with two embossed check marks (no letters), tilted as if just sent, hovering above a small matte cobalt shopping bag with gold handles; a smaller pale-blue reply bubble rising behind. | v2 |
| `campaign-triggers.png` | Funcionalidade 01 | 1024² | A porcelain alarm clock with cobalt hands and a satin-gold bell on top, blank face with no digits; three small floating porcelain tag cards with cobalt eyelets and gold string fanning out beside it, all blank. | v1 (relógio cobalto) |
| `at-risk-lens.png` | Funcionalidade 03 | 1024² | A satin-gold magnifying glass with a cobalt handle hovering over three small round porcelain client tokens; the token under the lens is warm amber and slightly cracked, the other two are pale blue. | v2 (rachadura mais legível) |

Para regenerar um asset, edite o `subject` no manifesto do script, rode com `--only`, escolha a
variante e atualize a coluna acima.
