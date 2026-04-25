import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminEmpresas from './AdminEmpresas';

export default function AdminEmpresasPage() {
  return (
    <ProtectedRoute>
      <AdminEmpresas />
    </ProtectedRoute>
  );
}
