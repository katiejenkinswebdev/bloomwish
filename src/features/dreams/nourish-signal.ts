/**
 * One-shot signal from the release ritual to the garden: the released
 * dream's energy fed the survivors, so the plants respond when the garden
 * next appears. Module-level by design (same pattern as the app-open
 * delight roll) — it must survive the modal navigation but not a relaunch.
 */
let pending = false;

export function markGardenNourished(): void {
  pending = true;
}

export function consumeGardenNourished(): boolean {
  const value = pending;
  pending = false;
  return value;
}
