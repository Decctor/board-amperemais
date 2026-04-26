# Video Production Specification
## RecompraCRM — Campaign Filtering Launch
## Production Tool: Hyperframes

---

## 1. Technical Specifications

| Property | Reels (Primary) | Feed (Secondary) |
|---|---|---|
| Aspect ratio | 9:16 | 4:5 |
| Resolution | 1080 × 1920 px | 1080 × 1350 px |
| Frame rate | 30fps | 30fps |
| Duration | ~90 seconds | ~90 seconds |
| Safe zone | Central 1080 × 1350 px of the frame | Full frame |
| Output format | MP4, H.264 | MP4, H.264 |

**Production approach**: All key visuals and text must be composed within the central 1080 × 1350 px safe zone of the 9:16 master. The Feed version is then cropped from that area — not a full re-layout. The top and bottom 285 px of the Reels version are decorative space only (background, no critical content).

**Hyperframes workflow**: Use the `/hyperframes` Claude Code slash command to author compositions. Feed this spec as the brief. Render both versions from separate composition files.

---

## 2. Brand & Style System

### Color Palette

| Color | Hex | Role in Video |
|---|---|---|
| Blue | `#24549C` | Primary accent — active UI elements, selected states, copy, logo |
| Yellow | `#FFB900` | Secondary accent — neighbourhood fill, active time window button, decorative line |
| Red | `#E7000B` | Map pin, audience counter badge, key number highlights |
| White | `#FFFFFF` | UI surfaces, text on dark backgrounds, continent fills on globe |

**Scene background**: Off-white `#F7F8FA` for all light scenes. Pure white `#FFFFFF` for the end card only. Deep navy `#0F1C33` exclusively for the globe sequence (Scenes 4a–4d).

**UI mockup surfaces**: White `#FFFFFF` cards with `box-shadow: 0 4px 20px rgba(0,0,0,0.08)` and `border-radius: 16px`.

### Typography

All text uses **Montserrat** (load via Google Fonts CDN in Hyperframes HTML).

| Role | Weight | Size | Color |
|---|---|---|---|
| Hero copy | Bold (700) | 54px | `#24549C` |
| Sub-copy / labels | SemiBold (600) | 34px | `#1A1A2E` |
| Map location labels | Bold (700) | 42px | `#FFFFFF` |
| UI mockup text | Medium (500) | 18–22px | `#1A1A2E` |
| End card CTA | SemiBold (600) | 30px | `#24549C` |

Letter-spacing: `+0.02em` on all uppercase labels.

### CSS Variables (Hyperframes root)

```css
:root {
  --color-blue: #24549C;
  --color-yellow: #FFB900;
  --color-red: #E7000B;
  --color-white: #FFFFFF;
  --color-bg: #F7F8FA;
  --color-navy: #0F1C33;
  --color-text: #1A1A2E;
  --radius-card: 16px;
  --shadow-card: 0 4px 20px rgba(0,0,0,0.08);
}
```

### Overall Aesthetic

Light, clean, airy. White and off-white dominate every scene except the globe sequence. Color is used surgically — one accent per moment, never competing. UI mockups are HTML/CSS components (not static images), styled to match the app: generous padding, rounded corners, soft shadows. No decorative gradients.

---

## 3. Music Direction

**Genre**: Light modern electronic / lo-fi optimistic. Reference: Ikson, Aso, or equivalent royalty-free tracks.

| Segment | Timing | Direction |
|---|---|---|
| Intro | 0:00–0:18 | Sparse, melodic. Soft piano or synth only. Calm confidence. |
| Build | 0:18–0:40 | Beat enters softly alongside Top Buyers scene. |
| Swell | 0:40–1:08 | Music swells slightly. Cinematic peak for globe sequence. |
| Resolution | 1:08–1:20 | Beat drops back to melodic theme. Lands with the combination scene. |
| Fade | 1:20–1:28 | Music fades to silence cleanly over ~3 seconds. |

Edit timings should be music-led — cuts and transitions land on beats or melodic phrases.
No voiceover. Music runs at full volume throughout.

---

## 4. Scene-by-Scene Specification

---

### Scene 1 — The Opening `0:00 → 0:10`

**Background**: `#F7F8FA`

**Hyperframes implementation**: CSS fade + translate animations. No GSAP needed.

