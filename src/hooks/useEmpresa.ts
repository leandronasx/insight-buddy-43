import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Empresa {
  id: string;
  user_id: string;
  empresa_nome: string;
  status: 'ativo' | 'inativo';
}

export function useEmpresa() {
  const { user } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEmpresa(null);
      setLoading(false);
      return;
    }

    const fetchEmpresa = async () => {
      const { data } = await supabase
        .from('empresas')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setEmpresa(data);
      setLoading(false);
    };

    fetchEmpresa();
  }, [user]);

  return { empresa, loading };
}
