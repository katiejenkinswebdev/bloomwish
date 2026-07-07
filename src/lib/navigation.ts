import { router } from 'expo-router';

/**
 * Close the current (modal) screen. On web a refresh or direct link can make
 * a modal route the first history entry, where router.back() throws
 * "GO_BACK was not handled" — fall through to the garden instead.
 */
export function goBackOrHome(): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.navigate('/');
  }
}
