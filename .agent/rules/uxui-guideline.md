---
trigger: always_on
---

# Design System & UX Architecture

Role: World-Class Product Designer & UX Architect. Enforce strict, premium
design language.

## 1. Design DNA: "Bombay Sapphire" & "Digital Ink"

**Philosophy**: Pristine, high-contrast digital paper.

- **Ink (Slate-900)**: Primary text, high-impact actions (buttons, headers).
- **Gem (Violet-600 → Fuchsia-600)**: Brand soul. Magic moments, AI actions,
  gradients for premium CTA.
- **Glass (White/Slate-50)**: Canvas. Layered with borders, shadows for depth.

> **Design Tokens**: See `src/designTokens.ts` for canonical values.

---

## 2. Visual Dictionary

### A. Palette

| Token       | Values                                                         |
| ----------- | -------------------------------------------------------------- |
| **Canvas**  | `bg-slate-50` (App), `bg-white` (Cards/Panels)                 |
| **Ink**     | `text-slate-900` (Headings), `text-slate-500` (Secondary)      |
| **Accents** | `violet-600` (AI), `emerald-500` (Success), `rose-500` (Error) |
| **Borders** | `border-slate-100` (Subtle), `border-slate-200` (Active)       |

### B. Typography

- **Font**: 'Manrope' (Modern Geometric Sans)
- **Meta/Labels**: `text-[10px] font-bold uppercase tracking-widest`
- **Headings**: `font-black tracking-tight`
- **Body**: `font-medium text-slate-600 leading-relaxed`

### C. Radii (Unified)

| Element        | Class                |
| -------------- | -------------------- |
| Modals         | `rounded-3xl` (24px) |
| Cards          | `rounded-2xl` (16px) |
| Buttons/Inputs | `rounded-xl` (12px)  |
| Pills/Badges   | `rounded-full`       |

### D. Shadows

- **Cards**: `shadow-sm` → `hover:shadow-md`
- **Modals**: `shadow-xl`
- **Magic Glow**: `shadow-lg shadow-violet-200`

---

## 3. Component Rules

### Buttons

| Type     | Classes                                                                       |
| -------- | ----------------------------------------------------------------------------- |
| Primary  | `bg-slate-900 text-white hover:bg-slate-800 active:scale-95`                  |
| AI/Magic | `bg-violet-600 text-white shadow-lg shadow-violet-200 active:scale-95`        |
| Publish  | `bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-300` |
| Ghost    | `bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-900`       |

### Cards

- `bg-white border border-slate-200 rounded-2xl`
- Hover: `hover:border-violet-300 hover:-translate-y-0.5 hover:shadow-md`
- Active: `active:scale-98`

### Inputs

- Default: `bg-slate-50 border-transparent`
- Focus:
  `focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10`

---

## 4. Micro-Interactions (Physics)

**All interactive elements must have:**

```css
transition-all duration-200
active:scale-95          /* Buttons */
active:scale-98          /* Cards */
hover:-translate-y-0.5   /* Lift on hover */
```

### Staggered Animations (Lists)

```tsx
{
  items.map((item, index) => (
    <div
      className="animate-in fade-in slide-in-from-left-2"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
    />
  ));
}
```

---

## 5. Loading States

### Skeleton Loaders

```tsx
<div className="animate-pulse bg-slate-100 rounded-xl h-12" />;
```

### Spinners (when content size is unknown)

```tsx
<div className="w-12 h-12 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin" />;
```

---

## 6. Empty States (Premium)

Must include:

1. **Gradient icon** with glow
   (`bg-gradient-to-br from-violet-500 to-fuchsia-500`)
2. **Animated pulse ring** behind icon
3. **Clear headline** + descriptive subtext
4. **Secondary CTA** if applicable

```tsx
<div className="relative">
  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full blur-2xl opacity-20 animate-pulse scale-150" />
  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-xl">
    <Sparkles className="text-white" size={36} />
  </div>
</div>;
```

---

## 7. Layout (Bento Grid)

- Modular, grid-based cells
- Each cell: clear header/icon, `gap-4` or `gap-6`
- Responsive: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
