import AppTabs from '@/components/app-tabs';
import { useShakeToReport } from '@/features/feedback/use-shake-to-report';

export default function AppGroupLayout() {
  useShakeToReport();
  return <AppTabs />;
}
