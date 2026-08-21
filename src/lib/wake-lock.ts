export type WakeLockState = "idle" | "acquiring" | "active" | "released" | "unsupported" | "error";

export interface WakeLockSnapshot {
  state: WakeLockState;
  error: string | null;
}

type Listener = (snapshot: WakeLockSnapshot) => void;

export class WakeLockController {
  private sentinel: WakeLockSentinel | null = null;
  private wanted = false;
  private retryTimer: number | null = null;
  private listeners = new Set<Listener>();
  private snapshot: WakeLockSnapshot = { state: "idle", error: null };

  constructor() {
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): WakeLockSnapshot {
    return this.snapshot;
  }

  async start(): Promise<void> {
    this.wanted = true;
    try {
      await this.acquire();
    } catch (error) {
      this.wanted = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.wanted = false;
    this.clearRetry();
    const sentinel = this.sentinel;
    this.sentinel = null;
    if (sentinel && !sentinel.released) await sentinel.release().catch(() => undefined);
    this.update({ state: "idle", error: null });
  }

  destroy(): void {
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.clearRetry();
    void this.stop();
    this.listeners.clear();
  }

  private async acquire(): Promise<void> {
    if (!navigator.wakeLock) {
      const error = new Error("Screen wake lock is not supported in this browser.");
      this.update({ state: "unsupported", error: error.message });
      throw error;
    }
    if (document.visibilityState !== "visible") {
      const error = new Error("Keep this window visible to activate the wake lock.");
      this.update({ state: "released", error: error.message });
      throw error;
    }
    if (this.sentinel && !this.sentinel.released) return;
    this.update({ state: "acquiring", error: null });
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      this.sentinel = sentinel;
      sentinel.addEventListener("release", this.handleRelease, { once: true });
      this.update({ state: "active", error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The browser rejected the wake-lock request.";
      this.update({ state: "error", error: message });
      throw new Error(message, { cause: error });
    }
  }

  private handleRelease = (): void => {
    this.sentinel = null;
    if (!this.wanted) return;
    this.update({ state: "released", error: "Wake protection was released. Retrying while this display stays visible." });
    if (document.visibilityState === "visible") this.scheduleRetry();
  };

  private handleVisibilityChange = (): void => {
    if (this.wanted && document.visibilityState === "visible" && this.snapshot.state !== "active") {
      void this.acquire().catch(() => this.scheduleRetry());
    }
  };

  private scheduleRetry(): void {
    this.clearRetry();
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      if (this.wanted && document.visibilityState === "visible") {
        void this.acquire().catch(() => this.scheduleRetry());
      }
    }, 3_000);
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private update(snapshot: WakeLockSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }
}
