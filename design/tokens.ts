/**
 * GenD Arena 2026 — Design Tokens
 *
 * Single source of truth for all design decisions.
 * These values are mirrored into globals.css via @theme for Tailwind v4.
 *
 * Usage in TS/TSX:
 *   import { tokens } from '@/design/tokens'
 *   const bg = tokens.color.surface.base  // '#050814'
 */

export const tokens = {
  /**
   * Surface colors — layered dark surfaces for depth hierarchy.
   * Use: base → page bg, raised → cards, overlay → modals/drawers,
   *       elevated → floating elements, border/borderStrong → dividers.
   */
  color: {
    surface: {
      base: '#050814',
      raised: '#0A1120',
      overlay: '#111B2E',
      elevated: '#182338',
      border: '#1E2A44',
      borderStrong: '#2A3B5C',
    },

    /**
     * Brand colors — navy deep + cyan neon.
     * navy/navyLight: primary brand fills, CTAs.
     * cyan/cyanBright: accent highlights, active states.
     * cyanDim: muted accent for secondary emphasis.
     * glow: ambient cyan glow for shadow effects.
     */
    brand: {
      navy: '#0F1F3D',
      navyLight: '#1B3160',
      cyan: '#00D4FF',
      cyanBright: '#33E0FF',
      cyanDim: '#0099CC',
      glow: 'rgba(0, 212, 255, 0.35)',
    },

    /**
     * Accent colors — use sparingly, max 2 accents per view.
     * violet: secondary CTAs, tags, decorative.
     * magenta: destructive-adjacent or special highlight.
     */
    accent: {
      violet: '#7C5CFF',
      magenta: '#FF3B8B',
    },

    /**
     * Semantic colors — status communication.
     * Always pair with an icon or label — never rely on color alone.
     */
    semantic: {
      success: '#22D07A',
      warning: '#FFB020',
      danger: '#FF4D6D',
      info: '#00D4FF',
    },

    /**
     * Text colors — maintain minimum 4.5:1 contrast for body text.
     * primary: headings & high-emphasis.
     * secondary: body, descriptions.
     * tertiary: placeholders, hints.
     * disabled: non-interactive text.
     * onBrand: text placed directly on cyan/brand backgrounds.
     */
    text: {
      primary: '#F0F4FA',
      secondary: '#A8B4C8',
      tertiary: '#6B7A94',
      disabled: '#3E4A62',
      onBrand: '#050814',
    },
  },

  /**
   * Typography — font families, scale, weights, line heights, tracking.
   * display: Inter — headings, UI labels, navigation.
   * body: Be Vietnam Pro — long-form body copy (Vietnamese-optimised).
   * mono: JetBrains Mono — code blocks, technical data.
   */
  typography: {
    fontFamily: {
      display: 'var(--font-inter), system-ui, sans-serif',
      body: 'var(--font-be-vietnam-pro), system-ui, sans-serif',
      mono: 'var(--font-jetbrains-mono), ui-monospace, monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
      '5xl': '48px',
      '6xl': '60px',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.1,
      snug: 1.3,
      normal: 1.5,
      relaxed: 1.7,
    },
    tracking: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.02em',
    },
  },

  /**
   * Spacing — 4px base unit. Multiples: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.
   */
  spacing: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
  },

  /**
   * Border radius — consistent rounding scale.
   */
  radius: {
    none: '0',
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    full: '9999px',
  },

  /**
   * Motion — duration and easing.
   * instant: state toggles, no visual delay.
   * fast: micro-interactions (hover, focus rings).
   * base: component transitions (dropdowns, tooltips).
   * slow: modal enter/exit, page section reveals.
   * slower: page-level transitions.
   */
  motion: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      base: '250ms',
      slow: '400ms',
      slower: '600ms',
    },
    easing: {
      /** General-purpose — enters and exits. */
      standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      /** Complex, large-surface motion. */
      emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
      /** Elements entering the screen. */
      decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    },
  },

  /**
   * Elevation — box shadows for depth levels.
   * 1: subtle lift (cards at rest).
   * 2: active cards, dropdown containers.
   * 3: modals, drawers.
   * glow: cyan ambient glow for focal elements.
   */
  elevation: {
    1: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
    2: '0 4px 8px -2px rgba(0, 0, 0, 0.5)',
    3: '0 12px 24px -4px rgba(0, 0, 0, 0.6)',
    glow: '0 0 24px rgba(0, 212, 255, 0.35)',
  },

  /**
   * Z-index scale — layering order.
   */
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    toast: 50,
    tooltip: 60,
  },
} as const

export type Tokens = typeof tokens
