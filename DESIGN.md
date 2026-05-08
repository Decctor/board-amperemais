---
name: RecompraCRM
description: Plataforma de otimização de vendas e fidelização de clientes para varejo local e WhatsApp.
colors:
  canvas: "#ffffff"
  ink: "#171717"
  ink-on-strong: "#fafafa"
  surface-quiet: "#f5f5f5"
  ink-muted: "#737373"
  line-hair: "#e5e5e5"
  loyalty-amber: "#ffb900"
  loyalty-amber-text: "#000000"
  signal-red: "#ef4444"
  signal-red-on: "#fafafa"
  data-blue-deep: "#15599a"
  data-amber-dark: "#fead61"
  sidebar-canvas: "#fafafa"
  sidebar-ink: "#3f3f46"
typography:
  display:
    fontFamily: "\"Raleway\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "\"Raleway\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "\"Raleway\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "\"Raleway\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "\"Raleway\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.02em"
rounded:
  sm: "calc(0.5rem - 4px)"
  md: "calc(0.5rem - 2px)"
  lg: "0.5rem"
  xl: "0.75rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section-y: "1rem"
  section-x: "0.75rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-on-strong}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-brand:
    backgroundColor: "{colors.loyalty-amber}"
    textColor: "{colors.loyalty-amber-text}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  input-field:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
    width: "100%"
---

# Design System: RecompraCRM

## 1. Overview

**Creative North Star: "The Counter-Ready Ledger"**

RecompraCRM looks like a tool the shop owner trusts beside the cash drawer: legible numbers first, obvious actions second, warm utility instead of startup gloss. The base is a neutral light shell (soft white canvas, near-black type) so dense commerce data, RFM grids, and WhatsApp campaign stats stay readable for hours. Loyalty and promotional energy concentrate in a single amber (`loyalty-amber`) used for cashback and brand moments rather than painting whole screens. Density follows PRODUCT.md's split between **Estatísticas** (charts, KPIs) and **Banco de Dados** (filters, tables, profiles): sections feel compartmentalized without turning into stacks of indistinguishable cards.

The system rejects decorative chrome that competes with data. Motion stays at the level of state feedback (hover, focus, dialog open), not theatrical page loads. Dark mode exists as a theme branch in tokens, but day-to-day visual truth in this document matches the default light dashboard used in storefront and back-office contexts.

**Key Characteristics:**

- Raleway-forward typography with bold weight contrast for page titles and semibold for card titles.
- shadcn-style radii: `0.5rem` base with derived `sm`/`md` steps; cards often step up to `rounded-xl` (12px).
- Primary UI ink is neutral near-black on white; charts and occasional highlights pull from the five `chart-*` hues in CSS, plus domain-specific blues and ambers in some commerce screens.
- Navigation is a persistent sidebar (≈16rem, sheet on mobile) with grouped Portuguese labels matching module IA.

## 2. Colors: The Varejo Neutrals + Loyalty Amber

The palette is **Restrained**: tinted neutrals carry almost every surface, with **loyalty-amber** as the deliberate accent for cashback, brand buttons, and reward language.

### Primary

- **Near-black UI ink** (`#171717`, HSL `0 0% 9%` as `:root --primary`): Default filled buttons (`variant default`), sidebar primary accents in light theme, scrollbar thumb tints, and body emphasis where `text-primary` is applied on the root layout. Not a marketing hue; it is the workhorse foreground/action color.

### Secondary

- **Quiet loft gray** (`#f5f5f5`, `--secondary` / `--muted`): Secondary buttons, hover surfaces (`accent`), alternating table feel, and muted panel backgrounds. Pairs with the same near-black foreground token family for text on those surfaces.

### Tertiary

- **Data sequence hues** (chart-1…chart-5 in `styles/globals.css`): Reserved for analytics series, funnels, and multi-series charts so each dashboard module stays interpretable without importing new colors per screen.

### Neutral

