import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function UpdatePassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setError('');
    setLoading(true);

    const result = await updatePassword(password);

    if (result.error) {
      setError(result.error.message);
    } else {
      toast.success('Senha atualizada com sucesso!');
      navigate('/');
    }

    setLoading(false);
  };

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
            <p className="text-muted-foreground">Criar nova senha</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nova Senha</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-secondary border-border"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Confirmar Nova Senha</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-secondary border-border"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Atualizando...' : 'Atualizar Senha'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
