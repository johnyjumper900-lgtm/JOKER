export function renderErrorPage(error?: unknown): string {
  const msg = error instanceof Error ? error.message : error ? String(error) : "Internal Server Error";
  const safe = msg.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
  return `<!doctype html><html><body style="font-family:system-ui;padding:2rem;background:#0b0b14;color:#eee"><h1>Something went wrong</h1><pre>${safe}</pre></body></html>`;
}
