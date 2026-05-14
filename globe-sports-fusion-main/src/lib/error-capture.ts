let lastCapturedError: unknown = undefined;

export function captureError(err: unknown) {
  lastCapturedError = err;
}

export function consumeLastCapturedError(): unknown {
  const e = lastCapturedError;
  lastCapturedError = undefined;
  return e;
}

if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { addEventListener?: (t: string, fn: (e: unknown) => void) => void };
  g.addEventListener?.("error", (e: unknown) => captureError(e));
  g.addEventListener?.("unhandledrejection", (e: unknown) => captureError((e as { reason?: unknown })?.reason ?? e));
}
