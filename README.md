# Storyboard Shot Builder v3.8.2.3 — Fixed Lighting Playback + Gestures

This rebuild starts from the working v3.8.1 baseline and re-applies the requested changes cleanly.

Fixed / added:
- Open Lighting Diagram button restored to cyan/teal.
- Camera View camera distance is calculated from both Lens and Shot Size so CU/MCU/MS/WS framing is reflected in the actual camera view.
- Old two-button rotate UI removed.
- One hold-and-drag rotate handle per camera/light/subject.
- Two-finger object rotation on touch devices.
- Camera movement playback in Camera View with Play / Pause / Stop.
- Playback duration uses the linked/current storyboard Shot Duration.
- Supports Static, Pan, Tilt, Dolly, Push/Pull, Tracking, Crane/Jib, Zoom, Orbit, Handheld and Whip Pan previews.
- God View button displays “There is no God...” for 3 seconds.
- No new Supabase SQL required.

Important: this build fixes the JavaScript startup error that caused the previous deployment to show a black page.
