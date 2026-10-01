import { useData } from './useData';
import { useConfirm } from '../components/ui/Confirm';
import { useToast } from '../components/ui/Toast';
import { generateDemoData } from '../db/demo';
import { replaceAllData } from '../db/repo';

export function useLoadDemo() {
  const { habits, today } = useData();
  const confirm = useConfirm();
  const toast = useToast();

  return async () => {
    if (
      habits.length > 0 &&
      !(await confirm({
        title: 'Replace everything with demo data?',
        message: 'Your current habits and history will be deleted. Export a backup first if you want to keep them.',
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
