import { useEffect, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface StreamEventData {
  type: 'case.created' | 'case.updated' | 'audit.event' | 'webhook.event' | 'connected' | string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface UseRealtimeStreamResult {
  status: 'connected' | 'connecting' | 'disconnected';
  lastEvent: StreamEventData | null;
}

export function useRealtimeStream(
  onEvent?: (event: StreamEventData) => void
): UseRealtimeStreamResult {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [lastEvent, setLastEvent] = useState<StreamEventData | null>(null);

  const handleEvent = useCallback(
    (eventPayload: StreamEventData) => {
      setLastEvent(eventPayload);
      if (onEvent) {
        onEvent(eventPayload);
      }
    },
    [onEvent]
  );

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    function connect() {
      setStatus('connecting');
      try {
        eventSource = new EventSource(`${API_BASE}/stream`);

        eventSource.onopen = () => {
          setStatus('connected');
        };

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data) as StreamEventData;
            handleEvent(parsed);
          } catch {
            // Ignore parse error on ping/raw string
          }
        };

        const eventTypes = ['case.created', 'case.updated', 'audit.event', 'webhook.event', 'connected'];
        eventTypes.forEach((type) => {
          eventSource?.addEventListener(type, (e: MessageEvent) => {
            try {
              const parsed = JSON.parse(e.data) as StreamEventData;
              handleEvent(parsed);
            } catch {
              // Ignore parse error
            }
          });
        });

        eventSource.onerror = () => {
          setStatus('disconnected');
          eventSource?.close();
          // Schedule reconnect attempt with backoff
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch {
        setStatus('disconnected');
        reconnectTimeout = setTimeout(connect, 5000);
      }
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [handleEvent]);

  return { status, lastEvent };
}
