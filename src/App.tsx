import { useEffect, useState } from "react";
import { Launcher, type StartedSession } from "./components/Launcher";
import { Slideshow } from "./components/Slideshow";

function displayParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") !== "display") return null;
  const sessionId = params.get("session");
  const seed = params.get("seed");
  if (!sessionId || !seed) return null;
  return {
    sessionId,
    seed,
    displayOrdinal: Number(params.get("display") ?? 0),
    displayCount: Math.max(1, Number(params.get("count") ?? 1))
  };
}

export function App() {
  const externalDisplay = displayParams();
  const [session, setSession] = useState<StartedSession | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const installed = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (externalDisplay) {
    return <Slideshow {...externalDisplay} externalWindow onExit={() => window.close()} />;
  }

  if (session) {
    return <Slideshow {...session} onExit={() => setSession(null)} />;
  }

  return <Launcher installPrompt={installPrompt} onStart={setSession} />;
}
