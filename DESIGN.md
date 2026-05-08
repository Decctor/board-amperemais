---
name: RecompraCRM
description: CRM e automação de vendas para o varejo físico local brasileiro
colors:
  grafite-operacional: "#171717"
  grafite-foreground: "#fafafa"
  ouro-comercial: "#ffb900"
  ouro-foreground: "#000000"
  canvas: "#ffffff"
  canvas-foreground: "#0a0a0a"
  superficie: "#f5f5f5"
  muted: "#737373"
  destrutivo: "#ef4444"
  borda: "#e5e5e5"
  chart-coral: "#e8614a"
  chart-teal: "#299e8f"
  chart-navy: "#264d5f"
  chart-amber: "#e8c259"
  chart-orange: "#e87f3a"
typography:
  title:
    fontFamily: "Raleway, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Raleway, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Raleway, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.05em"
  micro:
    fontFamily: "Raleway, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  base: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.grafite-operacional}"
    textColor: "{colors.grafite-foreground}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "#2a2a2a"
  button-brand:
    backgroundColor: "{colors.ouro-comercial}"
    textColor: "{colors.ouro-foreground}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-brand-hover:
    backgroundColor: "#e6a700"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.canvas-foreground}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.canvas-foreground}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.canvas-foreground}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.canvas-foreground}"
    rounded: "{rounded.lg}"
    padding: "24px"
  section-wrapper:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.canvas-foreground}"
    rounded: "{rounded.lg}"
    padding: "16px 12px"
---

# Design System: RecompraCRM

## 1. Overview

**Creative North Star: "Inteligência de Balcão"**

The system speaks to a shop owner or sales manager at their counter — not a startup founder in a coffee shop. Every screen is a working instrument: dense, fast, unforgiving of wasted space, because the person using it is checking cashback balances, reading campaign conversion funnels, or scanning 800 customers to find the ones going dormant. Design earns attention through clarity, not decoration.

Restraint is structural, not aesthetic. The near-black / pure-white palette with a single amber accent mirrors the logic of a physical ledger: ink on paper, one highlight for what matters most. Color is information. The amber is scarce and deliberate — reserved for brand moments, calls to action, and cashback figures the client should notice. Everything else is structure.

This system explicitly rejects the generic SaaS dashboard aesthetic (rounded cards with pastel icon backgrounds, gradient metrics, hero stats with big numbers and supporting sparklines). It rejects deep-navy-and-gold fintech gradients. It rejects glassmorphism and any surface blur used decoratively. It is built for the repetition of daily use by a retail team — not for the impression of a first product demo.

**Key Characteristics:**
- Single geometric sans (Raleway), constrained to two dominant sizes (12px label, 14px body)
- Near-black / pure white / amber as the complete palette; no decorative color outside data viz
- Hybrid elevation: tonal surface layering for content areas, minimal shadows only on raised/interactive components
- Information density over whitespace; rhythm through consistent spacing units not padding uniformity
- Mobile: sheet-and-drawer pattern (ResponsiveMenu) collapses all editing to bottom sheets on small viewports

---

## 2. Colors: The Ledger Palette

Three decisions, fully committed. The palette makes no room for decoration.

### Primary
- **Grafite Operacional** (`#171717`): The authority color. Primary buttons, active sidebar states, modal headings, focus rings, high-contrast badges. Diluted to 20% opacity only for the SectionWrapper border accent (`border-primary/20`). Elsewhere it is used at full strength or not at all.

### Secondary
- **Ouro Comercial** (`#ffb900`): The amber brand accent. Brand-variant buttons, cashback totals, loyalty-program highlights, and any single CTA in a view that needs commercial emphasis. Its rarity is the point.

### Tertiary (Semantic)
- **Destrutivo** (`#ef4444`): Reserved exclusively for delete actions, destructive confirmations, and error states. Never decorative.

### Neutral
- **Canvas** (`#ffffff`): The base reading surface. Page backgrounds, card fills, dialog backgrounds.
- **Superfície** (`#f5f5f5`): Secondary surface. Inactive tab backgrounds, muted button hover areas, skeleton loaders.
- **Muted** (`#737373`): Supporting text. Descriptions, captions, placeholder values, card meta-labels, tab labels in inactive state.
- **Borda** (`#e5e5e5`): All structural dividers. Input strokes, card borders, separator lines.
- **Grafite Foreground** (`#fafafa`): Text on dark (Grafite Operacional) surfaces. Primary button labels, badge text on default badges.

### Data Visualization
Five consistent chart roles, never used in UI chrome:
- **Coral** (`#e8614a`): Primary data series.
- **Teal** (`#299e8f`): Secondary data series.
- **Navy** (`#264d5f`): Tertiary or reference line.
- **Amber** (`#e8c259`): Categorical highlight, period comparison.
- **Orange** (`#e87f3a`): Fifth series or warning-level threshold.

