/**
 * Unwrap Next.js 15+ dynamic route props: when a page is the App Router entry,
 * `params` / `searchParams` are Promises; when the same module is rendered as a
 * nested Server Component, callers may pass plain objects. Avoids passing
 * bare Promises as JSX props (which trips sync-dynamic-api warnings under dev
 * instrumentation that enumerates props).
 */
export async function asResolved<T>(value: T | Promise<T>): Promise<T> {
  if (value != null && typeof (value as Promise<T>).then === 'function') {
    return await value;
  }
  return value as T;
}
