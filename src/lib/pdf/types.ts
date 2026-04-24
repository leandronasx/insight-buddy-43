import type { VendaComItens, LeadOption } from '@/hooks/useVendas';
import type { Empresa } from '@/hooks/useEmpresa';

export interface OrdemServicoData {
  venda: VendaComItens;
  empresa: Empresa;
  lead: LeadOption | null;
}

export type RGB = [number, number, number];

export interface PdfTheme {
  primary: RGB;
  secondary: RGB;
  ink: RGB;
  muted: RGB;
  softBg: RGB;
  borderColor: RGB;
}

export interface PdfLayout {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
}
