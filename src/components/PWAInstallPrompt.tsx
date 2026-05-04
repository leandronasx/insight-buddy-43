import { useState, useEffect } from 'react';
import { X, Download, Share, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useApplyBranding } from '@/hooks/useApplyBranding';

export function PWAInstallPrompt() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { empresa } = useEmpresa();
  useApplyBranding();

  const appName = empresa?.nome_empresa || 'Higi$Controle';
  const logoUrl = empresa?.logo_url || '/apple-touch-icon.png';

  useEffect(() => {
    if (localStorage.getItem('pwa-prompt-dismissed') === 'true') {
      setIsDismissed(true);
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (isDismissed || isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:flex md:justify-center animate-in slide-in-from-bottom-full duration-500">
      <div className="bg-card border border-border shadow-2xl rounded-2xl p-4 w-full md:max-w-md relative overflow-hidden flex flex-col gap-4">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-full p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="shrink-0 rounded-xl overflow-hidden bg-primary/10 w-14 h-14 flex items-center justify-center shadow-sm">
            <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
          </div>

          {/* Text */}
          <div className="flex-1 pr-6">
            <h3 className="font-display font-semibold text-foreground text-base leading-tight">
              Instalar {appName}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-snug">
              Acesse direto da sua tela inicial, sem abrir o navegador
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="flex-1 text-muted-foreground hover:text-foreground h-11"
          >
            Agora não
          </Button>
          <Button
            onClick={handleInstall}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-11 shadow-sm"
          >
            Instalar
          </Button>
        </div>
      </div>
    </div>
  );
}
