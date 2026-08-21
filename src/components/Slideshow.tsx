import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listPhotos, loadSettings } from "../lib/db";
import { createCoordinatedDeck, type SlideDescriptor } from "../lib/scheduler";
import { SessionChannel } from "../lib/session-channel";
import { WakeLockController, type WakeLockSnapshot } from "../lib/wake-lock";
import { getModule, slideModules } from "../modules/registry";
import { DEFAULT_SETTINGS, type AppSettings, type StoredPhoto } from "../types/media";

interface SlideshowProps {
  sessionId: string;
  seed: string;
  displayOrdinal: number;
  displayCount: number;
  controller?: WakeLockController;
  externalWindow?: boolean;
  onExit: () => void;
}

export function Slideshow({
  sessionId,
  seed,
  displayOrdinal,
  displayCount,
  controller: providedController,
  externalWindow = false,
  onExit
}: SlideshowProps) {
  const [controller] = useState(() => providedController ?? new WakeLockController());
  const [channel] = useState(() => new SessionChannel(sessionId, `display-${displayOrdinal}-${crypto.randomUUID()}`));
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [personalUrls, setPersonalUrls] = useState<Map<string, string>>(new Map());
  const [wakeLock, setWakeLock] = useState<WakeLockSnapshot>(controller.getSnapshot());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [controlsVisible, setControlsVisible] = useState(true);
  const [ready, setReady] = useState(Boolean(providedController && controller.getSnapshot().state === "active"));
  const [activationError, setActivationError] = useState<string | null>(null);
  const hideTimer = useRef<number | null>(null);
  const stoppingRef = useRef(false);

  useEffect(() => {
    Promise.all([loadSettings(), listPhotos()]).then(([nextSettings, nextPhotos]) => {
      setSettings(nextSettings);
      setPhotos(nextPhotos);
      const urls = new Map<string, string>();
      for (const photo of nextPhotos) urls.set(photo.id, URL.createObjectURL(photo.blob));
      setPersonalUrls(urls);
    });
  }, []);

  useEffect(() => () => {
    for (const url of personalUrls.values()) URL.revokeObjectURL(url);
  }, [personalUrls]);

  const slides = useMemo(() => {
    const candidates = slideModules.flatMap((module) => {
      if (!settings.enabledModules[module.id]) return [];
      return module.buildSlides({ settings, personalPhotos: photos, personalUrls });
    });
    return createCoordinatedDeck(candidates, seed, displayOrdinal);
  }, [displayOrdinal, personalUrls, photos, seed, settings]);

  const currentSlide: SlideDescriptor | undefined = slides[currentIndex % Math.max(1, slides.length)];
  const CurrentRenderer = currentSlide ? getModule(currentSlide.moduleId)?.Renderer : undefined;

  useEffect(() => {
    if (!ready || !currentSlide) return;
    const timer = window.setTimeout(() => setCurrentIndex((index) => index + 1), currentSlide.durationMs);
    return () => window.clearTimeout(timer);
  }, [currentSlide, ready]);

  const localStop = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    await controller.stop();
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    if (externalWindow) {
      window.close();
      window.setTimeout(onExit, 100);
    } else {
      onExit();
    }
  }, [controller, externalWindow, onExit]);

  useEffect(() => {
    const unsubscribeWake = controller.subscribe((snapshot) => {
      setWakeLock(snapshot);
      channel.sendHealth(snapshot.state === "active");
      if (snapshot.state === "active") setReady(true);
    });
    const unsubscribeChannel = channel.subscribe((message) => {
      if (message.type === "stop") void localStop();
      if (message.type === "settings-updated") {
        void loadSettings().then(setSettings);
      }
    });
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    channel.send("hello");
    return () => {
      unsubscribeWake();
      unsubscribeChannel();
      document.removeEventListener("fullscreenchange", onFullscreen);
      channel.close();
      controller.destroy();
    };
  }, [channel, controller, localStop]);

  useEffect(() => {
    if (providedController) return;
    controller.start().catch((reason) => {
      setActivationError(reason instanceof Error ? reason.message : "Wake protection could not be activated.");
      setReady(false);
    });
  }, [controller, providedController]);

  const activate = async () => {
    setActivationError(null);
    const fullscreenPromise = document.fullscreenElement
      ? Promise.resolve()
      : document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
    try {
      await Promise.all([controller.start(), fullscreenPromise]);
      setReady(true);
    } catch (reason) {
      setActivationError(reason instanceof Error ? reason.message : "Wake protection could not be activated.");
    }
  };

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3_500);
  }, []);

  useEffect(() => {
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3_500);
    return () => {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, []);

  const openAnotherDisplay = () => {
    const params = new URLSearchParams({
      mode: "display",
      session: sessionId,
      seed,
      display: String(displayCount),
      count: String(displayCount + 1)
    });
    window.open(`${window.location.origin}${window.location.pathname}?${params}`, "_blank", "popup=yes,width=1100,height=700");
  };

  const stopAll = () => {
    channel.send("stop");
    void localStop();
  };

  if (!ready) {
    return (
      <main className="activation-screen">
        <img src={`${import.meta.env.BASE_URL}app-mark.svg`} alt="" />
        <p className="eyebrow">Display {displayOrdinal + 1}</p>
        <h1>Activate this display</h1>
        <p>{activationError ?? "Click once to hold the wake lock and enter fullscreen."}</p>
        <button className="start-button" onClick={() => void activate()}>Activate wake display <span>↗</span></button>
        <button className="text-button" onClick={() => void localStop()}>Close this display</button>
      </main>
    );
  }

  return (
    <main
      className={`slideshow-shell ${controlsVisible ? "controls-visible" : "controls-hidden"}`}
      onMouseMove={showControls}
      onPointerDown={showControls}
    >
      <div className={`ambient-field ambient-field-${displayOrdinal % 4}`} />
      {currentSlide && CurrentRenderer ? (
        <div className="slide-stage" key={`${currentSlide.id}-${currentIndex}`}>
          <CurrentRenderer slide={currentSlide} displayOrdinal={displayOrdinal} />
        </div>
      ) : (
        <section className="empty-slide">
          <span>Don’t Sleep</span>
          <strong>Add pictures or text, or enable the clock</strong>
        </section>
      )}

      {wakeLock.state !== "active" && (
        <button className="wake-warning" onClick={() => void activate()}>
          <span>Wake protection inactive</span><small>{wakeLock.error ?? "Click to retry"}</small>
        </button>
      )}

      <nav className="slideshow-controls" aria-label="Session controls">
        <div className="live-state"><span className={wakeLock.state === "active" ? "active" : ""} />{wakeLock.state === "active" ? "Wake lock active" : "Wake lock inactive"}</div>
        <div className="control-actions">
          {!fullscreen && <button onClick={() => void activate()}>Enter fullscreen</button>}
          <button onClick={openAnotherDisplay}>Open another display</button>
          <button className="stop-control" onClick={stopAll}>Stop</button>
        </div>
      </nav>
    </main>
  );
}
