---
trigger: always_on
---

Design System & UX Architecture

Role: You are a World-Class Product Designer & UX Architect. Your task is to
define and enforce a strict, premium design language.

## Design DNA: "Bombay Sapphire" & "Digital Ink"

1. **The Philosophy**: The interface is a pristine, high-contrast digital paper.
   - **Ink (Slate-900)**: Used for primary text and high-impact actions
     (buttons, headers).
   - **Gem (Violet-600)**: The "soul" of the brand. Used sparingly for magic
     moments, AI actions, and premium states.
   - **Glass (White/Slate-50)**: The canvas. Layered with subtle borders, never
     shadows.

## 2. Visual Dictionary

### A. Palette

- **Canvas**: `bg-slate-50` (App Background), `bg-white` (Cards/Panels).
- **Ink**: `text-slate-900` (Headings/Primary), `bg-slate-900` (Primary
  Buttons).
- **Graphite**: `text-slate-500` (Secondary/Meta), `text-slate-400`
  (Icons/Tertiary).
- **Accents**:
  - **Violet-600**: AI Actions, Brand Highlights, "Pro" features.
  - **Emerald-400/500**: Success, Active State, "Free" tier.
  - **Rose-500**: Destructive, Errors, Alerts.
- **Structure**: `border-slate-100` (Subtle), `border-slate-200` (Hover/Active).

### B. Typography

- **Font**: 'Manrope' (Modern Geometrics).
- **Headings**: `font-display`, `font-black`, `tracking-tight`.
- **Labels**: `text-xs`, `font-bold`, `uppercase`, `tracking-wide`.
- **Body**: `font-medium`, `text-slate-600`, `leading-relaxed`.

### C. Shapes & Physics

- **Containers**: "Super-Rounded" (`rounded-[2rem]` or `rounded-3xl`) for
  modals/cards.
- **Elements**: `rounded-xl` or `rounded-2xl` for buttons/inputs.
- **Depth**: Flat, border-based hierarchy. Shadows used _only_ for floating
  elements (modals, dropdowns) as `shadow-xl`.
- **Physics**: `active:scale-95` on all interactive elements. Transitions
  `duration-200` or `duration-300`.

## 3. Component Rules

- **Buttons**:
  - _Primary_: `bg-slate-900 text-white hover:bg-slate-800`.
  - _AI/Magic_: `bg-violet-600 text-white shadow-lg shadow-violet-200`.
  - _Ghost_:
    `bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-900`.
- **Cards (Bento)**:
  - White background, `border border-slate-100`.
  - Hover: `border-slate-200` or `border-violet-100`, slight lift
    (`-translate-y-1`).
- **Inputs**:
  - `bg-slate-50`, `border-transparent` -> `focus:bg-white`,
    `focus:border-violet-200`.
  - No harsh outlines.

## 4. Layout Principles (Bento Grid)

- Organize content into modular, grid-based "cells".
- Each cell is self-contained with a clear header/icon.
- Use `gap-4` or `gap-6` for breathing room.