### Named Rules
**The Amber Scarcity Rule.** Ouro Comercial appears on at most one primary action or highlighted value per viewport. When every button is amber, none of them matters. Reserve it for the action or figure that is commercially decisive in that specific context.

**The Palette Closure Rule.** These ten tokens are the complete color vocabulary. Introducing a new UI color — even "just for this one component" — requires changing DESIGN.md. No ad-hoc Tailwind color classes outside this set.

---

## 3. Typography: Single Voice

**Body + Display Font:** Raleway (ui-sans-serif, system-ui, sans-serif)

**Character:** A single geometric-humanist sans used at every level. Raleway's clean letter forms and moderate x-height hold legibility at 12px — the smallest size this system regularly uses — without feeling sterile. Its geometry projects a modern, slightly formal personality suited to a data tool used by business owners who take numbers seriously.

### Hierarchy
- **Title** (semibold 600, 14px, line-height 1.25, letter-spacing -0.01em): Modal titles, dialog headings, card titles. The highest level seen inside operational views.
- **Body** (regular 400, 14px, line-height 1.5): List item text, descriptions, field values, paragraph content. Cap line length at 65–75ch in prose contexts.
- **Label** (bold 700, 12px, line-height 1, letter-spacing 0.05em, UPPERCASE): SectionWrapper headers, tab labels, sidebar group names, stat field labels. The workhorse of the hierarchy — seen constantly.
- **Micro** (medium 500, 11px, line-height 1): Meta timestamps, secondary counts, unit suffixes, pagination labels. Sparing use only.

### Named Rules
**The Uppercase Register Rule.** Section titles, tab labels, sidebar group headers, and stat labels are always uppercase at 12px/bold with `letter-spacing: 0.05em`. Sentence-case headings belong in modal titles only. Mixing case registers within the same hierarchy level is prohibited.

**The Two-Size Rule.** Operational views use exactly two type sizes: 12px (label) and 14px (body/title). Micro (11px) is allowed for genuine secondary metadata. Sizes above 14px are reserved for the POI (Point of Interaction) touch UI and onboarding screens, where physical reading distance and large touch targets warrant them.

---

## 4. Elevation

The system uses a hybrid model. Content areas achieve depth through tonal contrast between surfaces (Canvas page → Card surface → Popover/Dialog). Shadows exist on interactive components as affordance signals, not decoration.

### Shadow Vocabulary
- **Hairline** (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)`): Inputs, SectionWrappers, secondary containers. The default "raised but barely" state for bordered surfaces.
- **Card** (`box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`): Primary Card components, primary buttons, active tab indicators. Signals clickability or content importance.
- **Float** (`box-shadow: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)`): Dropdowns, popovers, tooltips. The only context where a perceptible shadow is expected.
- **Modal** (provided by Radix overlay): Full overlay shadow for Dialogs and Drawers. Never manually replicated.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only on interactive components (buttons, tabs) or to separate floating layers (dialogs, dropdowns, popovers) from their background context. Never apply a shadow decoratively to a container that does not move, lift, or float.

---

## 5. Components

### Buttons
Five variants in active use. Shape is uniformly gently rounded (6px, `rounded-md`). Never pill-shaped — that belongs to loyalty-app aesthetics this system avoids.

- **Primary** (`default`): Grafite Operacional fill, Grafite Foreground text, Card shadow. `h-9 px-4` (36px × 16px padding). The default action color. Hover: opacity/90.
- **Brand**: Ouro Comercial fill, black text, Card shadow. Same geometry. Cashback, campaign, and loyalty-critical CTAs only.
- **Outline**: transparent fill, 1px Borda border, Canvas-foreground text. Hover: Superfície background. The standard cancel and secondary action.
- **Ghost**: transparent fill, no border. Hover: Superfície background. Icon-only toolbar actions and low-hierarchy inline controls.
- **Destructive**: Destrutivo fill, white text. Only for confirmed delete flows — never as a warning indicator.

Size scale: `h-9` (36px) default; `h-8 text-xs` (32px) `sm`; `h-7 text-xs` (28px) `xs` for dense table rows only.

Disabled: `opacity-50 pointer-events-none` across all variants.

### Chips / Badges
Rounded-md (6px), 12px semibold text, compact padding (`px-2.5 py-0.5`). Three variants:
- **Default** (dark fill): Status labels in entity lists, active filter pills.
- **Secondary** (Superfície fill, canvas-foreground text): Inactive state, neutral tags.
- **Outline** (no fill, Borda border): Supplementary labels that must not compete with content.

Quick-filter badge rows in database views use Outline at rest; toggling to Default (active) state communicates the active filter without color proliferation.

### Cards / Section Wrappers
Two container primitives that together handle all content grouping:

**Card** (shadcn primitive): `rounded-xl border bg-card shadow-sm`. Internal padding `p-6` (24px). Clean 12px corners, Card shadow. Background always Canvas. No colored borders, no accent stripes, no headers with background fills.

**SectionWrapper** (app primitive): `rounded-xl border border-primary/20 bg-card shadow-xs px-3 py-4`. The dominant content grouping on dashboard pages. The title row is always uppercase 12px/bold with an optional leading Lucide icon (16px). Internal children gap of `gap-6` (24px) between title row and content. Never nest a SectionWrapper inside another SectionWrapper.

### Inputs / Fields
- **Style**: transparent fill, 1px Borda (`#e5e5e5`) stroke, 6px radius, 36px height, 14px Raleway regular.
- **Focus**: `ring-1` at Grafite Operacional — a tight single-pixel ring, no glow or bloom.
- **Placeholder**: Muted (`#737373`).
- **Disabled**: `opacity-50 cursor-not-allowed`.
- **Error**: destructive ring color, no fill change.

