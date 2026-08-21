import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  clearPhotos,
  getStorageEstimate,
  listPhotos,
  loadSettings,
  removePhoto,
  requestPersistentStorage,
  savePhotos,
  saveSettings
} from "../lib/db";
import { importPhotos } from "../lib/photo-import";
import { WakeLockController } from "../lib/wake-lock";
import { slideModules } from "../modules/registry";
import { DEFAULT_SETTINGS, type AppSettings, type StoredPhoto } from "../types/media";
import { PhotoCard } from "./PhotoCard";

export interface StartedSession {
  sessionId: string;
  seed: string;
  displayOrdinal: number;
  displayCount: number;
  controller: WakeLockController;
}

interface LauncherProps {
  installPrompt: BeforeInstallPromptEvent | null;
  onStart: (session: StartedSession) => void;
}

interface DisplayChoice {
  key: string;
  label: string;
  screen: ScreenDetailed;
  selected: boolean;
  current: boolean;
}

function screenKey(screen: ScreenDetailed): string {
  return `${screen.left}:${screen.top}:${screen.width}:${screen.height}`;
}

function bytesLabel(bytes?: number): string {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(bytes > 1024 * 1024 * 100 ? 0 : 1)} MB`;
}

export function Launcher({ installPrompt, onStart }: LauncherProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [displays, setDisplays] = useState<DisplayChoice[]>([]);
  const [storageText, setStorageText] = useState("Local storage ready");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshStorage = useCallback(async () => {
    const estimate = await getStorageEstimate().catch(() => null);
    if (estimate) setStorageText(`${bytesLabel(estimate.usage)} used of ${bytesLabel(estimate.quota)}`);
  }, []);

  useEffect(() => {
    Promise.all([loadSettings(), listPhotos()])
      .then(([loadedSettings, loadedPhotos]) => {
        setSettings(loadedSettings);
        setPhotos(loadedPhotos);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load local settings."))
      .finally(() => setLoading(false));
    void getStorageEstimate().then((estimate) => {
      if (estimate) setStorageText(`${bytesLabel(estimate.usage)} used of ${bytesLabel(estimate.quota)}`);
    });
  }, [refreshStorage]);

  const updateSettings = useCallback((update: (current: AppSettings) => AppSettings) => {
    setSettings((current) => {
      const next = update(current);
      void saveSettings(next).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to save settings."));
      return next;
    });
  }, []);

  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError(null);
      setNotice("Preparing images locally…");
      const result = await importPhotos(Array.from(fileList));
      if (result.photos.length) {
        try {
          await requestPersistentStorage();
          await savePhotos(result.photos);
          setPhotos((current) => [...result.photos, ...current]);
          updateSettings((current) => ({
            ...current,
            enabledModules: { ...current.enabledModules, photos: true }
          }));
          setNotice(`${result.photos.length} image${result.photos.length === 1 ? "" : "s"} added. Nothing was uploaded.`);
          void refreshStorage();
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : "Unable to store these images locally.");
        }
      } else {
        setNotice(null);
      }
      if (result.errors.length) setError(result.errors.join(" "));
    },
    [refreshStorage, updateSettings]
  );

  const detectDisplays = async () => {
    setError(null);
    if (!window.getScreenDetails) {
      setNotice("Automatic display placement is not available here. Start normally, then use Open another display.");
      return;
    }
    try {
      const details = await window.getScreenDetails();
      setDisplays(
        details.screens.map((screen, index) => ({
          key: screenKey(screen),
          label: screen.label || `Display ${index + 1}`,
          screen,
          selected: true,
          current: screenKey(screen) === screenKey(details.currentScreen)
        }))
      );
      setNotice(`${details.screens.length} display${details.screens.length === 1 ? "" : "s"} detected.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Display access was not granted.");
    }
  };

  const selectedDisplays = useMemo(() => displays.filter((display) => display.selected), [displays]);
  const canStart =
    !loading &&
    (Boolean(settings.enabledModules.clock) ||
      (Boolean(settings.enabledModules.photos) && photos.length > 0) ||
      (Boolean(settings.enabledModules.text) && settings.textMessages.length > 0));

  const start = async () => {
    setError(null);
    setStarting(true);
    const controller = new WakeLockController();
    const sessionId = crypto.randomUUID();
    const seed = crypto.randomUUID();
    const activeDisplays = selectedDisplays.length ? selectedDisplays : [];
    const currentDisplay = activeDisplays.find((display) => display.current);
    const secondary = activeDisplays.filter((display) => !display.current);
    const displayCount = Math.max(1, activeDisplays.length);
    const childWindows: Window[] = [];

    for (let index = 0; index < secondary.length; index += 1) {
      const display = secondary[index];
      const params = new URLSearchParams({
        mode: "display",
        session: sessionId,
        seed,
        display: String(index + 1),
        count: String(displayCount)
      });
      const child = window.open(
        `${window.location.origin}${window.location.pathname}?${params}`,
        `dontsleep-${sessionId}-${index + 1}`,
        `popup=yes,left=${display.screen.availLeft},top=${display.screen.availTop},width=${display.screen.availWidth},height=${display.screen.availHeight}`
      );
      if (child) childWindows.push(child);
    }

    const fullscreenPromise = document.fullscreenElement
      ? Promise.resolve()
      : document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
    try {
      await Promise.all([controller.start(), fullscreenPromise]);
      if (secondary.length > childWindows.length) {
        setNotice("Some display windows were blocked. Use Open another display from the session controls.");
      }
      onStart({
        sessionId,
        seed,
        displayOrdinal: currentDisplay ? activeDisplays.indexOf(currentDisplay) : 0,
        displayCount,
        controller
      });
    } catch (reason) {
      for (const child of childWindows) child.close();
      controller.destroy();
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setError(reason instanceof Error ? reason.message : "The screen wake lock could not be activated.");
    } finally {
      setStarting(false);
    }
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
  };

  const removeOne = async (id: string) => {
    await removePhoto(id);
    setPhotos((current) => current.filter((photo) => photo.id !== id));
    void refreshStorage();
  };

  const clearAll = async () => {
    if (!window.confirm("Remove every image in My pictures from this browser?")) return;
    await clearPhotos();
    setPhotos([]);
    void refreshStorage();
  };

  const addMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = messageInput.trim();
    if (!text) return;
    updateSettings((current) => ({
      ...current,
      enabledModules: { ...current.enabledModules, text: true },
      textMessages: [...current.textMessages, { id: crypto.randomUUID(), text, createdAt: Date.now() }]
    }));
    setMessageInput("");
  };

  const removeMessage = (id: string) => {
    updateSettings((current) => ({
      ...current,
      textMessages: current.textMessages.filter((message) => message.id !== id)
    }));
  };

  return (
    <main className="launcher-shell">
      <header className="hero">
        <div className="brand-mark"><img src={`${import.meta.env.BASE_URL}app-mark.svg`} alt="" /></div>
        <div>
          <p className="eyebrow">Ambient wake display</p>
          <h1>Don’t Sleep</h1>
          <p>Keep this computer awake with a visible, moving fullscreen display.</p>
        </div>
        {installPrompt && <button className="secondary-button install-button" onClick={install}>Install app</button>}
      </header>

      <section className="launcher-grid">
        <div className="panel modules-panel">
          <div className="panel-heading">
            <div><span>01</span><h2>Choose plugins</h2></div>
            <small>Mix any content you want to show</small>
          </div>
          <div className="module-list">
            {slideModules.map((module) => (
              <label className="module-row" key={module.id}>
                <span className={`module-icon module-icon-${module.id}`}>{{ photos: "▧", clock: "◷", text: "T" }[module.id] ?? "•"}</span>
                <span><strong>{module.label}</strong><small>{module.description}</small></span>
                <input
                  type="checkbox"
                  checked={settings.enabledModules[module.id] ?? module.defaultEnabled}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      enabledModules: { ...current.enabledModules, [module.id]: event.target.checked }
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </div>

        <div className="panel display-panel">
          <div className="panel-heading">
            <div><span>02</span><h2>Choose displays</h2></div>
            <small>Chrome and Edge can place windows automatically</small>
          </div>
          {!displays.length ? (
            <button className="detect-button" type="button" onClick={detectDisplays}>
              <span>◎</span><strong>Detect connected displays</strong><small>You’ll approve window placement once</small>
            </button>
          ) : (
            <div className="display-list">
              {displays.map((display) => (
                <label key={display.key}>
                  <span className="monitor-shape">{display.current ? "●" : ""}</span>
                  <span><strong>{display.label}</strong><small>{display.screen.width} × {display.screen.height}{display.current ? " · current" : ""}</small></span>
                  <input
                    type="checkbox"
                    checked={display.selected}
                    onChange={(event) => setDisplays((current) => current.map((item) => item.key === display.key ? { ...item, selected: event.target.checked } : item))}
                  />
                </label>
              ))}
            </div>
          )}
          <p className="display-note">On other browsers, start on this display and use <strong>Open another display</strong> from the session controls.</p>
        </div>
      </section>

      <section className="content-grid">
        <section className="panel messages-panel">
          <div className="panel-heading">
            <div><span>03</span><h2>Text messages</h2></div>
            <small>{settings.textMessages.length} saved locally</small>
          </div>
          <form className="message-form" onSubmit={addMessage}>
            <label htmlFor="message-input">Add a message</label>
            <div>
              <input
                id="message-input"
                value={messageInput}
                maxLength={240}
                placeholder="Keep going — the work is running"
                onChange={(event) => setMessageInput(event.target.value)}
              />
              <button className="secondary-button" type="submit" disabled={!messageInput.trim()}>Add</button>
            </div>
          </form>
          {settings.textMessages.length ? (
            <div className="message-list">
              {settings.textMessages.map((message) => (
                <article key={message.id}>
                  <span>{message.text}</span>
                  <button type="button" onClick={() => removeMessage(message.id)} aria-label={`Remove ${message.text}`}>Remove</button>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-library">Add messages for the Text plugin to rotate through.</p>
          )}
        </section>

        <section className="panel library-panel">
          <div className="panel-heading">
            <div><span>04</span><h2>My pictures</h2></div>
            <small>{storageText}</small>
          </div>
          <div
            className={`drop-zone ${dragging ? "is-dragging" : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); }}
          >
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(event) => event.target.files && void addFiles(event.target.files)} />
            <span className="upload-symbol">＋</span>
            <div><strong>Add private pictures</strong><small>Drop images here or choose files. They never leave this computer.</small></div>
            <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()}>Choose images</button>
          </div>
          {photos.length > 0 && (
            <>
              <div className="photo-grid">{photos.map((photo) => <PhotoCard key={photo.id} photo={photo} onRemove={(id) => void removeOne(id)} />)}</div>
              <button type="button" className="text-button danger" onClick={() => void clearAll()}>Clear My pictures</button>
            </>
          )}
        </section>
      </section>

      {(notice || error) && <div className={`launcher-notice ${error ? "is-error" : ""}`} role="status">{error ?? notice}</div>}

      <footer className="start-bar">
        <div><strong>Ready for an indefinite session</strong><span>Stop manually whenever you return.</span></div>
        <button className="start-button" disabled={!canStart || starting} onClick={() => void start()}>
          <span>{starting ? "Starting…" : "Start"}</span><span className="start-arrow">↗</span>
        </button>
      </footer>
      <p className="burn-in-note">Motion and layout changes reduce static-pixel exposure, but cannot guarantee prevention of LCD image retention or OLED burn-in.</p>
    </main>
  );
}
