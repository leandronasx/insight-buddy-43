import { ProtectedRoute } from '@/components/ProtectedRoute';
import Servicos from './Servicos';

export default function ServicosPage() {
  return (
    <ProtectedRoute>
      <Servicos />
    </ProtectedRoute>
  );
}