- **Canvas white** (`#ffffff`): Page background (`--background` light).
- **Card white** (`#ffffff`): Card and popover surfaces in light; separated from page by border and light shadow, not by color jump.
- **Hairline border** (`#e5e5e5`, `--border` / `--input`): Inputs, cards, dividers.
- **Muted label ink** (`#737373`, `--muted-foreground`): Helper text, descriptions, placeholder tone.
- **Sidebar veil** (`#fafafa`, `--sidebar-background`): Rail background; **sidebar ink** (`#3f3f46` approx. from `--sidebar-foreground`) for labels.

### Accent & brand

- **Loyalty amber** (`#ffb900`, `--color-brand`): Primary brand cashback CTA (`variant brand`, `ghost-brand`). Text on amber uses **`#000000`** (`--color-brand-foreground`) today; treat as high-contrast shelf label, not body copy color.
- **Signal red** (`#ef4444` approx., `--destructive`): Irreversible actions, errors, destructive buttons.

### Domain accents (local overrides)

Some commerce views use **deep retail blue** (`#15599a`) in light mode and **warm amber** (`#fead61`) in dark mode for emphasized currency lines on product analytics. These are feature-local; extend the sidecar ramps if they spread.

### Named Rules

**The One Accent Rule.** Amber appears where money returned to the customer or brand promise is the story (cashback, rewards, highlighted promo CTAs), not for general navigation or table chrome.

**The No Neon Chroma Rule.** Charts use balanced saturation from the predefined `chart-*` slots; do not introduce neon greens, purple gradients on data backgrounds, or decorative gradients on marketing surfaces that compete with KPI readability.

## 3. Typography

**Display Font:** Raleway (with `ui-sans-serif`, system-ui fallbacks)  
**Body Font:** Raleway (same stack)  
**Label Font:** Raleway (no separate mono stack in the root theme)

**Character:** Humanist-geometric sans with a slightly editorial weight range; friendly enough for WhatsApp-adjacent workflows, still sober enough for financial tables.

### Hierarchy

- **Display** (800, `1.5rem` / ~24px, tight tracking): Page titles in commerce surfaces (e.g. bold `text-2xl` / `font-black` patterns for module heroes like "Loja Digital" and monetary summaries in modals).
- **Headline** (600, `1.25rem`, tight tracking): Step titles in bulk flows ("Importação concluída", mapping review screens).
- **Title** (600, `1rem`, tight tracking): Card titles (`CardTitle`), compact summaries.
- **Body** (400, `1rem`, line-height 1.5): Default reading text; keep line length near 65–75ch in prose blocks inside modals or community content.
- **Label** (700, `0.75rem`, slight tracking, **uppercase**): Section chrome (`SectionWrapper` titles) for module segmentation between KPI blocks and data tables.

### Named Rules

**The Section Uppercase Rule.** Uppercase is reserved for section headers and compact module labels, not for long sentences or table column titles.

## 4. Elevation

The system is **lightly lifted**: most depth comes from `shadow-sm` / `shadow-xs` on cards and buttons plus hairline borders, not from deep drop shadows. Dialogs and sheets step up to `shadow-lg` for focus separation. Flat regions (plain `bg-background` dashboard canvas) deliberately recede so bordered cards and section wrappers read as tiles.

### Shadow vocabulary

- **Card rest** (`shadow-sm`): Default `Card` and primary buttons inherit a minimal sm shadow in light theme utilities.
- **Input rest** (`shadow-xs`): Text fields carry a subtle xs shadow for edge definition.
- **Overlay** (`Dialog` overlay `bg-black/80`): Full-screen dim for modal focus; content panel uses `shadow-lg`.

### Named Rules

**The Flat Canvas Rule.** The page background stays flat; elevation cues belong to interactive objects (cards, popovers, dialogs), not full-bleed section backgrounds.

## 5. Components

### Buttons