**Animation sequence**:
1. `0:00–0:03` — RecompraCRM logo fades in and scales from 95% → 100%. Centered horizontally, upper-center of the safe zone. Easing: `ease-out`.
2. `0:03–0:08` — A 2px horizontal rule in `#24549C`, 240px wide, draws from center outward using `clip-path: inset(0 50% 0 50%) → inset(0 0% 0 0%)`. Positioned below the logo.
3. `0:04–0:09` — Hero copy fades up from `translateY(10px)` to `translateY(0)`:

   > **"As campanhas no RecompraCRM ficaram ainda melhores."**

   Montserrat Bold, 54px, `#24549C`. Max width 860px, centered. Line break after "RecompraCRM".

4. `0:09–0:10` — Hold. Transition: CSS `opacity` dissolve over 12 frames (400ms).

---

### Scene 2 — Introducing the Two Capabilities `0:10 → 0:18`

**Background**: `#F7F8FA`

**Hyperframes implementation**: HTML/CSS card components. Spring animation via GSAP.

**Animation sequence**:
1. `0:10–0:12` — A simplified campaign filter panel card slides up from `translateY(60px)` with `opacity: 0 → 1`. White surface, `border-radius: 16px`, `box-shadow: var(--shadow-card)`.
2. `0:12` — First capability card pops in with GSAP spring (`type: "spring", stiffness: 300, damping: 18`):
   - 4px left border in `#FFB900`
   - Pin icon (SVG, `#24549C`) + label *"Localização"* in Montserrat SemiBold
3. `0:14` — Second capability card pops in with same spring:
   - 4px left border in `#FFB900`
   - Star icon (SVG, `#24549C`) + label *"Top compradores de produto"* in Montserrat SemiBold
4. `0:16–0:18` — Both cards visible. Brief hold.

**Transition**: CSS `transform: translateX(-100%)` wipe to reveal Scene 3.

---

### Scene 3 — Top Buyers of Product `0:18 → 0:40`

**Background**: `#F7F8FA`

**Hyperframes implementation**: HTML/CSS mockup panel. GSAP for counter animation and typing effect. This panel is a real HTML component — not an image.

**Panel anatomy**:
- Header: *"Top compradores de produto"* — Montserrat SemiBold, `#24549C`, star SVG icon to the left
- Product picker: text input field styled with `border: 1.5px solid #24549C` when active
- Time window: three buttons side by side (*Geral / 30 dias / 90 dias*)
- Top N: number input field
- Audience counter badge: absolutely positioned top-right of the panel, circular `48px`, `background: #E7000B`, white Montserrat Bold number

**Step 1 — Product selection** `0:20–0:26`:
- Product field activates: `border-color` transitions to `#24549C`
- Typing animation (GSAP or CSS `steps()`): *"Gelato"* types in character by character
- Dropdown appears with *"Gelato 180ml"* highlighted in `#24549C` at 10% opacity background
- Item selected: dropdown closes with `opacity: 0` + `translateY(-4px)`, field populates

**Step 2 — Time window** `0:26–0:32`:
- *30 dias* button clicked: `background-color` transitions to `#FFB900`, text transitions to `#FFFFFF`. Others fade to gray `#CBD5E0`.
- Sub-copy fades in below the panel: *"Quem mais comprou nos últimos 30 dias."* — Montserrat SemiBold, 34px, `#1A1A2E`

**Step 3 — Top N** `0:32–0:38`:
- Top N field activates. *10* types in.
- Counter badge: GSAP CountTo from `847` → `10` over 1.5s with `ease: "power2.out"`. On settle: badge pulses once (`scale: 1 → 1.15 → 1`, 300ms).

**Hold** `0:38–0:40`. Transition: `translateX(-100%)` slide left, globe slides in from right.

---

### Scene 4 — Location Targeting `0:40 → 1:08`

The cinematic centerpiece. Deep navy background throughout. All sub-scenes are SVG-based — no external map libraries or 3D engines needed.

**Hyperframes implementation**: Inline SVG for globe and Brazil map. CSS `transform: scale()` for zoom. GSAP for path animations and transitions between sub-scenes.

---

#### 4a — The Globe `0:40 → 0:44`

**Background**: `#0F1C33` (full bleed, the only dark scene)

**Visual**: An SVG globe — a circle filled with `#1A3A6B` (dark blue, ocean), overlaid with SVG continent silhouettes filled with `#FFFFFF`. A grid of latitude/longitude lines in `rgba(255,255,255,0.08)`.

**Animation**:
- Globe rotates via CSS `animation: spin 12s linear infinite` on the continent group (SVG `transform-origin: center`)
- Slight axial tilt: `rotate(-15deg)` on the globe wrapper
- Globe centered in safe zone, diameter ~600px

