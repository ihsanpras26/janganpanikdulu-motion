# DESIGN.md — @janganpanikdulu Visual & Motion System

## 1. Brand DNA & Aesthetic Direction
- **Domain**: Everyday Survival, Science Explainer, & Practical Safety Short-Form Video (`9:16`, `1080x1920`).
- **Persona & Mascot**: **Mas Raka** — reliable, calm Indonesian older-brother figure (*"mas-mas simpel tapi bisa diandalkan"*).
- **Visual Signature**:
  - **3D World**: Bright, warm, tactile stylized 3D diorama with crisp cel-outline (`#181E26`), soft global illumination, and multi-angle cinematography (Eye-Level Medium, Over-The-Shoulder Macro, 3/4 High-Angle Cutaway, Low-Angle Hero).
  - **2D UI Overlay**: **100% Solid Brand Colors** (`#EF5F18` Signal Orange, `#261A66` Deep Royal Indigo, `#FFFFFF` Crisp White) structured with Bento Info Cards, tonal vector watermarks, 3D leader-line callouts, and vector-selected subtitle highlights.
  - **Contrast Mechanism**: Progressive gradient blur scrims (`.scrim-top` and `.scrim-bottom`) sit between the 3D canvas and the solid UI overlays so text remains effortless to read over bright 3D scenes.

## 2. Color Tokens (100% Solid UI Surfaces)
Gradients are **strictly forbidden** on UI components, badges, cards, pills, and typography. Gradients are permitted **only** on background atmospheric contrast scrims.

| Token | Hex | Role | WCAG Contrast |
| :--- | :--- | :--- | :--- |
| `--brand-white` | `#FFFFFF` | Primary light card surface, headline fill, pill text | `14.8:1` vs `#261A66` |
| `--brand-orange` | `#EF5F18` | Signal accent, logo squircle, metric pill, keyword highlight | `4.6:1` vs `#261A66`, `3.4:1` large UI text vs `#FFFFFF` |
| `--brand-indigo` | `#261A66` | Primary authority surface, Bento card, subtitle bar, headline stroke | `14.8:1` vs `#FFFFFF` |
| `--brand-cobalt` | `#1D265E` | Secondary deep blue anchor for Combo 3 | `13.9:1` vs `#FFFFFF` |
| `--semantic-safe` | `#0FA968` | Safe action leader-line callout & indicator | `4.5:1` vs `#FFFFFF` |
| `--semantic-danger` | `#E11D48` | Hazard / high-temperature leader-line indicator | `4.7:1` vs `#FFFFFF` |

### 3 Solid Brand Combinations (Selectable via `?palette=0|1|2`)
1. **Combo 1 (`palette=0` — Indigo Bento × Orange Signal)**:
   - Bento Card: Solid `#261A66` Deep Indigo | Metric Pill: Solid `#EF5F18` Orange | Hook Pill: Solid `#EF5F18` Orange with `#261A66` 3D shadow.
2. **Combo 2 (`palette=1` — White Bento × Indigo-Orange Duo)**:
   - Bento Card: Solid `#FFFFFF` Crisp White with `#261A66` typography | Metric Pill: Solid `#EF5F18` Orange | Hook Pill: Solid `#261A66` Deep Indigo with `#EF5F18` 3D shadow.
3. **Combo 3 (`palette=2` — Orange Bento × Royal Cobalt)**:
   - Bento Card: Solid `#EF5F18` Signal Orange with `#FFFFFF` typography | Metric Pill: Solid `#1D265E` Royal Cobalt | Hook Pill: Solid `#EF5F18` Orange with `#1D265E` 3D shadow.

## 3. Typography & Scannable Hierarchy
- **Primary Font**: `Plus Jakarta Sans` (`600` SemiBold, `700` Bold, `800` ExtraBold).
- **Numeric / Technical Accent**: `Space Grotesk` (`700` Bold) with `font-variant-numeric: tabular-nums`.
- **Hierarchy Scale (1080x1920 Canvas)**:
  - **Hook Headline (`.hook-title`)**: `100px`, weight `800`, tracking `-0.035em`, solid `#FFFFFF` fill with `15px` solid `#261A66` stroke.
  - **Hook Action Pill (`.hook-pill`)**: `48px`, weight `800`, rotated `-2deg`, solid fill with solid offset shadow.
  - **Bento Card Title (`.bento-title`)**: `38px`, weight `800`, tracking `-0.025em`, left-aligned.
  - **Bento Card Description (`.bento-desc`)**: `24px`, weight `600`, line-height `1.32`, max 2 lines (`max-width: 600px`), left-aligned.
  - **Bento Metric Pill (`.bento-pill`)**: `22px`, weight `800`, solid pill at bottom-left of card.
  - **3D Leader Callout (`.callout`)**: `32px`, weight `800`, solid `#FFFFFF` card with `4px` solid semantic border.
  - **Bottom Subtitle (`.sub-card`)**: `44px`, weight `800`, solid `#261A66` bar with solid `#EF5F18` vector-selected keyword pill.

## 4. Layout, Spatial Architecture & Radius Scale
- **Deliberate Border-Radius Scale (`antislop-ui` R-11)**:
  - Outer Bento Info Card: `32px`
  - Brand Squircle Logo (`jpd`) & Subtitle Bar: `24px`
  - Hook Action Pill & 3D Callout Badge: `16px`
  - Step Number Badge & Selected Keyword Highlight: `12px`
  - Metric Tag Pill & Top Step Progress Pill: `999px` (capsule)
- **9:16 Safe Zones**:
  - **Top Bar (`y: 52px - 140px`)**: Left Brand Lockup + Right Step Progress Pill.
  - **Top Bento Zone (`y: 168px - 428px`)**: Hook Lockup (Beat 1) or Wide Bento Info Card (Beats 2-4).
  - **Center 3D Viewport (`y: 430px - 1640px`)**: Unobstructed 1,210px vertical stage for Mas Raka, 3D environment, and 3D leader-line callouts.
  - **Bottom Caption Zone (`y: 1660px - 1830px`)**: Solid Subtitle Bar over progressive blur contrast scrim.

## 5. Liveliness Dials (`antislop-ui`)
- `ENERGY = 3` (Assertive, high-clarity survival visual language)
- `RHYTHM = 2` (Focused single wide Bento card paired with 3D scene)
- `MOTION = 3` (Choreographed 4-angle 3D camera cuts + spring-eased UI card transitions)
