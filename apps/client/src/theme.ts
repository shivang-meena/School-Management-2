import type { ViewStyle } from 'react-native';

// ─── Dark Canvas ──────────────────────────────────────────────────────────────
export const colors = {
  // Core canvas
  canvas:      '#080c14',
  navy:        '#080c14',
  surface:     'rgba(255, 255, 255, 0.06)',
  surfaceHigh: 'rgba(255, 255, 255, 0.10)',
  surfaceMid:  'rgba(255, 255, 255, 0.08)',

  // Legacy aliases (keep so old imports don't break)
  background:  '#080c14',
  ink:         '#f0f6ff',
  muted:       'rgba(255,255,255,0.45)',
  border:      'rgba(255,255,255,0.10)',
  borderLight: 'rgba(255,255,255,0.06)',

  // Accent — light pastel soft indigo-violet pair
  primary:     '#939bff',
  blue:        '#939bff',
  blueDark:    '#7c86ff',
  blueLight:   '#b4bcff',
  paleBlue:    'rgba(147,155,255,0.18)',

  // Gradient stops
  gradStart:   '#939bff',
  gradEnd:     '#b094f9',

  // Semantics — neon variants for dark bg
  success:      '#34d399',
  successLight: 'rgba(52,211,153,0.12)',
  warning:      '#fbbf24',
  warningLight: 'rgba(251,191,36,0.12)',
  danger:       '#f87171',
  dangerLight:  'rgba(248,113,113,0.12)',
  info:         '#38bdf8',
  infoLight:    'rgba(56,189,248,0.12)',
  purple:       '#a78bfa',
  purpleLight:  'rgba(167,139,250,0.15)',

  // Glass border glow
  glowBorder:  'rgba(147,155,255,0.35)',
  glowBorderSm:'rgba(147,155,255,0.20)',
};

// ─── Border Radius ─────────────────────────────────────────────────────────────
export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  full: 9999,
};

// ─── Shadow / Glow Presets ─────────────────────────────────────────────────────
export const shadow = {
  sm: {
    shadowColor: '#939bff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#939bff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 16,
    elevation: 5,
  },
  lg: {
    shadowColor: '#939bff',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 10,
  },
  xl: {
    shadowColor: '#939bff',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 16,
  },
  // neutral dark shadow (no tint)
  dark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.50,
    shadowRadius: 24,
    elevation: 10,
  },
};

// ─── Glassmorphism Card Surfaces ───────────────────────────────────────────────
export const surfaces: Record<'card' | 'input' | 'content' | 'glass' | 'glassHigh', ViewStyle> = {
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.xl,
    ...shadow.md,
  },
  glass: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.xl,
  },
  glassHigh: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.xl,
  },
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  content: {
    padding: 24,
    paddingBottom: 56,
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
  },
};

// ─── Typography Scale ──────────────────────────────────────────────────────────
export const typography = {
  hero:    { fontSize: 44, fontWeight: '900' as const, lineHeight: 52, letterSpacing: -1.2, color: '#f0f6ff' },
  h1:      { fontSize: 30, fontWeight: '900' as const, lineHeight: 38, letterSpacing: -0.6, color: '#f0f6ff' },
  h2:      { fontSize: 22, fontWeight: '800' as const, lineHeight: 30, letterSpacing: -0.3, color: '#f0f6ff' },
  h3:      { fontSize: 18, fontWeight: '700' as const, lineHeight: 26, color: '#e2e8f0' },
  body:    { fontSize: 14, fontWeight: '500' as const, lineHeight: 22, color: 'rgba(255,255,255,0.75)' },
  caption: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8, color: 'rgba(255,255,255,0.45)' },
  eyebrow: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 1.6, color: '#818cf8' },
  label:   { fontSize: 12, fontWeight: '700' as const, color: 'rgba(255,255,255,0.55)' },
};
