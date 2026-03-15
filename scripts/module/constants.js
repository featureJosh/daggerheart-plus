export const MODULE_ID = "daggerheart-plus";
export const SYSTEM_ID = "daggerheart";

export const COLOR_LIGHT_DARK_DEFAULTS = {
  primary:      { light: "#b8860b", dark: "#f3c267" },
  secondary:    { light: "#a67c00", dark: "#cc9900" },
  accent:       { light: "#c88c00", dark: "#ffbb33" },
  background:   { light: "#f5f0e8", dark: "#0a0a0f" },
  surface:      { light: "#ebe5dc", dark: "#1a1a25" },
  surfaceRaised:{ light: "#e0d9ce", dark: "#2a2a35" },
  text:         { light: "#2a2520", dark: "#ffffff" },
  textLight:    { light: "#5a5248", dark: "#cccccc" },
  textMuted:    { light: "#4a4238", dark: "#9a8e80" },
  border:       { light: "#c4b8a8", dark: "#333344" },
  borderLight:  { light: "#d4c8b8", dark: "#3a302a" },
  success:      { light: "#b8860b", dark: "#f3c267" },
  warning:      { light: "#e65100", dark: "#ff9800" },
  danger:       { light: "#c62828", dark: "#f44336" },
  info:         { light: "#1565c0", dark: "#2196f3" },
  gold:         { light: "#b8860b", dark: "#f3c267" },
};

export const COLOR_CSS_MAP = {
  primary:       "--dhp-primary",
  secondary:     "--dhp-secondary",
  accent:        "--dhp-accent",
  background:    "--dhp-background",
  surface:       "--dhp-surface",
  surfaceRaised: "--dhp-surface-raised",
  text:          "--dhp-text",
  textLight:     "--dhp-text-light",
  textMuted:     "--dhp-text-muted",
  border:        "--dhp-border",
  borderLight:   "--dhp-border-light",
  success:       "--dhp-success",
  warning:       "--dhp-warning",
  danger:        "--dhp-danger",
  info:          "--dhp-info",
  gold:          "--dh-color-gold",
};

export function colorSettingKey(key, variant) {
  const base = `color${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  return variant ? `${base}${variant === "light" ? "Lt" : "Dk"}` : base;
}
