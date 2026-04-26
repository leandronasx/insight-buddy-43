import { useState, useRef, forwardRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

function LoginInner() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
    setLoading(true);

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
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">💰 Higi$Controle</h1>
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

            <Button
              type="submit"
              className="w-full"
              disabled={loading || isBlocked}
            >
              {loading ? 'Entrando...' : isBlocked ? `Aguarde ${cooldown}s` : 'Entrar'}
            </Button>
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