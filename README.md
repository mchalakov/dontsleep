# Don’t Sleep

Don’t Sleep is a browser-only PWA that holds a screen wake lock while a visible, animated fullscreen display runs. It is designed for unattended development sessions where tools such as Codex or Claude Code need the computer to remain awake.

## What it does

- Requests the standards-based `screen` wake lock only while the display session is visible.
- Provides Picture, Clock, and Text plugins with burn-in-conscious motion.
- Stores personal pictures and custom messages only in IndexedDB on the current browser profile.
- Keeps the application shell available offline.
- Coordinates varied plugin content across display windows through `BroadcastChannel`.
- Uses Chromium Window Management for enhanced multi-display placement and offers a manual fallback elsewhere.

This reduces static-pixel exposure but cannot guarantee prevention of LCD image retention or OLED burn-in. It is also not an OS-level background sleep inhibitor: closing or hiding every display window removes the browser’s protection.

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

## Multi-display use

In Chrome or Edge, choose **Detect connected displays**, approve window-management access, select the displays, and press **Start**. Secondary windows request their own wake lock and ask for a click if fullscreen activation is still required.

In browsers without Window Management, start normally, reveal the controls by moving the pointer, choose **Open another display**, move that window to the other monitor, and activate fullscreen there.

## Privacy and deployment

There is no backend, authentication, analytics, upload, company branding, or external runtime API. The static build is deployed to GitHub Pages without environment variables. Clearing browser site data also removes personal pictures, text messages, and saved settings.

The production site is available at `https://mchalakov.github.io/dontsleep/`. Pushes to `main` are validated, built with the `/dontsleep/` base path, and deployed by GitHub Actions.
