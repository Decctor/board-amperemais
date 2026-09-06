# Redesign visual do onboarding

Direção aprovada em 06/09/2026. Esta revisão substitui as orientações de layout plano, ausência de ilustrações e trilho lateral da seção visual do design técnico anterior. As regras de prontidão, persistência, permissões e ativação continuam nas implementações existentes.

## Estrutura

- Desktop a partir de 1024px: formulário à esquerda (52%) e painel ilustrado à direita (48%). O painel acompanha a rolagem sem disputar espaço com formulários longos.
- Celular e tablet: cena compacta antes do formulário, progresso acessível e ações inferiores com área segura.
- O trilho lateral passa a ser progresso compacto e lista de etapas em popover. Etapas visitadas continuam navegáveis; etapas adiadas mantêm seu estado.
- A imagem acompanha a etapa. Não há carrossel automático. Transições respeitam movimento reduzido; a navegação posiciona o foco no título da nova etapa.

## Cenas

`JourneyStory.tsx` cobre a escolha inicial, as seis etapas CRM e as sete ERP. Loja, WhatsApp e cashback usam imagens transparentes geradas. Vendas, campanhas, canais, produtos e simulação usam composições HTML com ícones vetoriais. A loja reaparece na configuração e conclusão, com o nome inserido como texto real.

Os exemplos de campanhas e produtos são ilustrativos. Não representam envios, saldos, pedidos ou conexão concluída. Logos Meta e WhatsApp vêm dos componentes vetoriais existentes. O logo Meta é omitido quando a conexão ativa é pelo gateway interno.

O formulário segue os tokens do tema do aplicativo. O painel ilustrado mantém sua paleta clara própria para preservar o contraste das imagens, inclusive quando o formulário usa tema escuro.

## Arquivos e manutenção

- Componentes de composição: `app/onboarding/_components/shell/`.
- Tokens e estilos exclusivos: `onboarding.module.css`.
- Arte: `public/images/onboarding/` com `storefront.png`, `whatsapp-connection.png`, `whatsapp-gateway.png` e `cashback-reward.png`. Nada além dos quatro PNGs em uso; estudos descartados não ficam no repositório.
- Prompts e direção de arte: `asset-generation-prompts.md`.
- Prévia de desenvolvimento: `/onboarding-preview`, indisponível em produção. Usa formulários e cenas reais com dados de exemplo; botões de integração ainda abrem suas integrações reais. Não usar para testar mutações.

As imagens passam por `next/image`, com dimensão reservada e tamanhos responsivos. Textos e marcas não estão incorporados aos PNGs.