**No copy in this sub-scene.** Music swell begins.

---

#### 4b — Brazil / Minas Gerais `0:44 → 0:50`

**Animation**:
1. Globe rotation eases to a stop (`animation-play-state: paused` via GSAP). Duration: 1.5s, `ease: "power3.out"`.
2. All continent SVG paths transition to `opacity: 0.15` except South America.
3. South America path: `opacity: 1`, `fill: #FFFFFF`.
4. Brazil path separately highlighted: `fill: #FFFFFF` → then Minas Gerais path (separate SVG polygon) transitions `fill: #24549C` with a single glow pulse (`filter: drop-shadow(0 0 8px #24549C)`, one cycle, 600ms).
5. UI overlay chip slides in from the left: white pill `border-radius: 999px`, *"MG ✓"* in Montserrat SemiBold `#24549C`. `translateX(-120%) → translateX(0)`, `ease: "power2.out"`.

**Copy** (bottom of safe zone): *"Selecione por estado."* — Montserrat Bold, 42px, `#FFFFFF`. Fades in at `0:46`.

---

#### 4c — Ituiutaba `0:50 → 0:56`

**Transition from 4b**: Globe SVG morphs to flat 2D Brazil map — achieved by animating `border-radius` from 50% to 0% on the container and swapping the globe SVG for a flat Brazil states SVG using GSAP crossfade.

**Animation**:
1. CSS `transform: scale()` zooms into the Minas Gerais region of the SVG. Start: `scale(1)`, end: `scale(4)`, centered on MG. Duration: 1.2s, `ease: "power2.inOut"`.
2. A red `#E7000B` SVG map pin element drops onto Ituiutaba's coordinates from `translateY(-40px)` with a bounce ease (`elastic.out(1, 0.5)`).
3. A white tooltip `div` appears beside the pin: *"Ituiutaba, MG"* — Montserrat SemiBold, white background, blue text, `border-radius: 8px`, soft shadow.

**Copy** (bottom): *"Sua cidade."* — Montserrat Bold, 42px, `#FFFFFF`. Fades in at `0:52`.

---

#### 4d — Centro, Ituiutaba `0:56 → 1:04`

**Animation**:
1. Further CSS `scale()` zoom: `scale(4) → scale(10)`, centered on Ituiutaba. Duration: 1.2s, `ease: "power2.inOut"`.
2. At this zoom level, a simplified street grid SVG is revealed — thin gray lines `rgba(255,255,255,0.15)` on the dark background, representing Ituiutaba's centro grid.
3. The Centro neighbourhood polygon (SVG `<path>`) fills with `#FFB900` using a SVG `stroke-dashoffset` draw-on animation, then fills: `fill: #FFB900`, `opacity: 0 → 0.85`.
4. Inside the polygon: *"Centro"* — Montserrat Bold, white, centered using SVG `<text>` or absolute-positioned `div`.
5. Audience counter pill appears bottom-right: white pill, *"312 clientes"* in `#E7000B` Montserrat Bold. GSAP CountTo from `500` → `312`, `ease: "power2.out"`, settles with one red pulse.

**Copy** (bottom): *"Até o bairro."* — Montserrat Bold, 42px, `#FFFFFF`. Fades in at `0:58`.

**Hold** `1:04–1:08`. Transition: CSS `opacity` dissolve back to `#F7F8FA`.

---

### Scene 5 — The Combination `1:08 → 1:20`

**Background**: `#F7F8FA`

**Hyperframes implementation**: Two HTML/CSS filter cards with GSAP entrance. AND badge as a styled `div`.

**Animation sequence**:
1. `1:08–1:12` — Two filter cards animate in simultaneously from opposite sides:
   - Top Buyers card: `translateX(-80px) → translateX(0)`, `opacity: 0 → 1`
   - Location card: `translateX(80px) → translateX(0)`, `opacity: 0 → 1`
   Both: `ease: "power2.out"`, 500ms.
2. `1:12` — AND badge appears between the two cards: white pill, *"E"* (AND) in Montserrat Bold `#24549C`, `border: 1.5px solid #24549C`. Scale from `0 → 1`, `ease: "back.out(1.7)"`.

**Top Buyers card content**:
- Yellow `#FFB900` left border (4px)
- *"Gelato 180ml"* — Montserrat SemiBold, `#1A1A2E`
- *"30 dias · Top 10"* — Montserrat Medium, `#64748B`

