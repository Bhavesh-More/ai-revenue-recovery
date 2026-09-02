import { EventEmitter } from "node:events";

export interface StreamEventPayload {
  type: "case.created" | "case.updated" | "audit.event" | "webhook.event" | "job.progress" | string;
  timestamp: string;
  data: Record<string, unknown>;
}

export class EventBroadcaster extends EventEmitter {
  private static instance: EventBroadcaster;

  private constructor() {
    super();
    this.setMaxListeners(500);
  }

  public static getInstance(): EventBroadcaster {
    if (!EventBroadcaster.instance) {
      EventBroadcaster.instance = new EventBroadcaster();
    }
    return EventBroadcaster.instance;
  }

  public broadcast(type: StreamEventPayload["type"], data: Record<string, unknown>): void {
    const payload: StreamEventPayload = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };
    this.emit("event", payload);
  }
}

export const eventBroadcaster = EventBroadcaster.getInstance();
