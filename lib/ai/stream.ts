import type { StreamEvent } from './types';

export function encodeSSEEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createSSEStream(
  generator: () => AsyncGenerator<StreamEvent, void, unknown>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator()) {
          controller.enqueue(encoder.encode(encodeSSEEvent(event)));
        }
        controller.enqueue(
          encoder.encode(encodeSSEEvent({ type: 'done', data: '' }))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(
          encoder.encode(encodeSSEEvent({ type: 'error', data: message }))
        );
      } finally {
        controller.close();
      }
    },
  });
}
