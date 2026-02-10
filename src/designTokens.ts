/**
 * TeleGenie Design Tokens
 * 
 * Single source of truth for design system values.
 * Based on "Bombay Sapphire" & "Digital Ink" philosophy.
 */

// =============================================================================
// RADII - "Super-Rounded" aesthetic
// =============================================================================
export const radii = {
  sm: 'rounded-lg',      // 8px - Small elements, tags
  md: 'rounded-xl',      // 12px - Buttons, inputs, cards
  lg: 'rounded-2xl',     // 16px - Larger cards, panels
  xl: 'rounded-3xl',     // 24px - Modals, hero sections
  full: 'rounded-full',  // Pills, avatars
} as const;

// =============================================================================
// SHADOWS - Flat with subtle depth
// =============================================================================
export const shadows = {
  none: 'shadow-none',
  sm: 'shadow-sm',                           // Subtle lift
  md: 'shadow-md',                           // Default cards
  lg: 'shadow-lg',                           // Elevated elements
  xl: 'shadow-xl',                           // Modals, dropdowns
  glow: 'shadow-lg shadow-violet-200',       // AI/Magic actions
  inner: 'shadow-inner',                     // Pressed states
} as const;

// =============================================================================
// TYPOGRAPHY - Consolidated scale (5 sizes)
// =============================================================================
export const typography = {
  // Meta/Labels - 10px
  meta: 'text-[10px] font-bold uppercase tracking-widest',
  
  // Small - 12px (xs)
  xs: 'text-xs',
  xsBold: 'text-xs font-bold',
  
  // Body - 14px (sm)
  body: 'text-sm',
  bodyBold: 'text-sm font-bold',
  
  // Large Body - 16px (base)
  lg: 'text-base',
  lgBold: 'text-base font-bold',
  
  // Section Headers - 20px (xl)
  heading: 'text-xl font-bold',
  
  // Page Titles - 30px (3xl)
  title: 'text-3xl font-display font-black tracking-tight',
} as const;

// =============================================================================
// COLORS - Palette from UX Guidelines
// =============================================================================
export const colors = {
  // Canvas
  canvas: 'bg-slate-50',
  surface: 'bg-white',
  
  // Ink (Primary)
  ink: 'text-slate-900',
  inkMuted: 'text-slate-500',
  inkSubtle: 'text-slate-400',
  
  // Accents
  violet: 'text-violet-600',
  violetBg: 'bg-violet-600',
  emerald: 'text-emerald-500',
  rose: 'text-rose-500',
  
  // Borders
  border: 'border-slate-200',
  borderSubtle: 'border-slate-100',
  borderActive: 'border-violet-300',
} as const;

// =============================================================================
// SPACING - Consistent scale
// =============================================================================
export const spacing = {
  xs: 'p-2',       // 8px
  sm: 'p-3',       // 12px
  md: 'p-4',       // 16px
  lg: 'p-6',       // 24px
  xl: 'p-8',       // 32px
} as const;

// =============================================================================
// TRANSITIONS - Physics-based micro-interactions
// =============================================================================
export const transitions = {
  fast: 'transition-all duration-150',
  default: 'transition-all duration-200',
  slow: 'transition-all duration-300',
  
  // Micro-interactions
  hover: 'hover:-translate-y-0.5 hover:shadow-lg',
  active: 'active:scale-95',
  press: 'active:scale-98',
} as const;

// =============================================================================
// COMPONENT PRESETS - Common patterns
// =============================================================================
export const components = {
  // Buttons
  buttonPrimary: `${radii.md} ${shadows.sm} ${transitions.default} ${transitions.active} bg-slate-900 text-white hover:bg-slate-800`,
  buttonSecondary: `${radii.md} ${shadows.none} ${transitions.default} ${transitions.active} bg-slate-100 text-slate-600 hover:bg-slate-200`,
  buttonMagic: `${radii.md} ${shadows.glow} ${transitions.default} ${transitions.active} bg-violet-600 text-white hover:bg-violet-700`,
  buttonGhost: `${radii.md} ${transitions.default} bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900`,
  
  // Cards
  card: `${radii.lg} ${colors.surface} ${colors.border} border ${transitions.default} ${transitions.hover}`,
  cardInteractive: `${radii.lg} ${colors.surface} ${colors.border} border ${transitions.default} hover:-translate-y-1 hover:shadow-xl cursor-pointer`,
  
  // Modals
  modal: `${radii.xl} ${colors.surface} ${shadows.xl}`,
  modalBackdrop: 'bg-slate-900/60 backdrop-blur-sm',
  
  // Inputs
  input: `${radii.md} bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-violet-300 focus:bg-white ${transitions.default}`,
  
  // Labels
  label: `${typography.meta} ${colors.inkSubtle}`,
} as const;

// Type exports for TypeScript autocomplete
export type Radii = keyof typeof radii;
export type Shadows = keyof typeof shadows;
export type Typography = keyof typeof typography;
export type Colors = keyof typeof colors;