- **Shape:** `rounded-md` (6px effective from `0.5rem` base minus 2px), height 36px default (`h-9`), compact variants at 32px / 28px.
- **Primary:** `bg-primary` / `text-primary-foreground`, `shadow-sm`, hover `bg-primary/90`.
- **Brand:** `bg-brand` / `text-brand-foreground`, same hover opacity pattern for loyalty flows.
- **Secondary / outline / ghost:** Follow shadcn mappings (`secondary`, `outline` with `border-input`, `ghost` with accent hover).
- **Semantic:** `success`, `warning`, `destructive`, and `-light` variants use stock Tailwind greens/yellows/destructive tints for inline status actions.
- **Hover / focus:** Color transitions via `transition-colors`; focus ring `ring-1` / `ring-ring` on focus-visible; disabled: reduced opacity, no pointer.

### Cards / containers

- **Corner style:** `rounded-xl` (12px) on `Card` and `SectionWrapper`-style panels.
- **Background:** `bg-card` with `text-card-foreground`.
- **Border:** `border` with default border token; `SectionWrapper` uses `border-primary/20` for a faint tie-in to primary ink.
- **Shadow:** `shadow-sm` on cards, `shadow-xs` on inner utilities where applied.
- **Padding:** Card header/content defaults (`p-6`, content `pt-0`); section wrapper uses tighter `px-3 py-4` for dense dashboard rhythm.

### Inputs / fields

- **Style:** `rounded-md`, `border-input`, transparent background, `text-sm`, placeholder `text-muted-foreground`.
- **Focus:** `ring-1 ring-ring`, outline hidden on focus-visible.
- **Disabled:** Reduced opacity, `cursor-not-allowed`.

### Navigation (sidebar)

- **Layout:** Fixed rail width `16rem` desktop, `18rem` mobile sheet; icon mode `3rem`.
- **Typography:** Menu entries use small iconography (`w-4 h-4` lucide) beside Portuguese labels; grouping labels from config (`Geral`, `Comercial`, etc.).
- **State:** Active/hover states follow sidebar primitives (`sidebar-accent` slots) with rounded items; keyboard shortcut `b` toggles, cookie-backed persistence.

### Dialogs

- **Overlay:** Dark translucent scrim, fade animation.
- **Content:** Centered `max-w-lg` panel, `rounded-lg`, `border`, `p-6`, enter/exit zoom + fade.

### Signature pattern: `SectionWrapper`

Dashboard modules wrap KPI clusters: uppercase `text-xs` title row with optional icon and actions, children spaced `gap-3`. This pattern enforces the **Estatísticas / configuration** visual rhythm without blanketing the page in duplicate card grids.

## 6. Do's and Don'ts

PRODUCT.md does not enumerate visual anti-references; guardrails below align platform tone (serious retail operations, BI clarity, WhatsApp-adjacent workflows) with the implemented token set.

### Do:

- **Do** keep body copy and numeric tables on near-black ink and white/loft-gray surfaces for daylight readability at the counter.
- **Do** use **loyalty-amber** sparingly for cashback, gift, and brand-forward CTAs so amber stays semantically tied to money returning to the customer.
- **Do** respect the sidebar + `SectionWrapper` rhythm when adding modules so new screens feel like the same operations suite.
- **Do** use chart tokens (`chart-1`…`chart-5`) for multi-series visuals before introducing new hex colors.
- **Do** pair bold weight jumps (800/700 titles vs 400 body) for hierarchy; Raleway carries both without extra families.

### Don't:

- **Don't** cover large dashboard areas in saturated amber or chart colors; elevation and whitespace separate content, not rainbow backgrounds.
- **Don't** use gradient text, glassmorphism panels, or neon dual-tone skins that read as generic AI-SaaS marketing rather than a working storefront tool.
- **Don't** apply colored left/right border stripes thicker than 1px as the primary way to mark list rows; use background tint, icons, or typography instead.
- **Don't** shrink label text below `0.75rem` for critical operational labels (PIN prompts, redemption caps) without testing touch targets on the **Ponto de Interação** tablet flows.
- **Don't** mute destructive actions visually: keep `destructive` contrast and wording explicit for money movement and campaign sends.
