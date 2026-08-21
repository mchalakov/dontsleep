import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WakeLockController } from "../src/lib/wake-lock";

class FakeSentinel extends EventTarget implements WakeLockSentinel {
  released = false;
  readonly type = "screen" as const;
  onrelease: ((this: WakeLockSentinel, event: Event) => unknown) | null = null;
  async release() {
    this.released = true;
    this.dispatchEvent(new Event("release"));
  }
}

describe("wake lock controller", () => {
  beforeEach(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: undefined });
  });

  it("acquires and releases a screen wake lock", async () => {
    const sentinel = new FakeSentinel();
    const request = vi.fn().mockResolvedValue(sentinel);
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    const controller = new WakeLockController();
    await controller.start();
    expect(controller.getSnapshot().state).toBe("active");
    expect(request).toHaveBeenCalledWith("screen");
    await controller.stop();
    expect(sentinel.released).toBe(true);
    controller.destroy();
  });

  it("reports unsupported browsers without claiming protection", async () => {
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: undefined });
    const controller = new WakeLockController();
    await expect(controller.start()).rejects.toThrow(/not supported/);
    expect(controller.getSnapshot().state).toBe("unsupported");
    controller.destroy();
  });
});
