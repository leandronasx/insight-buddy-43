import { useState, useEffect } from 'react';
import { Download, X, Share, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

  if (isDismissed || isInstalled) {
    return null;
  }

  return (
    <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shadow-sm relative">
      <Button onClick={handleDismiss} variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-foreground shrink-0 md:hidden">
        <X className="w-4 h-4" />
      </Button>

      <div className="flex items-start md:items-center gap-3 md:gap-4 flex-1 pr-6 md:pr-0">
        <div className="bg-primary/20 p-2 rounded-lg shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-sm md:text-base">Instalar Aplicativo</h3>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Instale o sistema para um acesso rápido e melhor experiência.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 md:mt-0 w-full md:w-auto">
        {deferredPrompt ? (
          <Button onClick={handleInstall} size="sm" className="w-full md:w-auto whitespace-nowrap">
            Instalar Agora
          </Button>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary" className="w-full md:w-auto whitespace-nowrap">
                Como instalar?
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Como instalar o aplicativo</DialogTitle>
                <DialogDescription>
                  Siga as instruções abaixo de acordo com o seu dispositivo para instalar o sistema e acessá-lo mais rapidamente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                    No iPhone (Safari)
                  </h4>
                  <div className="pl-8 text-sm text-muted-foreground space-y-2">
                    <p className="flex items-center gap-2">
                      1. Toque no ícone de compartilhar <Share className="w-4 h-4 inline" /> na barra inferior.
                    </p>
                    <p>2. Role a tela para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                    No Android (Chrome)
                  </h4>
                  <div className="pl-8 text-sm text-muted-foreground space-y-2">
                    <p className="flex items-center gap-2">
                      1. Toque no menu do navegador <MoreVertical className="w-4 h-4 inline" /> no canto superior direito.
                    </p>
                    <p>2. Selecione <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong>.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                    No Computador
                  </h4>
                  <div className="pl-8 text-sm text-muted-foreground space-y-2">
                    <p>
                      1. Clique no ícone de instalação <Download className="w-4 h-4 inline" /> na barra de endereços do seu navegador.
                    </p>
                    <p>2. Ou acesse o menu do navegador e clique em <strong>"Instalar Higi$Controle"</strong>.</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        <Button onClick={handleDismiss} variant="ghost" size="icon" className="hidden md:flex shrink-0 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
