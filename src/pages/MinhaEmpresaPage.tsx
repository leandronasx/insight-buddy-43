import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import MinhaEmpresa from './MinhaEmpresa';

export default function MinhaEmpresaPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <MinhaEmpresa />
      </AppLayout>
    </ProtectedRoute>
  );
}
