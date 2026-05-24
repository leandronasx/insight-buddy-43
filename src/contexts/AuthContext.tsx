import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Set up listener FIRST (sync only — no async work inside callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Redirecionar para a página de atualização de senha após clicar no link do email
        window.location.href = '/update-password';
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Se a senha for atualizada ou o usuário logar em outra aba, verificamos
        // se a aba atual está presa na tela de login ou update-password
        // para redirecioná-la ao painel principal e não ficar travada
        if (window.location.pathname === '/update-password' || window.location.pathname === '/login') {
            window.location.href = '/';
        }
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2) Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    // Usamos sempre a origem de onde o usuário está acessando, tornando o código agnóstico a ambiente/deploy
    // IMPORTANTE: A URL base (ex: https://insight-buddy-43.vercel.app) DEVE estar autorizada
    // no painel do Supabase em Authentication > URL Configuration > Redirect URLs
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
