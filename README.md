# Storyboard Shot Builder v3.8.1 — Lighting Character Framing Update

Base: v3.8 Lighting Studio + Camera View.

Added / changed:
- Restored the Open Lighting Diagram button appearance to the same standard solid button style as the earlier version.
- Camera View now auto-frames the nearest subject based on both Lens and Shot Size.
  - Changing from ECU / CU / MCU / MS / MLS / WS / EWS changes how much of the character is visible.
  - Lens still changes field of view, so shot size + lens work together.
- Subjects are now selectable as Female or Male.
  - Female body shape uses relatively wider hips.
  - Male body shape uses relatively broader shoulders.
  - Both are bald.
- 3D subject model is upgraded from a generic mannequin to a more human nude figure with face features and body-shape differences.
  - It remains non-explicit and previsualization-oriented.
- 2D subject icon in the lighting plan is changed to the conventional lighting-diagram style:
  - body ellipse
  - head circle
  - side “∞” nose marker to show facing direction
- Every object in the plan now has on-canvas rotate buttons (↺ / ↻).
- Rotating or changing camera properties keeps Camera View synced.
- No new Supabase SQL is required.
