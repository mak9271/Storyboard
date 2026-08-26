# Storyboard Shot Builder v3.8.2 — Lighting Playback + Gestures

Base: v3.8.1 Lighting Character Framing.

Changes:
- Restored the **Open Lighting Diagram** button to the earlier green-cyan highlight style.
- Improved **Camera View framing** so camera distance responds more aggressively to shot size (ECU / CU / MCU / MS / MLS / WS / EWS), making the visible crop match the selected shot size more closely.
- Removed the old rotate click buttons and replaced them with a **single hold-and-drag rotate handle** on each lighting object.
- Added **two-finger rotation on mobile** for rotating the selected lighting object directly on the diagram.
- Added **movement playback controls** in Camera View:
  - Play
  - Pause
  - Stop / reset
- Movement preview now animates the active camera live in Camera View, based on:
  - the camera movement type
  - the linked shot duration (or current shot duration)
- Supported preview movement styles include: pan, tilt, dolly, push/pull, tracking, crane/jib, zoom, orbit, handheld, and whip pan.
- Added **God View** button next to Camera View.
  - Clicking it shows the centered message: **“There is no God...”**
  - The message fades automatically after 3 seconds.

No new Supabase SQL is required for this update.
