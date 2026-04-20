import { useEffect } from 'react';
import { useEmpresa } from './useEmpresa';

// Convert hex color to "H S% L%" string used by Tailwind via hsl(var(--token))
function hexToHsl(hex: string | null | undefined): { h: number; s: number; l: number } | null {
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
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const hslStr = (c: { h: number; s: number; l: number }) => `${c.h} ${c.s}% ${c.l}%`;
const adjust = (c: { h: number; s: number; l: number }, dl: number, ds = 0) => ({
  h: c.h,
  s: Math.max(0, Math.min(100, c.s + ds)),
  l: Math.max(0, Math.min(100, c.l + dl)),
});

// Foreground that contrasts with a given color (light text on dark bg / dark text on light bg)
function readableForeground(c: { h: number; s: number; l: number } | null): string {
  if (!c) return '210 20% 95%';
  return c.l > 55 ? '220 20% 10%' : '210 20% 95%';
}

const DEFAULTS = {
  primary: '142 60% 45%',
  primaryFg: '220 20% 10%',
  ring: '142 60% 45%',
  sidebarBg: '220 20% 8%',
  sidebarFg: '210 20% 85%',
  sidebarPrimary: '142 60% 45%',
  sidebarPrimaryFg: '220 20% 10%',
  sidebarAccent: '220 15% 15%',
  sidebarAccentFg: '210 20% 85%',
  sidebarBorder: '220 15% 18%',
  sidebarRing: '142 60% 45%',
};

export function useApplyBranding() {
  const { empresa } = useEmpresa();

  useEffect(() => {
    const root = document.documentElement;

    const primaryHsl = hexToHsl(empresa?.cor_primaria);
    const secondaryHsl = hexToHsl(empresa?.cor_secundaria);

    // === Primary brand color → buttons / links / focus rings ===
    if (primaryHsl) {
      root.style.setProperty('--primary', hslStr(primaryHsl));
      root.style.setProperty('--primary-foreground', readableForeground(primaryHsl));
      root.style.setProperty('--ring', hslStr(primaryHsl));
    } else {
      root.style.setProperty('--primary', DEFAULTS.primary);
      root.style.setProperty('--primary-foreground', DEFAULTS.primaryFg);
      root.style.setProperty('--ring', DEFAULTS.ring);
    }

    // === Sidebar ===
    // Fundo = SECUNDÁRIA (fallback: tom suave da primária ou neutro claro)
    // Botão ativo = PRIMÁRIA, com texto branco/contraste
    // Hover = tom intermediário da paleta
    const sidebarBg = secondaryHsl ?? (primaryHsl ? adjust(primaryHsl, 45, -40) : null);

    if (sidebarBg && primaryHsl) {
      const sidebarFg = readableForeground(sidebarBg);

      // Item ativo = cor primária da empresa
      const activeBg = primaryHsl;
      const activeFg = readableForeground(activeBg);

      // Hover sobre o fundo: leve tint deslocado da primária, suave sobre o fundo
      const hoverBg = sidebarBg.l > 55
        ? adjust(primaryHsl, 30, -20) // claro: tom mais pastel da primária
        : adjust(primaryHsl, -15);    // escuro: primária um pouco mais escura
      const hoverFg = readableForeground(hoverBg);

      // Borda sutil derivada do fundo
      const borderTone = sidebarBg.l > 55 ? adjust(sidebarBg, -10) : adjust(sidebarBg, 10);

      root.style.setProperty('--sidebar-background', hslStr(sidebarBg));
      root.style.setProperty('--sidebar-foreground', sidebarFg);
      root.style.setProperty('--sidebar-primary', hslStr(activeBg));
      root.style.setProperty('--sidebar-primary-foreground', activeFg);
      root.style.setProperty('--sidebar-accent', hslStr(activeBg));
      root.style.setProperty('--sidebar-accent-foreground', activeFg);
      root.style.setProperty('--sidebar-border', hslStr(borderTone));
      root.style.setProperty('--sidebar-ring', hslStr(activeBg));
      root.style.setProperty('--sidebar-hover', hslStr(hoverBg));
      root.style.setProperty('--sidebar-hover-foreground', hoverFg);
    } else {
      root.style.setProperty('--sidebar-background', DEFAULTS.sidebarBg);
      root.style.setProperty('--sidebar-foreground', DEFAULTS.sidebarFg);
      root.style.setProperty('--sidebar-primary', DEFAULTS.sidebarPrimary);
      root.style.setProperty('--sidebar-primary-foreground', DEFAULTS.sidebarPrimaryFg);
      root.style.setProperty('--sidebar-accent', DEFAULTS.sidebarAccent);
      root.style.setProperty('--sidebar-accent-foreground', DEFAULTS.sidebarAccentFg);
      root.style.setProperty('--sidebar-border', DEFAULTS.sidebarBorder);
      root.style.setProperty('--sidebar-ring', DEFAULTS.sidebarRing);
      root.style.setProperty('--sidebar-hover', DEFAULTS.sidebarAccent);
      root.style.setProperty('--sidebar-hover-foreground', DEFAULTS.sidebarAccentFg);
    }
  }, [empresa?.cor_primaria, empresa?.cor_secundaria]);
}
