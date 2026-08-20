import { useEffect, useState } from 'react';

const MAC_REGEX = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;

export type MacExistsStatus = 'idle' | 'checking' | 'valid' | 'invalid';

// Debounced check against /api/painel/mac-existe: only queries once the mac
// is a fully-formed AA:BB:CC:DD:EE:FF address, so partial typing doesn't
// flash the "invalid" state on every keystroke.
export function useMacExists(mac: string): MacExistsStatus {
  const [status, setStatus] = useState<MacExistsStatus>('idle');

  useEffect(() => {
    if (!MAC_REGEX.test(mac)) {
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('checking');

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/painel/mac-existe?mac=${encodeURIComponent(mac)}`);
        const data = await response.json();
        if (!cancelled) setStatus(data.exists ? 'valid' : 'invalid');
      } catch {
        if (!cancelled) setStatus('idle');
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [mac]);

  return status;
}
