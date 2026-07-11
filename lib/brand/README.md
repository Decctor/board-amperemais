# Brand Assets

Geração de assets estáticos da marca (fundos de reunião, capas, thumbnails, etc.)
direto da codebase, reutilizando o pipeline satori → resvg das imagens de relatório.

## Uso

```bash
# Exporta todos os templates, todas as variantes (PNG)
npm run brand:export

# Um template/variante específico
npm run brand:export -- --template meeting-background --variant dark

# SVG além de PNG
npm run brand:export -- --format both
```

Saída em `exports/brand/` (gitignored — os arquivos são regeneráveis).

## Estrutura

| Arquivo                | Responsabilidade                                                 |
| ---------------------- | ---------------------------------------------------------------- |
| `tokens.ts`            | Cores da marca (espelham `styles/globals.css` e os logos)        |
| `assets.ts`            | Registry dos logos de `utils/svgs/logos/` + loader como data URL |
| `render.tsx`           | Renderizador genérico satori → resvg (SVG/PNG)                   |
| `templates/types.ts`   | Contrato `TBrandTemplate`                                        |
| `templates/<nome>.tsx` | Um template por arquivo, com suas variantes                      |
| `templates/index.ts`   | Registry de templates consumido pelo CLI                         |

## Adicionando um template

1. Crie `templates/<nome>.tsx` exportando um `TBrandTemplate` (dimensões, variantes
   e `render(variant)` retornando JSX compatível com satori).
2. Registre no `BRAND_TEMPLATES` em `templates/index.ts`.
3. Exporte com `npm run brand:export -- --template <nome>`.

Regras para não virar bagunça:

- **Um template por arquivo**; variantes são configuração dentro do template, não arquivos novos.
- **Cores sempre de `tokens.ts`**, nunca hex solto (exceto tons derivados de gradiente, que ficam na config da variante).
- **Logos sempre via `assets.ts`** — não duplique SVGs nem embuta paths manualmente.
- Lembre das limitações do satori: todo `div` com filhos precisa de `display: flex`,
  sem `box-shadow` complexo, sem `position: fixed`.
