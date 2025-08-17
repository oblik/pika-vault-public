import { type Theme } from "@coinbase/cdp-react/theme";

export const theme: Partial<Theme> = {
  "colors-bg-default": "hsl(var(--card))",
  "colors-bg-overlay": "rgba(0, 0, 0, 0.8)",
  "colors-bg-skeleton": "hsl(var(--muted))",
  "colors-bg-primary": "hsl(var(--primary))",
  "colors-bg-secondary": "hsl(var(--muted))",
  "colors-fg-default": "hsl(var(--foreground))",
  "colors-fg-muted": "hsl(var(--muted-foreground))",
  "colors-fg-primary": "hsl(var(--primary))",
  "colors-fg-onPrimary": "hsl(var(--primary-foreground))",
  "colors-fg-onSecondary": "hsl(var(--foreground))",
  "colors-line-default": "hsl(var(--border))",
  "colors-line-heavy": "hsl(var(--muted-foreground))",
  "colors-line-primary": "hsl(var(--primary))",
  "font-family-sans": "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  "font-size-base": "14px",
};
