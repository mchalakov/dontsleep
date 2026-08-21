export const SESSION_PROTOCOL_VERSION = 1 as const;

export type SessionMessage =
  | { version: 1; sessionId: string; displayId: string; type: "hello" | "stop" | "settings-updated"; sentAt: number }
  | { version: 1; sessionId: string; displayId: string; type: "health"; sentAt: number; wakeLockActive: boolean };

export class SessionChannel {
  private channel: BroadcastChannel | null;
  private listeners = new Set<(message: SessionMessage) => void>();

  constructor(
    private sessionId: string,
    private displayId: string
  ) {
    this.channel = "BroadcastChannel" in globalThis ? new BroadcastChannel("dontsleep-session-v1") : null;
    if (this.channel) this.channel.onmessage = (event: MessageEvent<SessionMessage>) => this.receive(event.data);
  }

  subscribe(listener: (message: SessionMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(type: "hello" | "stop" | "settings-updated"): void {
    this.post({ version: 1, sessionId: this.sessionId, displayId: this.displayId, type, sentAt: Date.now() });
  }

  sendHealth(wakeLockActive: boolean): void {
    this.post({
      version: 1,
      sessionId: this.sessionId,
      displayId: this.displayId,
      type: "health",
      sentAt: Date.now(),
      wakeLockActive
    });
  }

  close(): void {
    this.channel?.close();
    this.channel = null;
    this.listeners.clear();
  }

  private post(message: SessionMessage): void {
    this.channel?.postMessage(message);
  }

  private receive(message: SessionMessage): void {
    if (message.version !== SESSION_PROTOCOL_VERSION || message.sessionId !== this.sessionId) return;
    for (const listener of this.listeners) listener(message);
  }
}