**Location card content**:
- Blue `#24549C` left border (4px)
- *"Minas Gerais"* — Montserrat SemiBold, `#1A1A2E`
- *"Ituiutaba · Centro"* — Montserrat Medium, `#64748B`

**Audience counter** (below the cards): GSAP CountTo, settles on *"7 clientes"* in `#E7000B` Montserrat Bold. Badge pulses once on settle.

**Copy** (below counter, lines stagger 0.4s apart):
> *"A campanha certa."*
> *"Para a pessoa certa."*
> *"No lugar certo."*

Montserrat Bold, 48px, `#24549C`. Each line: `opacity: 0 → 1` + `translateY(8px) → 0`, staggered.

**Hold** `1:17–1:20`. Transition: `opacity` fade to `#FFFFFF`.

---

### Scene 6 — End Card `1:20 → 1:28`

**Background**: `#FFFFFF`

**Hyperframes implementation**: Simple CSS fade animations.

**Animation sequence**:
1. `1:20–1:22` — RecompraCRM logo fades in centered. `opacity: 0 → 1` + `scale(0.95) → scale(1)`. `ease: "ease-out"`, 400ms.
2. `1:22–1:24` — CTA text fades in below the logo:

   > **"Disponível agora no RecompraCRM."**

   Montserrat SemiBold, 30px, `#24549C`.

3. `1:24–1:25` — Yellow `#FFB900` decorative line (3px height, 180px wide) draws under the CTA using `clip-path` animation.
4. `1:25–1:28` — Full hold in silence.

**Music**: Fades to silence by `1:26`.

---

## 5. Hyperframes Technical Notes

### Globe & Map Strategy

The entire location sequence uses **inline SVG** — no external map libraries, no Three.js required:

- **Globe (4a)**: SVG circle (ocean fill) + continent silhouette paths (white fill) + grid lines. Rotation via CSS animation on the SVG group.
- **Brazil map (4b)**: A single SVG file of Brazil's states as individual `<path>` elements with `id` attributes matching state codes (e.g., `id="MG"`). Highlighting is a simple `fill` transition on the target path.
- **Zoom (4c, 4d)**: CSS `transform: scale()` on the SVG container, `transform-origin` set to the target city's approximate position within the SVG viewBox.
- **Neighbourhood (4d)**: A hand-drawn SVG polygon approximating the Centro boundary, positioned on top of the zoomed map.

This approach is fully deterministic, renders in headless Chrome without GPU dependencies, and keeps file size minimal.

### Animation Libraries

| Scene | Library | Notes |
|---|---|---|
| All text fades | CSS transitions | No JS needed |
| Card spring entrances | GSAP (`Back.easeOut`) | Load GSAP 3 via CDN |
| Counter tick-down | GSAP CountTo plugin | |
| Globe rotation | CSS `@keyframes` | |
| Globe stop easing | GSAP `animation-play-state` control | |
| SVG path fill transitions | GSAP `.to()` on SVG attributes | |
| Map zoom | GSAP `.to()` on `transform` | |
| Pin drop bounce | GSAP `elastic.out` ease | |

### Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap" rel="stylesheet">
```

### Safe Zone Enforcement

All critical content wrapped in a centered `div` with:
```css
.safe-zone {
  width: 1080px;
  max-height: 1350px;
  margin: 0 auto;
  position: relative;
}
```

The outer container is 1080 × 1920px. The safe zone div is vertically centered within it. The Feed version crops to the safe zone dimensions.

---

## 6. Format Adaptation Notes

**For the 4:5 Feed version (1080 × 1350 px)**:
- Crop the 9:16 master to the central safe zone at export
- The navy globe scenes lose the top/bottom decorative margins — acceptable, all map content is centered
- Verify Scene 1 logo and copy clear the top and bottom edges with at least 40px margin
- If any scene feels cramped after crop, globe sub-scenes (4a–4d) can each be trimmed by 0.5s without affecting narrative impact

---

## 7. Deliverables Checklist

- [ ] 9:16 Reels master (1080 × 1920, MP4, H.264, 30fps, ~90s)
- [ ] 4:5 Feed version (1080 × 1350, MP4, H.264, 30fps, ~90s)
- [ ] Static thumbnail frame — Scene 1, exported as PNG, both ratios
- [ ] Hyperframes source HTML files (one per version)
- [ ] SVG assets: globe continents, Brazil states map, Centro neighbourhood polygon, pin icon
- [ ] Music license documentation
