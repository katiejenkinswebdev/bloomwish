import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/store/auth-store';

/**
 * Founder access: emails in app_config key 'founder' bypass the free-tier
 * dream-slot cap. Client-side convenience only — server-side Full Bloom
 * gates are untouched.
 */
export function useIsFounder(): boolean {
  const user = useUser();
  const founderQuery = useQuery({
    queryKey: ['app-config', 'founder'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'founder')
        .maybeSingle();
      return ((data?.value as { emails?: string[] } | null)?.emails ?? []).map((e) =>
        e.toLowerCase()
      );
    },
    staleTime: 1000 * 60 * 60,
  });
  const email = user?.email?.toLowerCase();
  return !!email && (founderQuery.data ?? []).includes(email);
}