### Navigation (Sidebar)
Inset variant, collapsible-to-icon mode. Items lead with a 16px Lucide icon, then the label in 14px body. Group section headers in 12px muted uppercase. Active state: full-width `bg-sidebar-accent` highlight, no left-border stripe. The sidebar header shows a 32px rounded-lg org logo; collapses to logo-only in icon mode.

### Tabs
`TabsList` uses Superfície (`#f5f5f5`) background, compact `h-fit rounded-lg px-2 py-1`. Triggers: icon + label, `rounded-lg px-2 py-2`, 14px. Active: `bg-card shadow-sm` — a white "raised tab" that lifts from the muted list without any border or colored indicator.

### Stat Unit Card (Signature Component)
The primary data display atom across all statistics views. One metric value (large, semibold), one label (12px uppercase), and an optional comparison indicator. The number is the design. Background is always Canvas; no gradient headers, no colored top strips, no sparklines unless the data genuinely warrants them. If it looks like a SaaS hero metric, it has gone wrong.

---

## 6. Do's and Don'ts

### Do:
- **Do** use `text-xs font-bold tracking-tight uppercase` (the Label scale) for every section title, group header, and stat field label.
- **Do** reserve Ouro Comercial (`#ffb900`) for at most one primary CTA or highlighted value per viewport. Use primary (dark) buttons everywhere else.
- **Do** use SectionWrapper as the primary page-level content grouping. Only use Card for standalone entity summaries or popover content.
- **Do** use the outline variant for secondary/cancel actions and the ghost variant for icon-only toolbar buttons.
- **Do** route all create and edit interactions through ResponsiveMenu (Dialog on desktop, Drawer on mobile). No inline editing in page views.
- **Do** size buttons at `h-9` (36px) by default; drop to `h-7 xs` only inside dense table rows where space is genuinely constrained.
- **Do** keep chart colors strictly within the five defined data-viz tokens. Never reuse chart colors in UI chrome.

### Don't:
- **Don't** use gradient text (`background-clip: text` with a gradient fill). A single solid color at increased weight communicates emphasis without the cliché.
- **Don't** use glassmorphism (`backdrop-filter: blur`) on any component. If a surface needs visual separation, use a border or tonal background.
- **Don't** use `border-left` greater than 1px as a colored accent stripe on cards, list items, or alerts. Rewrite with full borders, background tints, or leading icons.
- **Don't** dress up the Stat Unit Card with gradient backgrounds, colored header strips, or decorative sparklines. The number is the design.
- **Don't** nest cards. No Card inside Card, no SectionWrapper inside SectionWrapper. Depth is tonal, not physical nesting.
- **Don't** apply `shadow-md` or `shadow-lg` to static content containers. Those shadow weights belong exclusively to dialogs, drawers, and floating layers.
- **Don't** use Ouro Comercial as a large surface background. It is an accent on ≤10% of any viewport, not a dominant fill.
- **Don't** introduce Tailwind color utilities outside the ten defined palette tokens without updating DESIGN.md. `text-blue-500` and similar one-offs fracture the system silently.
- **Don't** use the deep-navy-and-gold fintech aesthetic or any SaaS marketing dashboard look (rounded icon cards, soft pastel gradients, hero metrics with supporting stats in a 3-column grid).
- **Don't** commit to a "modern" or "premium" feel through decoration. In this product, authority comes from the correctness and speed of the data, not from visual ornament.
