import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './ui/button';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed or dismissed
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

  if (!deferredPrompt || isDismissed || isInstalled) {
    return null;
  }

  return (
    <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center justify-between gap-4 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
        <div className="bg-primary/20 p-2 rounded-lg shrink-0 w-max">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Instalar Aplicativo</h3>
          <p className="text-sm text-muted-foreground">Instale o Higi$Controle para um acesso mais rápido e melhor experiência.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleInstall} size="sm" className="whitespace-nowrap">
          Instalar Agora
        </Button>
        <Button onClick={handleDismiss} variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
