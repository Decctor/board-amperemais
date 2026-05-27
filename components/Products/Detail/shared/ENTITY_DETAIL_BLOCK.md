# EntityDetailBlock pattern

Reusable layout for entity profile pages (product, client, seller).

## Page shell

- `?tab=cadastro|estatisticas` via `nuqs` (default `estatisticas` for analytics-first flows).
- Shared header: back link, identifier badge, title, optional thumbnail (`product-detail-header.tsx`).
- Tabs: **CADASTRO** (editable blocks) | **ESTATÍSTICAS** (KPIs/charts).

## Block types

| Type | UI | Save |
|------|-----|------|
| Scalar block | `EntityDetailBlockSection`: view rows + EDITAR → inline form | SALVAR / CANCELAR per block |
| Child collections | `SectionWrapper` + list + per-item `ResponsiveMenu` | SALVAR on section (full entity payload) |

## Files (product pilot)

- `entity-detail-block-section.tsx` — scalar block wrapper
- `product-field-row.tsx` — label/value row in view mode
- `use-product-update.ts` — shared mutation + uploads
- `blocks/product-*-section.tsx` — domain sections

## Rollout order

1. Product (`product-cadastro-tab.tsx`) — done
2. Seller (smaller cadastro)
3. Client (cashback, purchases blocks)

## Rules

- One scalar block in edit mode at a time; confirm before switching.
- Do not use a single modal for all sections.
- Keep list **EDITAR** linking to `/id?tab=cadastro`.
