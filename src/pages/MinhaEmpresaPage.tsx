import { ProtectedRoute } from '@/components/ProtectedRoute';
import MinhaEmpresa from './MinhaEmpresa';

export default function MinhaEmpresaPage() {
  return (
    <ProtectedRoute>
      <MinhaEmpresa />
    </ProtectedRoute>
  );
}
