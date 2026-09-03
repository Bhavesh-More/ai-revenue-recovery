import { useEffect, useState, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '')}/api/v1`
  : 'http://localhost:4000/api/v1';

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
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    function connect() {
      if (!isSubscribed) return;
      setStatus('connecting');
      try {
        eventSource = new EventSource(`${API_BASE}/stream`);

        eventSource.onopen = () => {
          if (!isSubscribed) return;
          setStatus('connected');
        };

        const dispatch = (parsed: StreamEventData) => {
          if (!isSubscribed) return;
          setLastEvent(parsed);
          onEventRef.current?.(parsed);
        };

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data) as StreamEventData;
            dispatch(parsed);
          } catch {
            // Ignore keepalive or malformed data
          }
        };

        const eventTypes = ['case.created', 'case.updated', 'audit.event', 'webhook.event', 'connected'];
        eventTypes.forEach((type) => {
          eventSource?.addEventListener(type, (e: MessageEvent) => {
            try {
              const parsed = JSON.parse(e.data) as StreamEventData;
              dispatch(parsed);
            } catch {
              // Ignore
            }
          });
        });

        eventSource.onerror = () => {
          if (!isSubscribed) return;
          setStatus('disconnected');
          eventSource?.close();
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch {
        if (!isSubscribed) return;
        setStatus('disconnected');
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      isSubscribed = false;
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []); // Run once on mount to maintain a single steady persistent connection

  return { status, lastEvent };
}
