import { useState, useRef, forwardRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

function LoginInner() {
  const { signIn, resetPassword } = useAuth();
  const [isResetView, setIsResetView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          setAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (isResetView) {
      const result = await resetPassword(email);
      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccessMsg('Link de recuperação enviado para o seu e-mail se existe uma conta.');
      }
    } else {
      const result = await signIn(email, password);

      if (result.error) {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setError(`Muitas tentativas. Aguarde ${COOLDOWN_SECONDS} segundos.`);
          startCooldown();
        } else {
          setError(`E-mail ou senha incorretos. Tentativa ${next} de ${MAX_ATTEMPTS}.`);
        }
      }
    }

    setLoading(false);
  };

  const isBlocked = cooldown > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Higi$Controle</h1>
            <p className="text-muted-foreground">GTL gestão comercial</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
                disabled={isBlocked}
                className="bg-secondary border-border"
                autoComplete="email"
              />
            </div>
            {!isResetView && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Senha</label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isBlocked}
                  className="bg-secondary border-border"
                  autoComplete="current-password"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm">{error}</p>
                {isBlocked && (
                  <p className="text-muted-foreground text-xs mt-1">
                    Desbloqueio em: <span className="font-mono font-bold">{cooldown}s</span>
                  </p>
                )}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-emerald-500 text-sm">{successMsg}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || isBlocked}
            >
              {loading 
                ? (isResetView ? 'Enviando...' : 'Entrando...') 
                : isBlocked 
                  ? `Aguarde ${cooldown}s` 
                  : (isResetView ? 'Enviar link' : 'Entrar')}
            </Button>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsResetView(!isResetView);
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isResetView ? 'Voltar para o login' : 'Primeiro acesso / Esqueci a senha'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

const Login = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref}>
    <LoginInner />
  </div>
));
Login.displayName = 'Login';

export default Login;