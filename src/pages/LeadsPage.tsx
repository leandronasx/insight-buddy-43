import { ProtectedRoute } from '@/components/ProtectedRoute';
import Leads from './Leads';

export default function LeadsPage() {
  return (
    <ProtectedRoute>
      <Leads />
    </ProtectedRoute>
  );
}
