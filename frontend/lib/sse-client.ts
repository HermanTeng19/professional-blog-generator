import { createSSEUrl } from "./api-client";
import type { JobStatus } from "./types";

export interface JobCallbacks {
  onProgress?: (status: JobStatus) => void;
  onComplete?: (status: JobStatus) => void;
  onError?: (error: string) => void;
}

/**
 * Subscribe to a job's Server-Sent Events stream.
 * Returns a cleanup function that closes the connection.
 *
 * Events from the backend:
 * - "progress": payload is the full JobStatus — call onProgress
 * - "complete": payload is the full JobStatus (with result) — call onComplete
 * - "error":    payload is the full JobStatus (with error) — call onError
 */
export function subscribeToJob(
  jobId: string,
  callbacks: JobCallbacks
): () => void {
  const url = createSSEUrl(jobId);
  const eventSource = new EventSource(url);

  eventSource.addEventListener("progress", (event: MessageEvent) => {
    try {
      const status: JobStatus = JSON.parse(event.data);
      callbacks.onProgress?.(status);
    } catch {
      // Ignore malformed events
    }
  });

  eventSource.addEventListener("complete", (event: MessageEvent) => {
    try {
      const status: JobStatus = JSON.parse(event.data);
      callbacks.onComplete?.(status);
    } catch {
      callbacks.onError?.("Failed to parse completion data");
    }
  });

  eventSource.addEventListener("error", (event: MessageEvent) => {
    if (event.data) {
      try {
        const payload = JSON.parse(event.data);
        callbacks.onError?.(
          payload.error ?? payload.message ?? "An unknown error occurred"
        );
      } catch {
        callbacks.onError?.("An unknown error occurred");
      }
    }
    // When the stream closes after an error event, prevent reconnect
    if (eventSource.readyState === EventSource.CLOSED) {
      // Already closed, nothing to do
    }
  });

  // Generic connection error (network down, endpoint not found, etc.)
  eventSource.onerror = () => {
    if (eventSource.readyState === EventSource.CLOSED) {
      callbacks.onError?.("Connection to job stream failed");
      eventSource.close();
    }
    // Otherwise EventSource is reconnecting — let it retry
  };

  return () => {
    eventSource.close();
  };
}
