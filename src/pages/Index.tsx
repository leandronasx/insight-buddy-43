import { ProtectedRoute } from '@/components/ProtectedRoute';
import Dashboard from './Dashboard';

export default function Index() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
