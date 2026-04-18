import { useEffect } from 'react';
import { useEmpresa } from './useEmpresa';

// Convert hex color to "H S% L%" string used by Tailwind via hsl(var(--token))
function hexToHslString(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  const H = Math.round(h * 360);
  const S = Math.round(s * 100);
  const L = Math.round(l * 100);
  return `${H} ${S}% ${L}%`;
}

// Returns HSL string with L clamped for "foreground" contrast (light text on dark / dark text on light)
function readableForeground(hsl: string | null): string {
  if (!hsl) return '210 20% 95%';
  const parts = hsl.split(' ');
  const l = parseInt(parts[2], 10);
  return l > 55 ? '220 20% 10%' : '210 20% 95%';
}

// Default tokens to restore when no empresa is loaded (matches index.css :root)
const DEFAULTS = {
  primary: '142 60% 45%',
  primaryFg: '220 20% 10%',
  ring: '142 60% 45%',
  sidebarBg: '220 20% 8%',
  sidebarPrimary: '142 60% 45%',
  sidebarRing: '142 60% 45%',
};

export function useApplyBranding() {
  const { empresa } = useEmpresa();

  useEffect(() => {
    const root = document.documentElement;

    const primary = hexToHslString(empresa?.cor_primaria) || DEFAULTS.primary;
    const secondary = hexToHslString(empresa?.cor_secundaria);

    // Apply primary across primary/ring/sidebar accents (most visible "brand" color)
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-foreground', readableForeground(primary));
    root.style.setProperty('--ring', primary);
    root.style.setProperty('--sidebar-primary', primary);
    root.style.setProperty('--sidebar-primary-foreground', readableForeground(primary));
    root.style.setProperty('--sidebar-ring', primary);
    root.style.setProperty('--success', primary);

    // Secondary color → sidebar background (darker shell of the app)
    if (secondary) {
      root.style.setProperty('--sidebar-background', secondary);
    } else {
      root.style.setProperty('--sidebar-background', DEFAULTS.sidebarBg);
    }

    return () => {
      // No reset on unmount — branding should persist while logged in.
      // It is reset only if empresa changes (handled by next effect run).
    };
  }, [empresa?.cor_primaria, empresa?.cor_secundaria]);
}
