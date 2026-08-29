import { useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';

export type RemoteKey = 'CHANNEL_UP' | 'CHANNEL_DOWN' | 'PROG_RED' | 'PROG_GREEN' | 'PROG_YELLOW' | 'PROG_BLUE';

type Handlers = Partial<Record<RemoteKey, () => void>>;

/**
 * Subscribes to "RemoteKeyEvent", emitted by MainActivity's dispatchKeyEvent
 * override (see plugins/withRemoteKeys.js) for the Android TV remote's
 * dedicated channel and color buttons — keycodes RN's own TVEventHandler
 * doesn't surface. Handlers are read through a ref so callers can pass fresh
 * closures on every render without re-subscribing.
 */
export function useRemoteKeys(handlers: Handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('RemoteKeyEvent', (event: { key: RemoteKey }) => {
      handlersRef.current[event.key]?.();
    });
    return () => subscription.remove();
  }, []);
}
