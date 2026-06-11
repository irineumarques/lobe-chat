/**
 * SSE Heartbeat Transform Stream
 * Injects ': keep-alive\n\n' comments every 15 seconds to prevent
 * proxies/CDNs from closing long-running SSE connections.
 *
 * Based on LibreChat's SSE heartbeat implementation.
 */

const HEARTBEAT_INTERVAL_MS = 15_000;

export interface HeartbeatTransformOptions {
  /**
   * Interval in milliseconds between heartbeat comments.
   * Default: 15000 (15 seconds)
   */
  interval?: number;
}

/**
 * Creates a TransformStream that injects SSE heartbeat comments
 * into a Server-Sent Events stream.
 *
 * This prevents proxies (nginx, AWS ALB, Cloudflare) from closing
 * connections due to idle timeout on long-running streams.
 *
 * @example
 * ```typescript
 * const response = await modelRuntime.chat(data, { signal });
 * const heartbeatStream = createSSEHeartbeatStream(response.body!);
 * return new Response(heartbeatStream, {
 *   headers: { 'Content-Type': 'text/event-stream' }
 * });
 * ```
 */
export function createSSEHeartbeatStream(
  stream: ReadableStream<Uint8Array>,
  options: HeartbeatTransformOptions = {},
): ReadableStream<Uint8Array> {
  const interval = options.interval ?? HEARTBEAT_INTERVAL_MS;

  return new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();
      const encoder = new TextEncoder();

      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      let isActive = true;

      // Send heartbeat comment every interval
      heartbeatTimer = setInterval(() => {
        if (isActive && !controller.desiredSize) {
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
          } catch {
            // Stream may be closed
          }
        }
      }, interval);

      // Read from source stream
      const pump = async () => {
        try {
          while (isActive) {
            const { done, value } = await reader.read();

            if (done) {
              if (heartbeatTimer) clearInterval(heartbeatTimer);
              break;
            }

            // Pass through the chunk
            controller.enqueue(value);

            // Reset heartbeat timer to avoid duplicate heartbeats
            if (heartbeatTimer) {
              clearInterval(heartbeatTimer);
              heartbeatTimer = setInterval(() => {
                if (isActive && !controller.desiredSize) {
                  try {
                    controller.enqueue(encoder.encode(': keep-alive\n\n'));
                  } catch {
                    // Stream may be closed
                  }
                }
              }, interval);
            }
          }
        } catch (error) {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        } finally {
          isActive = false;
          try {
            controller.close();
          } catch {
            // Already closed
          }
          reader.releaseLock();
        }
      };

      pump().catch(() => {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        isActive = false;
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },

    cancel() {
      // Called when the stream is cancelled (e.g., client disconnects)
      isActive = false;
    },
  });
}

/**
 * Wraps a Response's body with SSE heartbeat injection.
 * Returns a new Response with the same status and headers but with
 * a heartbeat-enabled stream body.
 */
export function wrapResponseWithHeartbeat(
  response: Response,
  options: HeartbeatTransformOptions = {},
): Response {
  if (!response.body) {
    return response;
  }

  const heartbeatStream = createSSEHeartbeatStream(response.body, options);

  return new Response(heartbeatStream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
