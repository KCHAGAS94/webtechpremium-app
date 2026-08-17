'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Danger styling (red confirm button) for destructive actions like deleting. */
  danger?: boolean;
};

type ConfirmState = ConfirmOptions & {
  message: string;
};

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Drop-in styled replacement for `window.confirm`, matching the dashboard's dark theme. */
export function useConfirm(): ConfirmFn {
  const confirmFn = useContext(ConfirmContext);
  if (!confirmFn) throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  return confirmFn;
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((message, options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ message, ...options });
    });
  }, []);

  const handleClose = (result: boolean) => {
    setState(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => handleClose(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-white/10 bg-[#181829] p-5 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white">{state.title ?? 'Confirmar ação'}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-300">{state.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => handleClose(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/5 transition"
              >
                {state.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                onClick={() => handleClose(true)}
                autoFocus
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                  state.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-fuchsia-600 hover:bg-fuchsia-700'
                }`}
              >
                {state.confirmLabel ?? 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
