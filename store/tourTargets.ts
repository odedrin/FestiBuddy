/**
 * tourTargets — a tiny global registry mapping a stable string id (e.g.
 * "live.graph") to a ref of the on-screen element it names, so the
 * TourOverlay can measure and spotlight it without screens needing to know
 * anything about the tour itself.
 *
 * Screens call the `useTourTarget(id)` hook and attach the returned ref to
 * the element they want highlighted. Registration/unregistration happens on
 * mount/unmount, which naturally handles tab screens mounting lazily.
 */

import { RefObject, useEffect, useRef } from 'react';

/**
 * Deliberately `any`: this same hook is attached to plain Views,
 * TouchableOpacity, and ScrollView across the app (each with a different,
 * incompatible ref type), and all the tour overlay needs from any of them
 * is `measureInWindow`. A precise union would fight React's `ref` prop
 * typing at every call site for no real benefit.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TargetRef = RefObject<any>;

const registry = new Map<string, TargetRef>();

export function registerTourTarget(id: string, ref: TargetRef) {
  registry.set(id, ref);
}

export function unregisterTourTarget(id: string, ref: TargetRef) {
  if (registry.get(id) === ref) registry.delete(id);
}

export function getTourTargetRef(id: string): TargetRef | undefined {
  return registry.get(id);
}

/** Attach the returned ref to the element that should be spotlighted for `id`. */
export function useTourTarget(id: string): TargetRef {
  const ref = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  useEffect(() => {
    registerTourTarget(id, ref);
    return () => unregisterTourTarget(id, ref);
  }, [id]);
  return ref;
}
