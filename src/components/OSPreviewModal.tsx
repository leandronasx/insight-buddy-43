import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Printer, Download, X, User, MapPin, Phone, Mail, CreditCard, Calendar, Clock, Package, Tag, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { gerarOrdemServicoPDF } from '@/lib/pdf-ordem-servico';
import { formatCurrency } from '@/lib/date-utils';
import { toast } from 'sonner';
import type { VendaComItens, LeadOption } from '@/hooks/useVendas';
import type { Empresa } from '@/hooks/useEmpresa';

interface OSPreviewProps {
  open: boolean;
  onClose: () => void;
  venda: VendaComItens;
  empresa: Empresa;
  lead: LeadOption | null;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

function getOsNumber(venda: VendaComItens): string {
  return venda.id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function formatData(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

export function OSPreviewModal({ open, onClose, venda, empresa, lead }: OSPreviewProps) {
  const [gerando, setGerando] = useState(false);

  const handleGerar = async () => {
    setGerando(true);
    try {
      await gerarOrdemServicoPDF({ venda, empresa, lead });
      toast.success('Ordem de Serviço gerada com sucesso!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao gerar OS. Tente novamente.');
    } finally {
      setGerando(false);
    }
  };

  const osNum = getOsNumber(venda);
  const subtotal = venda.valor_total;
  const desconto = 0;
  const total = venda.valor_total;

  // Primary color for accent (fallback to green)
  const accentColor = empresa.cor_primaria || '#22c55e';

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Pré-visualização da OS
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5">
          {/* OS Paper mockup */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-border rounded-xl overflow-hidden bg-white text-gray-900 shadow-lg"
          >
            {/* Accent bar */}
            <div className="h-2" style={{ backgroundColor: accentColor }} />

            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {empresa.logo_url ? (
                  <img src={empresa.logo_url} alt={empresa.empresa_nome} className="h-10 w-auto max-w-[100px] object-contain" />
                ) : (
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: accentColor }}>
                    {empresa.empresa_nome.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold text-base text-gray-900">{empresa.empresa_nome}</p>
                  {empresa.telefone && <p className="text-xs text-gray-500">{empresa.telefone}</p>}
                  {empresa.endereco && <p className="text-xs text-gray-500">{empresa.endereco}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Ordem de Serviço</p>
                <p className="font-mono font-bold text-lg text-gray-900">#{osNum}</p>
                <p className="text-xs text-gray-500">{formatData(venda.data_venda)}</p>
              </div>
            </div>

            {/* Client section */}
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-2">Dados do Cliente</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{lead?.nome || '—'}</p>
                </div>
                {lead?.telefone && <p className="text-sm text-gray-600">{lead.telefone}</p>}
                {lead?.email && <p className="text-xs text-gray-500 col-span-2">{lead.email}</p>}
                {lead?.cpf_cnpj && <p className="text-xs text-gray-500">CPF/CNPJ: {lead.cpf_cnpj}</p>}
                {lead?.endereco && <p className="text-xs text-gray-500 col-span-2">{lead.endereco}</p>}
              </div>
            </div>

            {/* Scheduling */}
            {(venda.data_servico || venda.horario_servico) && (
              <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4 bg-gray-50">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Data do Serviço:</span>
                  <span className="text-sm font-semibold text-gray-800">{formatData(venda.data_servico)}</span>
                </div>
                {venda.horario_servico && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">Horário:</span>
                    <span className="text-sm font-semibold text-gray-800">{venda.horario_servico.slice(0, 5)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Services table */}
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Serviços</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[10px] text-gray-400 uppercase font-semibold pb-2">Descrição</th>
                    <th className="text-right text-[10px] text-gray-400 uppercase font-semibold pb-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {venda.itens.length > 0 ? venda.itens.map((s, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-800">{s.estofado || 'Serviço de higienização'}</td>
                      <td className="py-2 text-right font-mono text-gray-800">{formatCurrency(s.valor)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={2} className="py-3 text-center text-gray-400 text-xs italic">Nenhum item cadastrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-6 py-4">
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-8 text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-mono w-24 text-right">{formatCurrency(subtotal)}</span>
                </div>
                {desconto > 0 && (
                  <div className="flex items-center gap-8 text-sm text-red-500">
                    <span>Desconto</span>
                    <span className="font-mono w-24 text-right">- {formatCurrency(desconto)}</span>
                  </div>
                )}
                <div
                  className="flex items-center justify-between w-48 mt-1 px-4 py-2 rounded-lg text-white font-bold"
                  style={{ backgroundColor: accentColor }}
                >
                  <span className="text-sm">TOTAL</span>
                  <span className="font-mono text-base">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Signature area */}
            <div className="px-6 py-4 border-t border-gray-100 grid grid-cols-2 gap-6">
              <div>
                <div className="border-b border-gray-300 mb-1 h-8" />
                <p className="text-[10px] text-gray-400 text-center">Assinatura do Cliente</p>
              </div>
              <div>
                <div className="border-b border-gray-300 mb-1 h-8" />
                <p className="text-[10px] text-gray-400 text-center">Assinatura da Empresa</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-center">
              <p className="text-[10px] text-gray-400">{empresa.empresa_nome} • Obrigado pela preferência!</p>
            </div>
          </motion.div>

          {/* Info summary in app style */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="metric-card text-center p-3">
              <p className="text-[10px] text-muted-foreground mb-1">OS Nº</p>
              <p className="font-mono font-bold text-foreground">#{osNum}</p>
            </div>
            <div className="metric-card text-center p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Itens</p>
              <p className="font-bold text-foreground">{venda.itens.length}</p>
            </div>
            <div className="metric-card text-center p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Total</p>
              <p className="font-bold text-positive">{formatCurrency(total)}</p>
            </div>
            <div className="metric-card text-center p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Agendamento</p>
              <p className="font-bold text-foreground text-xs">{formatData(venda.data_servico)}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-secondary/20">
          <Button onClick={handleGerar} disabled={gerando} className="flex-1 gap-2">
            <Download className="h-4 w-4" />
            {gerando ? 'Gerando PDF...' : 'Baixar PDF'}
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
