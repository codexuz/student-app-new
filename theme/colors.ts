// Brand blue — matches the notification tint, adaptive icon background, and
// splash screen already configured in app.json, so the in-app primary color
// doesn't drift from what the OS shows before the app has even loaded.
const BRAND_BLUE = '#1055F8';

const lightColors = {
  // Base colors — a near-black navy rather than pure #000 reads calmer and
  // more "designed" for long reading/study sessions than stark black-on-white.
  // A faint blue tint on the page (rather than flat white) is what lets white
  // cards read as elevated surfaces instead of disappearing into the background.
  background: '#F5F8FF',
  foreground: '#0B1220',

  // Card colors — pure white, so cards pop off the tinted background using
  // just their shadow, no border needed.
  card: '#FFFFFF',
  cardForeground: '#0B1220',

  // Popover colors — same surface as a card.
  popover: '#FFFFFF',
  popoverForeground: '#0B1220',

  // Primary colors
  primary: BRAND_BLUE,
  primaryForeground: '#FFFFFF',

  // Secondary colors — a light blue wash, distinct from the plain-white
  // `card` surface, for things that should read as "on brand" but subordinate
  // to a primary action (secondary buttons, badges).
  secondary: '#EAF0FE',
  secondaryForeground: '#1E293B',

  // Muted colors
  muted: '#64748B33',
  mutedForeground: '#64748B',

  // Accent colors — a stronger wash of the brand blue than `secondary`, for
  // selected/hover states that need to read as more active.
  accent: '#DCE7FE',
  accentForeground: BRAND_BLUE,

  // Destructive colors
  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF',

  // Border and input — tinted to match the page background rather than a
  // flat neutral gray, so borders on white cards blend in instead of fighting it.
  border: '#DEE6F5',
  input: '#DEE6F5',
  ring: '#94A3B8',

  // Text colors
  text: '#0B1220',
  textMuted: '#64748B',

  // Legacy support for existing components
  tint: BRAND_BLUE,
  icon: '#64748B',
  tabIconDefault: '#64748B',
  tabIconSelected: BRAND_BLUE,

  // Default buttons, links, Send button, selected tabs
  blue: BRAND_BLUE,

  // Success states, correct answers, completed lessons
  green: '#16A34A',

  // Delete buttons, error states, critical alerts, overdue payments
  red: '#DC2626',

  // Warning states, streak/reward highlights
  orange: '#f48405',

  // Coins, badges, achievement highlights
  yellow: '#CA8A04',

  // Decorative accent for badges and rewards
  pink: '#DB2777',

  // Decorative accent for creative features
  purple: '#7C3AED',

  // Decorative accent for communication features
  teal: '#0D9488',

  // Decorative accent for system/info features
  indigo: '#4F46E5',

  // Semantic states — reuse the same hues as their raw counterparts above so
  // "success" and "green" (etc.) never silently drift apart.
  success: '#16A34A',
  successForeground: '#FFFFFF',
  warning: '#D97706',
  warningForeground: '#FFFFFF',
  info: '#2563EB',
  infoForeground: '#FFFFFF',
  error: '#DC2626',
  errorForeground: '#FFFFFF',
};

const darkColors = {
  // Base colors — dark navy rather than true black; easier on the eyes and
  // still lets the brand blue read clearly against it.
  background: '#0A0F1A',
  foreground: '#F1F5F9',

  // Card colors
  card: '#131B2C',
  cardForeground: '#F1F5F9',

  // Popover colors
  popover: '#131B2C',
  popoverForeground: '#F1F5F9',

  // Primary colors — a brighter tint of the brand blue; the light mode's
  // saturated `#1055F8` loses contrast against a dark background.
  primary: '#5B8DFF',
  primaryForeground: '#FFFFFF',

  // Secondary colors
  secondary: '#1B2436',
  secondaryForeground: '#F1F5F9',

  // Muted colors
  muted: '#64748B33',
  mutedForeground: '#94A3B8',

  // Accent colors
  accent: '#1B2C4D',
  accentForeground: '#5B8DFF',

  // Destructive colors
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',

  // Border and input — using alpha values for better blending
  border: '#24304A',
  input: 'rgba(255, 255, 255, 0.08)',
  ring: '#475569',

  // Text colors
  text: '#F1F5F9',
  textMuted: '#94A3B8',

  // Legacy support for existing components
  tint: '#5B8DFF',
  icon: '#94A3B8',
  tabIconDefault: '#94A3B8',
  tabIconSelected: '#F1F5F9',

  // Default buttons, links, Send button, selected tabs
  blue: '#5B8DFF',

  // Success states, correct answers, completed lessons
  green: '#22C55E',

  // Delete buttons, error states, critical alerts, overdue payments
  red: '#EF4444',

  // Warning states, streak/reward highlights
  orange: '#F59E0B',

  // Coins, badges, achievement highlights
  yellow: '#EAB308',

  // Decorative accent for badges and rewards
  pink: '#EC4899',

  // Decorative accent for creative features
  purple: '#8B5CF6',

  // Decorative accent for communication features
  teal: '#14B8A6',

  // Decorative accent for system/info features
  indigo: '#6366F1',

  // Semantic states
  success: '#22C55E',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
  info: '#3B82F6',
  infoForeground: '#FFFFFF',
  error: '#EF4444',
  errorForeground: '#FFFFFF',
};

export const Colors = {
  light: lightColors,
  dark: darkColors,
};

// Export individual color schemes for easier access
export { darkColors, lightColors };

// Utility type for color keys
export type ColorKeys = keyof typeof lightColors;

// Helper function to get color with opacity (useful for React Native)
export const withOpacity = (color: string, opacity: number) => {
  // Handle rgba colors
  if (color.startsWith('rgba')) {
    return color;
  }

  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  return color;
};
