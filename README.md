# Storyboard Shot Builder v3.8 — Lighting Studio + Camera View

Base: v3.7 Lighting Diagram, preserving all v3.6.1 collaboration/chat features.

What changed:
- Lighting Diagram is now a true full-screen workspace.
- The diagram has no permanent app menu; only floating Add Camera, Add Subject, Add Light, Shot Light, Diagram/Camera View, Back and Save controls.
- A right-side Objects & Properties bar lists every camera, light and subject as grouped sub-items.
- Click the bar header to fold/unfold it.
- Clicking an object on the plan or in the bar selects it and shows its properties.
- Light types are presented as grouped visual icon tiles inspired by NANLINK's intuitive grouped Light Plot approach (not a copied interface).
- Fixture set: Fresnel, COB Spot, PAR, Projection, LED Panel, Softbox, Lantern, Tube, Practical Bulb, Window, Candle.
- Modifier/diffusion set: 251 Quarter Diffusion, 250 Half Diffusion, 216 Full Diffusion, Opal, Hampshire Frost, Light Grid Cloth, Grid Cloth, Magic Cloth, Silk, Muslin Bounce.
- Camera View adds a real 3D WebGL view through the selected camera.
- Subjects appear as simple 3D mannequin characters.
- Kelvin, intensity, beam angle and modifier influence the 3D lighting approximation.
- Move the camera in Camera View with W/A/S/D, Q/E, and drag to pan/tilt.
- Lens, shot size, angle, camera height, movement and focus remain editable and sync to Camera View.
- Multiple cameras are supported; use "Use this Camera View" for the selected camera.
- Existing diagram save, realtime collaboration, share link, and PNG/SVG/JSON export remain.

Supabase:
- No new SQL is required if v3.7 Lighting Diagram SQL has already been run.

3D dependency:
- Camera View lazy-loads Three.js from jsDelivr when Camera View is opened.
- If it cannot load, the 2D diagram remains fully usable.
