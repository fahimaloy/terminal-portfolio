// src/utils/errorMessage.ts
/**
 * Extract a human-readable message from an unknown thrown value.
 * Handles Axios-style error responses, Error instances, and plain objects.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: unknown } }; message?: unknown };
    const fromAxios = e.response?.data?.message;
    if (typeof fromAxios === 'string' && fromAxios.length > 0) return fromAxios;
    if (e.message && typeof e.message === 'string' && e.message.length > 0)
      return e.message;
  }
  if (typeof err === 'string' && err.length > 0) return err;
  return fallback;
}
