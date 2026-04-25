import { ProtectedRoute } from '@/components/ProtectedRoute';
import SetupMensal from './SetupMensal';

export default function SetupPage() {
  return (
    <ProtectedRoute>
      <SetupMensal />
    </ProtectedRoute>
  );
}
