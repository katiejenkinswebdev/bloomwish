import { Platform, Share } from 'react-native';

import { supabase } from '@/lib/supabase/client';

/** Download (web) or share (native) everything the user owns as JSON. */
export async function exportMyData(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('export-data', { method: 'POST' });
  if (error) throw error;
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'bloomwish-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ message: json });
  }
}
