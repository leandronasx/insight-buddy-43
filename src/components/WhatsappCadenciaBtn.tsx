/**
 * WhatsappCadenciaBtn
 *
 * Botão de WhatsApp inteligente:
 * - ATIVO com mensagem verde  → hoje é dia de enviar pela cadência
 * - DESATIVADO cinza          → não é dia de enviar (ou sem regra)
 */
import { MessageCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CadenciaMensagem } from '@/hooks/useCadenciaLeads';

interface Props {
  telefone: string | null;
  cadencia: CadenciaMensagem | null | undefined;
  size?: 'sm' | 'md';
}

function whatsappLink(telefone: string, mensagem: string): string {
  const num = telefone.replace(/\D/g, '');
  return `https://wa.me/55${num}?text=${encodeURIComponent(mensagem)}`;
}

export function WhatsappCadenciaBtn({ telefone, cadencia, size = 'md' }: Props) {
  const iconClass = size === 'sm' ? 'h-3 w-3' : 'h-5 w-5';
  const ativo = !!cadencia && !!telefone;

  if (!ativo) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-not-allowed opacity-30">
            <MessageCircle className={`${iconClass} text-muted-foreground`} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {!telefone
            ? 'Lead sem telefone cadastrado'
            : 'Nenhuma mensagem para enviar hoje — fora da cadência'}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={whatsappLink(telefone!, cadencia!.mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors"
        >
          <MessageCircle className={iconClass} />
          {size === 'md' && <span className="text-xs">WA</span>}
        </a>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs space-y-1">
        <p className="font-semibold text-xs text-green-400">{cadencia!.label} — enviar hoje!</p>
        <p className="text-xs text-muted-foreground line-clamp-3">{cadencia!.mensagem}</p>
      </TooltipContent>
    </Tooltip>
  );
}
