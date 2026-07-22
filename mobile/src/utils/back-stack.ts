import { useEffect, useRef } from 'react';

// Global LIFO stack of "back" actions. Any screen or modal that's currently
// visible pushes its own close/back callback here while it's open, and pops
// it when it closes. The single hardware-back listener in App.tsx always
// unwinds the topmost entry first, so pressing back retraces the exact path
// the user navigated (nested modal -> parent modal -> parent screen -> home),
// regardless of which screen/modal component happens to be involved.
type BackAction = () => void;

const stack: BackAction[] = [];

export function pushBackAction(action: BackAction) {
  stack.push(action);
}

export function removeBackAction(action: BackAction) {
  const index = stack.lastIndexOf(action);
  if (index !== -1) stack.splice(index, 1);
}

/** Pops and runs the topmost back action, if any. Returns whether one ran. */
export function popBackAction(): boolean {
  const action = stack[stack.length - 1];
  if (!action) return false;
  action();
  return true;
}

/**
 * Registers `onBack` as the current top-of-stack action for as long as
 * `active` is true. Call this from any screen/modal that should be unwound
 * by the hardware back key before falling back to whatever's underneath it.
 */
export function useBackStackEntry(active: boolean, onBack: BackAction) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active) return;
    const action: BackAction = () => onBackRef.current();
    pushBackAction(action);
    return () => removeBackAction(action);
  }, [active]);
}
