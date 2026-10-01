import { useData } from './useData';
import { useCloud } from './useCloud';
import { useConfirm } from '../components/ui/Confirm';
import { useToast } from '../components/ui/Toast';
import { generateDemoData } from '../db/demo';
import { replaceAllData } from '../db/repo';

export function useLoadDemo() {
  const { habits, today } = useData();
  const { signedIn } = useCloud();
  const confirm = useConfirm();
  const toast = useToast();

  return async () => {
    if (
      habits.length > 0 &&
      !(await confirm({
        title: 'Replace everything with demo data?',
        message: signedIn
          ? 'Your current habits and history will be deleted here and on your other synced devices. Export a backup first if you want to keep them.'
          : 'Your current habits and history will be deleted. Export a backup first if you want to keep them.',
        confirmLabel: 'Load demo data',
        danger: true,
      }))
    ) {
      return;
    }
    const demo = generateDemoData(today);
    await replaceAllData(demo.habits, demo.entries);
    toast({ message: 'Loaded 90 days of demo data', tone: 'success' });
  };
}
