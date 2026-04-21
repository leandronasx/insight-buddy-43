import jsPDF from 'jspdf';
import type { OrdemServicoData, PdfLayout, PdfTheme } from './pdf/types';
import { hexToRgb } from './pdf/utils';
import { drawHeader, getOsNumber } from './pdf/header';
import { drawClientSection, drawScheduling } from './pdf/client-section';
import { drawServicesTable } from './pdf/services-table';
import { drawTotals } from './pdf/totals';
import { drawSignatures, drawFooter } from './pdf/signatures';

export async function gerarOrdemServicoPDF({ venda, empresa, lead }: OrdemServicoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  const layout: PdfLayout = {
    pageWidth,
    pageHeight,
    margin,
    contentWidth: pageWidth - margin * 2,
  };

  const theme: PdfTheme = {
    primary: hexToRgb(empresa.cor_primaria, [34, 197, 94]),
    secondary: hexToRgb(empresa.cor_secundaria, [59, 130, 246]),
    ink: [0, 0, 0],
    muted: [75, 85, 99],
    softBg: [248, 250, 252],
    borderColor: [226, 232, 240],
  };

  let y = await drawHeader({ doc, layout, theme, empresa, venda });
  y = drawClientSection({ doc, layout, theme, lead, y });
  y = drawScheduling({ doc, layout, theme, venda, y });
  y = drawServicesTable({ doc, layout, theme, venda, y });
  y = drawTotals({ doc, layout, theme, venda, y });
  drawSignatures({ doc, layout, theme, empresa, y });
  drawFooter({ doc, layout, theme, empresa });

  const osNumber = getOsNumber(venda);
  doc.save(`OS_${osNumber}_${(lead?.nome_lead || 'Cliente').replace(/\s+/g, '_')}.pdf`);
}
