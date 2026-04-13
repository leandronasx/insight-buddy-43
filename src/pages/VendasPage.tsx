import { ProtectedRoute } from '@/components/ProtectedRoute';
import Vendas from './Vendas';

export default function VendasPage() {
  return (
    <ProtectedRoute>
      <Vendas />
    </ProtectedRoute>
  );
}
