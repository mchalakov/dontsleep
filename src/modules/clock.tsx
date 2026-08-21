import { useEffect, useMemo, useState } from "react";
import type { SlideDescriptor } from "../lib/scheduler";
import type { SlideModule, SlideRenderProps } from "./types";

interface ClockPayload {
  variant: number;
}

function ClockRenderer({ slide, displayOrdinal }: SlideRenderProps) {
  const payload = slide.payload as ClockPayload;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const locale = navigator.language || "en-US";
  const time = useMemo(
    () => now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale, now]
  );
  const seconds = now.toLocaleTimeString(locale, { second: "2-digit" }).slice(-2);
  const date = now.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
  const zone = (payload.variant + displayOrdinal + Math.floor(now.getTime() / 30_000)) % 8;
  return (
    <section className={`clock-slide clock-zone-${zone}`} aria-label={`${time}, ${date}`}>
      <div className="clock-time">
        {time}<span>{seconds}</span>
      </div>
      <div className="clock-date">{date}</div>
    </section>
  );
}

export const clockModule: SlideModule = {
  id: "clock",
  label: "Clock",
  description: "A large clock and date that move between safe zones.",
  defaultEnabled: true,
  settingsSchema: {},
  buildSlides: () =>
    Array.from({ length: 4 }, (_, variant): SlideDescriptor<ClockPayload> => ({
      id: `clock-${variant}`,
      moduleId: "clock",
      kind: "clock",
      durationMs: 24_000,
      payload: { variant }
    })),
  Renderer: ClockRenderer
};
