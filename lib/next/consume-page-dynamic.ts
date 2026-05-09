/**
 * Next.js 15+ / 16: `params` and `searchParams` are Promises on the server.
 * Await them before render so tooling never synchronously enumerates a Promise
 * (see https://nextjs.org/docs/messages/sync-dynamic-apis).
 */
export async function consumePageDynamic(props: {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
}): Promise<void> {
  if (props.params) await props.params;
  if (props.searchParams) await props.searchParams;
}
