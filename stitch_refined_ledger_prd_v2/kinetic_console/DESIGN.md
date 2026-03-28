```markdown
# Design System Document

## 1. Overview & Creative North Star
**Creative North Star: The Kinetic Console**
This design system moves away from the flat, generic "SaaS" aesthetic toward a high-performance, immersive "Kinetic Console." It is inspired by the crystalline depth of the brand mark—merging the precision of a technical hacker utility with the premium finish of a high-end gaming interface. 

The experience is defined by **Luminous Utility**: every element should feel like a piece of a backlit, high-tech instrument cluster. We break the "standard template" look through intentional asymmetry, high-contrast typography scales, and a layering logic that mimics physical depth rather than flat digital rectangles.

---

## 2. Colors
Our palette is rooted in a high-contrast nocturnal environment, using vibrant light-source colors to guide the user's eye.

*   **Background (`#0B0E17`):** The canvas is a Deep Indigo-Black. It is never pure black, allowing for subtle tonal shifts in nested containers.
*   **Primary Accent (`#00E5FF`):** A Cyan light source. Use this for primary actions and "leading edge" highlights.
*   **Secondary Accent (`#FF007F`):** An Electric Magenta. Use this for "trailing edge" details, status indicators, or to add kinetic energy to gradients.
*   **Tertiary/Surface Tint (`#81ECFF` / `#AC89FF`):** Softened versions of our accents used for state changes and subtle glows.

### Color Principles
*   **The "No-Line" Rule:** Prohibit the use of 1px solid borders for general sectioning. Boundaries must be defined by background color shifts—e.g., a `surface-container-low` section sitting on a `surface` background. 
*   **Surface Hierarchy & Nesting:** Treat the UI as layers of frosted obsidian. Use `surface-container-lowest` to `surface-container-highest` to stack elements. An inner card should feel like it is either recessed into or floating slightly above its parent, purely through tonal transitions.
*   **The Glass & Gradient Rule:** To echo the crystalline 'M' mark, use Glassmorphism for floating panels (semi-transparent surface colors with a `backdrop-blur`). High-priority CTAs should utilize a gradient from `primary` to `primary-container` to provide "soul" and depth.

---

## 3. Typography
The typography system balances technical precision with high-fashion editorial scale.

*   **Display & Headlines (Space Grotesk):** This font provides the "Technical/Modern" backbone. Use a wide scale (Display-LG at 3.5rem) to create dramatic, asymmetrical headers that command attention.
*   **Body & Labels (Inter/Outfit):** These provide the "Utility" layer. Inter is used for high-density data readouts and labels, ensuring legibility at small sizes.
*   **The Hierarchy Intent:** Contrast large, geometric headlines with small, monospace-adjacent labels to create a "Dashboard" aesthetic. Always use `label-md` or `label-sm` for metadata to maintain the hacker-utility feel.

---

## 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering** and light physics, not drop-shadows.

*   **The Layering Principle:** Stacking is the primary method of separation. A `surface-container-lowest` card placed on a `surface-container-low` background creates a natural recessed effect.
*   **Ambient Shadows:** For floating elements, use extra-diffused shadows. The shadow color must be a tinted version of the surface color (Deep Indigo), never grey. Opacity should stay between 4%–8% with a 32px-64px blur.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, it must be a "Ghost Border"—using the `outline-variant` token at 10% opacity. This mimics a subtle light-catch on the edge of a crystal.
*   **Kinetic Glow:** Elements of high importance (like the active task or primary CTA) may emit a subtle 1px glow using the `primary` color at 20% opacity to mimic the leading edge of the crystalline logo.

---

## 5. Components

### Buttons
*   **Primary:** Pill-shaped, using a `primary` to `primary-dim` gradient. 
*   **Secondary:** Pill-shaped, `ghost-border` with Cyan text.
*   **Tertiary:** Monospace text (Inter) with a `primary` underscore or icon.

### Cards
*   **Radius:** Strict 8px (`lg` scale).
*   **Structure:** No dividers. Use `surface-container` shifts and vertical white space (Scale 8 or 10) to separate internal content.
*   **Depth:** Use `surface-container-high` for interactive cards.

### Input Fields
*   **Style:** Sharp edges (8px) with a `surface-container-lowest` fill. 
*   **Focus State:** Instead of a thick border, use a 1px `primary` (Cyan) glow on the bottom edge and a subtle text color shift.

### Tactical Data Readouts (New Component)
*   **Description:** Small, Inter-font metadata blocks used for "Status," "Time," or "Progress." 
*   **Style:** Should look like console output. Use `label-sm` with `on-surface-variant` colors.

### The "Crystal" Progress Bar
*   **Style:** A slim, 4px bar using a `primary` to `secondary` gradient, sitting inside a `surface-container-highest` track.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical layouts where one side of the screen is denser than the other to create a "Cockpit" feel.
*   **Do** use the Spacing Scale (especially 8 and 10) to create breathing room between data-heavy sections.
*   **Do** apply `backdrop-blur` to any overlay or modal to maintain the "Kinetic Console" depth.

### Don't:
*   **Don't** use standard 1px solid grey borders. They break the immersive, light-driven aesthetic.
*   **Don't** use rounded corners larger than 8px for cards; keep the "Tactile/Sharp" technical edge.
*   **Don't** use generic drop shadows. If an element doesn't feel "separated" enough, adjust the surface color tier before reaching for a shadow.
*   **Don't** use pure white (`#FFFFFF`) for body text. Use `on-surface` (`#E6E7F5`) to prevent eye strain against the deep indigo background.

---
*Design System v1.0 | Kinetic Console Methodology*```