import { File, Paths } from 'expo-file-system';

// JS-level exceptions today just kill the app silently on a device build (RN's
// red-box only shows in dev) — indistinguishable from a native OOM kill from
// the user's point of view ("the app just closes"). This persists whatever we
// can see from JS *before* the process dies, so the next launch can report
// what actually happened instead of leaving it a mystery. It cannot catch a
// native OOM kill (that terminates the process below the JS layer entirely),
// but it at least rules JS exceptions in or out.
const CRASH_LOG_FILE = new File(Paths.document, 'last-crash.json');

function writeCrashLog(payload: Record<string, unknown>) {
  try {
    CRASH_LOG_FILE.write(JSON.stringify({ ...payload, loggedAt: new Date().toISOString() }, null, 2));
  } catch {
    // Best-effort — if disk write itself fails (e.g. already out of memory),
    // there's nothing more we can do from here.
  }
}

/** Call once, as early as possible (index.js), before anything else runs. */
export function installCrashLogger() {
  // ErrorUtils is a React Native global with no bundled type declaration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorUtils = (global as any).ErrorUtils;
  if (errorUtils) {
    const previousHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      writeCrashLog({
        type: 'js-exception',
        isFatal,
        message: error?.message,
        stack: error?.stack,
      });
      previousHandler?.(error, isFatal);
    });
  }

  const rejectionHandler = (event: { reason?: unknown }) => {
    const reason = event?.reason;
    writeCrashLog({
      type: 'unhandled-rejection',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  };
  // HermesInternal-backed RN exposes a global 'unhandledrejection' event;
  // guarded since it's not present on every engine/RN version.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).addEventListener?.('unhandledrejection', rejectionHandler);
}

/** Reads back whatever the previous run logged, if the app didn't exit cleanly. Consumes (deletes) it so it's only ever reported once. */
export async function consumeLastCrashLog(): Promise<Record<string, unknown> | null> {
  try {
    if (!CRASH_LOG_FILE.exists) return null;
    const raw = await CRASH_LOG_FILE.text();
    CRASH_LOG_FILE.delete();
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
