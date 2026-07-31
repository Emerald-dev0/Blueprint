import { invoke as tauriInvoke } from '@tauri-apps/api/core';

/**
 * True when running inside the Tauri shell rather than a plain browser.
 *
 * `next dev` in a browser has no Tauri runtime, so every `invoke` throws
 * "Cannot read properties of undefined (reading 'invoke')". Call sites used to
 * catch that into `console.error` and fall through to hardcoded mock data,
 * which is why the app looked functional while every backend call was failing.
 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Discriminated error kinds mirrored from Rust's `ProviderError`. */
export type IpcErrorKind =
  | 'missing_credential'
  | 'auth'
  | 'rate_limit'
  | 'upstream'
  | 'bad_request'
  | 'network'
  | 'protocol'
  | 'unknown_provider'
  | 'local_unavailable'
  | 'cancelled'
  | 'not_desktop'
  | 'unknown';

export class IpcError extends Error {
  readonly kind: IpcErrorKind;
  /** The Tauri command that failed, for diagnostics. */
  readonly command: string;

  constructor(command: string, message: string, kind: IpcErrorKind = 'unknown') {
    super(message);
    this.name = 'IpcError';
    this.command = command;
    this.kind = kind;
  }

  /** Whether retrying the same call could plausibly succeed. */
  get isRetryable(): boolean {
    return this.kind === 'rate_limit' || this.kind === 'upstream' || this.kind === 'network';
  }
}

/**
 * Best-effort classification of a backend error string.
 *
 * The Rust side returns typed `ProviderError`s, but Tauri flattens command
 * errors to strings at the boundary. Matching on the phrasing the backend
 * produces is enough for the UI to choose between "Retry" and "Fix settings".
 */
function classify(raw: string): IpcErrorKind {
  const s = raw.toLowerCase();
  if (s.includes('no credential configured')) return 'missing_credential';
  if (s.includes('rejected the credential')) return 'auth';
  if (s.includes('rate limited')) return 'rate_limit';
  if (s.includes('upstream error')) return 'upstream';
  if (s.includes('not reachable at')) return 'local_unavailable';
  if (s.includes('network error')) return 'network';
  if (s.includes('unexpected response')) return 'protocol';
  if (s.includes('unknown provider')) return 'unknown_provider';
  if (s.includes('rejected the request')) return 'bad_request';
  if (s.includes('cancelled')) return 'cancelled';
  return 'unknown';
}

/**
 * Calls a Tauri command, normalising failures into `IpcError`.
 *
 * Throws rather than returning a sentinel — callers must handle the failure
 * and render a state for it, not paper over it.
 */
export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isDesktop()) {
    throw new IpcError(
      command,
      'This feature needs the Blueprint desktop app. Run `pnpm tauri:dev` instead of opening the web build directly.',
      'not_desktop'
    );
  }

  try {
    return (await tauriInvoke<T>(command, args)) as T;
  } catch (e) {
    const message = typeof e === 'string' ? e : e instanceof Error ? e.message : String(e);
    throw new IpcError(command, message, classify(message));
  }
}

/** Formats any thrown value for display. */
export function describeError(e: unknown): string {
  if (e instanceof IpcError) return e.message;
  if (e instanceof Error) return e.message;
  return String(e);
}
