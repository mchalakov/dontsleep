# Don’t Sleep

Don’t Sleep is a browser-only PWA that holds a screen wake lock while a visible, animated fullscreen slideshow runs. It is designed for unattended development sessions where tools such as Codex or Claude Code need the computer to remain awake.

## What it does

- Requests the standards-based `screen` wake lock only while the slideshow is visible.
- Runs a dark, moving photo-and-clock presentation with no fixed watermark.
- Stores personal photos only in IndexedDB on the current browser profile.
- Keeps approved starter media and the application shell available offline.
- Coordinates varied slides across display windows through `BroadcastChannel`.
- Uses Chromium Window Management for enhanced multi-display placement and offers a manual fallback elsewhere.

This reduces static-pixel exposure but cannot guarantee prevention of LCD image retention or OLED burn-in. It is also not an OS-level background sleep inhibitor: closing or hiding every slideshow window removes the browser’s protection.

## Local development

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. HTTPS is required in production; localhost is treated as a secure development context.

Validation:

```powershell
npm run check
npm run test:e2e
```

## Approved starter media

No existing workspace imagery is copied automatically.

1. Put approved originals in `src/assets/starter/`.
2. Add an entry to `src/content/starter-media.ts`:

```ts
{
  id: "company-logo",
  sourceFile: "company-logo.svg",
  description: "Company logo",
  kind: "logo"
}
```

Raster sources are autorotated, constrained to 3840×3840, and emitted as WebP at build time. SVG files are copied unchanged. Sources remain untouched, unregistered files are not shipped, each source is limited to 20 MiB, and the optimized offline pack is limited to 30 MiB.

## Multi-display use

In Chrome or Edge, choose **Detect connected displays**, approve window-management access, select the displays, and start the slideshow. Secondary windows request their own wake lock and ask for a click if fullscreen activation is still required.

In browsers without Window Management, start normally, reveal the controls by moving the pointer, choose **Open another display**, move that window to the other monitor, and activate fullscreen there.

## Privacy and deployment

There is no backend, authentication, analytics, upload, or external runtime API. The static build can be deployed directly to Vercel without environment variables. Clearing browser site data also removes personal photos and saved settings.
