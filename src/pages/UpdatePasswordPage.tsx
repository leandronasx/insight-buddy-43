import { ProtectedRoute } from '@/components/ProtectedRoute';
import UpdatePassword from './UpdatePassword';

export default function UpdatePasswordPage() {
  return (
    <ProtectedRoute>
      <UpdatePassword />
    </ProtectedRoute>
  );
}
