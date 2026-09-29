# FilmBoard v5.12.0 — Free Cinematic 3D Animatic

This build adds a browser-rendered 3D animatic path that does not call an AI provider and does not consume billing or generation credits. The Runway/Veo studio remains available as a separate optional workflow.

## v5.12.0 changes

- Adds **Cinematic 3D Animatic** to Lighting Diagram with 720p, 1080p and 4K output at 24 or 30 fps.
- Renders the exact camera and character keyframes, linked 3D location, camera lens/sensor framing, fixture positions, modifier behavior, color temperature, intensity and shadows.
- Adds Neutral Cinema, Warm Film, Cool Night, High Contrast and B&W Storyboard looks.
- Burns Depth of Field, temporal Motion Blur, Film Grain and Vignette into the exported video rather than showing them only as interface overlays.
- Supports an optional local dialogue/music file with an adjustable audio level.
- Shows render progress, cancellation, in-app playback, download and Save to Shot.
- Performs rendering locally in the browser: no AI account, billing or credits are required. 4K depends on the device GPU/browser and is best used on desktop.
- Uses unique v5.12 asset filenames: `filmboard-app-v512.js`, `filmboard-styles-v512.css`, `filmboard-i18n-v512.js` and `filmboard-config-v512.js`.
- No new SQL migration is required for v5.12.0; Save to Shot reuses the private project-scoped `ai-video` storage policy from v5.11.

## Previous v5.11.0 changes

This build adds a shared asynchronous video-generation pipeline to Lighting Diagram with selectable **Runway** and **Veo** engines.

## v5.11.0 changes

- Adds **AI Video Studio** to the Lighting Diagram Setup drawer with Runway/Veo provider tabs, model and resolution controls, compiled direction editing, consent confirmation and visible job progress.
- Captures the actual Camera View timeline as a 24 fps 3D control render and captures the exact first frame before submission.
- Freezes an immutable `filmboard-lighting-video-v1` snapshot containing camera, lens, lighting fixtures/modifiers, characters, camera and character keyframes, shot context, virtual location and Bible reference manifest.
- Uses Runway Gen-4 Aleph for control-video guidance and supports Runway Gen-4.5; supports Veo 3.1 Quality and Fast with its 4/6/8-second segment limits.
- Keeps provider keys in the Cloudflare Worker, never in browser code or the GitHub repository.
- Adds queued/submitted/processing/succeeded/failed/canceled job states, polling, provider cancellation where supported, result playback, 3D Guide/AI Result switching, download and **Save to Shot**.
- Stores private inputs and completed MP4 output in the existing project-scoped `storyboards` bucket under `project_id/ai-video/…`.
- Uses unique v5.11 asset filenames: `filmboard-app-v511.js`, `filmboard-styles-v511.css`, `filmboard-i18n-v511.js` and `filmboard-config-v511.js`.
- Requires `supabase-v5.11-ai-video-studio.sql` once after the v5.1 migration.

## Provider secrets

Set these as encrypted Cloudflare Worker secrets; do not put their values in `wrangler.toml`:

```bash
npx wrangler secret put RUNWAY_API_KEY
npx wrangler secret put GOOGLE_AI_API_KEY
```

Optional environment overrides: `RUNWAY_API_BASE`, `RUNWAY_API_VERSION`, and `GOOGLE_AI_API_BASE`.

## Previous v5.10.0 changes

This build adds the requested selected-keyframe deletion, adaptive app themes, stable light settings, clearer project-open feedback and improved desktop/mobile controls.

- Adds a red **Delete Keyframe** action for the currently selected camera or character marker, with a confirmation step.
- Changes the FilmBoard mark and installed-app icons from `FB` to `F`.
- Enlarges the desktop header actions to the same comfortable size as the app's main buttons.
- Fixes light-setting edits so Kelvin, intensity, beam or fixture/modifier changes preserve the light's plan position, height, rotation and tilt—including an exact `0°` tilt.
- Shows an immediate sending state when a project card is opened, then confirms the first successful database response while the rest of the project loads.
- Adds **System**, **Light** and **Dark** theme preferences in Account. System follows the device color scheme and reacts when it changes.
- Makes the Lighting Diagram top toolbar a reliable horizontal touch scroller on mobile, including forced Mobile Version mode.
- Uses unique v5.10 asset filenames: `filmboard-app-v510.js`, `filmboard-styles-v510.css`, `filmboard-i18n-v510.js` and `filmboard-config-v510.js`.
- No new SQL migration is required for v5.10.0.

## v5.9.0 changes

- Replaces query-string cache busting with unique v5.9 asset filenames: `filmboard-app-v590.js`, `filmboard-styles-v590.css`, `filmboard-i18n-v590.js` and `filmboard-config-v590.js`.
- Adds Cloudflare `_headers` rules that keep `index.html` out of the browser cache while safely treating the uniquely named assets as immutable.
- Removes any dependency on the old v5.5–v5.7 Play warning. One saved camera or character pose can play; two points on the same track create movement.
- Verifies that the exact camera/character id, playhead time and pose were inserted before reporting success.
- Verifies that the matching DOM marker exists after Add Keyframe and retries the timeline render if necessary.
- Renders every marker as a large numbered pin with its saved time below it. The marker DOM also carries the saved X/Y position, height and rotation.
- Adds the visible `KF 5.9` badge to the Shot Timeline so the deployed build can be confirmed immediately.
- No new SQL migration is required for v5.9.0; keyframes remain in the existing `lighting_diagrams.data.timeline` JSON.

## v5.8.0 changes

- Fixes the main timeline bug: starting **Explore Location** no longer resets the playhead to 0 seconds. A second pose at a later time is therefore created as a new keyframe instead of overwriting the first one.
- Scrubbing or clicking a marker while Explore is active now loads the saved/interpolated camera and character poses at that exact time.
- A single saved camera or character keyframe is now playable as a held pose; adding a second point on the same track creates visible movement between them.
- Adds a saved-pose panel below the marker lanes showing the exact time, plan X/Z position, height, rotation and camera tilt/lens or character scale.
- Keeps large numbered markers at their exact percentage on the timeline and shows full pose coordinates in each marker tooltip.
- Uses one tested upsert path for camera and character frames so an existing time updates its pose while a different time always creates a new marker.
- The Play button is disabled only when there are no keyframes and becomes available immediately after the first successful save.
- No new SQL migration is required for v5.8.0; the fix uses the existing `lighting_diagrams.data.timeline` JSON.

## v5.7.0 changes

- Fixes the Add Keyframe data-loss bug caused by replacing the timeline object while a pose was being captured.
- Adds larger, numbered Camera and Character markers, per-track keyframe counts, a visible lane playhead and a short save animation.
- Stores the complete camera pose and setup at each point: plan position, height, rotation, tilt, roll, lens, camera model, shot size, angle, movement, focus and height mode.
- Stores the complete character pose at each point: plan position, height, rotation, scale, mannequin/character link and face-placement controls.
- Moving or editing a camera or character exactly at an existing keyframe updates that keyframe. Moving at a new playhead time remains a new pose until **Add Keyframe** is pressed.
- Interpolates camera position, height, orientation and focal length, plus character position, height, orientation, body scale and face controls, during scrub, Play and video export.
- Keeps camera tracks isolated per camera while retaining legacy timeline points for older saved diagrams.
- No new SQL migration is required for v5.7.0; keyframes continue to live in the existing `lighting_diagrams.data.timeline` JSON.

### Keyframe workflow

1. Put the playhead at the first time, pose the camera or character, then press **Add Keyframe**.
2. Drag the shared playhead to a later time and move/rotate/change the height of that camera or character.
3. Press **Add Keyframe** again. A numbered marker appears at the new time.
4. Drag the playhead between markers or press **Play** to preview the interpolated movement.

## v5.6.0 changes

- Camera, light and character settings open directly below the selected item at exactly the same width as its row.
- Clicking the same item a second time closes its settings; choosing another item opens that item's settings without changing canvas-selection behavior.
- Moves the confirmed red **Restart Diagram** action to the end of the Setup drawer.
- Replaces the Camera, Light and Character add labels in both the top toolbar and Setup folders with accessible monochrome line-icon buttons and tooltips.
- Removes the unused desktop Lighting Studio page/toolbar scrolling while preserving the phone toolbar's horizontal swipe behavior and the Setup drawer's own content scroll.
- Increases desktop Setup text by 2 px for clearer camera, light, character and Virtual Location controls.
- No new SQL migration is required for v5.6.0; these changes are entirely in the interface and client-side interaction state.

## v5.5.0 changes

- Adds a visible keyframe area directly below the shared time/playhead bar, with separate Camera and Character lanes.
- Characters can be selected, positioned and keyed at the same shared time as the camera. Playback and video export can contain camera motion, character motion or both.
- Timeline Duration now updates the linked shot's Duration field and is saved with the shot.
- Replaces the Lighting add-button symbols with line icons, renames Add Subject to **Add Character**, and removes Virtual Location from the top toolbar.
- Renames the right drawer to **Setup**.
- Keeps native **Scan with iPhone** disabled until the FilmBoard native scanner exists. Setup now recommends **Scaniverse** on iPhone and Android (export Mesh as GLB), with RealityScan Mobile as an alternative, then imports the exported GLB.
- No new SQL migration is required for v5.5.0. Character keyframes are stored in the existing `lighting_diagrams.data.timeline` JSON.

## v5.4.0 changes

- Moves Zoom Out, zoom percentage, Zoom In and Fit into the 2D diagram window's top bar in both the full Lighting Diagram and Camera View companion.
- Empty space in the top and side/elevation canvases now uses grab/grabbing feedback and pans the active view. Wheel/trackpad zoom and the header buttons act on the last-used pane.
- Camera, light and character settings are mounted directly below the selected item inside its own collapsible drawer folder. There is no separate Properties block at the bottom.
- Replaces the compact camera-spec pills with larger, labeled cards for sensor, active area, recording format, resolution and viewfinder.
- Adds manufacturer-sourced **Bit Depth** and **Dynamic Range** to all 12 camera profiles, with a direct official-specification link in the camera panel. Where a camera separates internal recording from RAW output, the card states both paths.
- No new SQL migration is required for v5.4.0; these changes are UI logic and static camera-profile metadata.

## v5.3.0 changes

- Desktop **Explore** enables W/A/S/D movement, Q/E yaw and R/F height. Keyboard motion is inactive until Explore is selected.
- Adds a per-diagram camera timeline tied to shot duration. Set the playhead, explore or pose the camera, add points, preview interpolation and export the Camera View path as WebM or MP4 when supported by the browser.
- Draws numbered camera-path points in both plan and elevation views.
- Adds a permanent side/elevation view for camera, character and light heights beside the top plan.
- Makes the top plan zoomable in the main workspace and floating Camera View companion. The desktop companion remains draggable and is now resizable; the reset-window button is removed.
- Light beams and camera field-of-view overlays no longer intercept object dragging.
- Adds a Lighting Diagram shortcut to every Storyboard Sheet shot that has a saved diagram.
- Replaces diagram New/Delete controls with a confirmed red **Restart Diagram** action; the drawer starts with the diagram name, then collapsible Camera, Light and Characters folders.
- Removes the Camera Height preset selector while preserving the physical height and tilt controls.
- Adds ARRI ALEXA XT, ALEXA Classic, ALEXA LF and ALEXA Mini; RED EPIC DRAGON and KOMODO 6K; Sony BURANO, PXW-FX9, FX6 and FX3; and Canon EOS C500/C500 Mark II profiles.
- Camera View derives field of view from the selected model's active sensor area, the project aspect ratio and focal length. Brand-specific viewfinder overlays show model, recording format, resolution, lens and timecode while dimming/blurring the area outside the project gate.
- No new SQL migration is required for v5.3.0. Timeline and camera-profile state live in the existing `lighting_diagrams.data` JSON.

## v5.2.0 changes

- Renames the app to **FilmBoard** and uses **FB** for the app, browser and installed-app icons.
- Shows FilmBoard above the active project name in the project editor header.
- Replaces the long shot-section names with **FRAME**, **LIGHT**, **PROPS** and **AUDIO**.
- Removes the separate Subject section. Characters remain selected in Bible references; action can be written in the shot summary or NOTE.
- Moves Transition In and Transition Out to the end of FRAME.
- Moves Props / Set Elements into its own PROPS section.
- Replaces Edit & Notes with a standalone NOTE field after all shot sections.
- New shots start with Time of Day, Light Source, Light Direction and Light Quality set to **Unspecified**.
- Adds a full-width line and spacing whenever the scene changes inside Storyboard Sheet.
- No new SQL migration is required for v5.2.0.

## v5.1.0 changes

- **Camera View + live diagram:** desktop shows the same editable diagram in a movable floating window; mobile uses a vertical split view with a draggable divider.
- The Lighting toolbar is horizontally touch-scrollable on phones.
- Cameras have their own rack. The Objects area is now limited to lights and subjects and has clearer quick-add controls.
- Adds ARRI Orbiter, L7-C Plus and SkyPanel X21 plus Nanlite Forza, PavoSlim and PavoTube fixture profiles, distinct schematic icons, CCT/beam limits and fixture output factors.
- Adds compatible physical optics and modifiers, including Orbiter optics, SkyPanel X21 optics, Nanlite Fresnel/projection optics, parabolic softboxes, lanterns, grids and diffusion. Beam, transmission and softness change the 2D and 3D result.
- Replaces the basic body marker with a clothed, proportioned PBR mannequin and supports placing a Bible character's GLB/USDZ face scan on its head.
- A Virtual Location scan can be linked to a Bible location. A Camera View capture becomes a compact spatial reference image that the AI Worker reads during Bible-reference generation.
- A Bible character can store a private GLB/USDZ face scan. The browser renders an AI-readable portrait from the model and keeps the original model for Camera View.
- Adds the idempotent query `supabase-v5.1-spatial-bible-lighting.sql`; save it in Supabase as **Spatial Bible & Lighting Studio v5.1**.

## v5.0.0 changes

- Adds **Virtual Location** to Lighting Diagram. A project can keep reusable self-contained `.glb` and `.usdz` scans and attach any one of them to a diagram.
- Loads the selected scan inside **Camera View**, while preserving cameras, subjects and practical lights from the lighting plan.
- Adds **Explore Location**: free-look by drag, keyboard movement on desktop, a touch movement pad on mobile, and iPhone Device Orientation through **Phone Look**.
- Keeps exploration non-destructive. The shot camera changes only after **Place Shot Camera Here** is selected.
- Adds scale, rotation, floor and horizontal alignment controls plus a scan footprint in Plan View.
- Stores cloud scans privately in the existing `storyboards` bucket using resumable 6 MB TUS chunks. Local projects store models in IndexedDB instead of localStorage.
- Adds a native bridge contract for an iOS RoomPlan wrapper: `storyboardLocationScanner`, `storyboardVirtualLocationScanCompleted(...)`, and `storyboardVirtualLocationPose(...)`.
- In a normal browser, **Scan with iPhone** accepts the GLB/USDZ exported by a LiDAR scanning app. Direct RoomPlan capture and physical 6DoF translation require the native iOS wrapper; browser mode still provides phone look plus virtual walking.

## v4.9.4 changes

- Keeps the desktop Collaboration dialog at its original 760 px maximum width when Production Dashboard is selected; the dashboard no longer expands the dialog to 1080 px.
- Enforces vertical-only scrolling on the Collaboration card and removes horizontal overflow at the dialog, pane, dashboard, section, grid and card levels.
- Adds inline-size containment and safe wrapping so long locations, cast lists, department items, production flags and Persian text cannot widen the window.
- Preserves the existing mobile layout and the responsive scene cards introduced in v4.9.3.

## v4.9.3 changes

- Expands the Collaboration dialog only while Production Dashboard is selected, up to the available desktop viewport width; Chat and Members keep their normal compact width.
- Replaces the eight-column Scene Breakdown table with responsive scene cards, preserving Scene, Shots, INT/EXT, Location, Story Time, Shoot Time, Conversion, Cast and Production Flags without horizontal scrolling.
- Makes metrics, charts, resource cards, long department items and Persian text wrap safely inside the dashboard.
- Uses two scene-card columns on wide screens and one column on narrower screens and mobile.

## v4.9.2 changes

- Removes required function/tool calling from Script analysis. The models now return compact JSON through their normal text-generation interface, avoiding the Cloudflare rejection that affected both v4.9.1 tool schemas.
- Tries the configured multilingual GLM model first, then automatically tries Cloudflare's multilingual Gemma 4 fallback through an independent request path.
- Adds a deterministic local scene parser as the final safety layer. Even if both Cloudflare text models are unavailable, valid saved scripts receive scene boundaries, INT/EXT, day/night, locations, dialogue-cue characters, line ranges and explicit high-level production flags instead of a failed request.
- Clearly labels local recovery as incomplete production analysis and shows a support code. The result remains reviewable and can be applied, or re-analyzed later for full AI production details.
- Extends `/api/ai/health` with the active Script model, fallback model and `prompt-json-v2` pipeline identifier so deployments can be verified without signing in.

## Production features retained from v4.9.1

- Keeps the compact category/item production schema and expands it into the same Assistant Director and Production Manager dashboard fields in the Worker.
- Keeps the evidence-only production breakdown, exact screenplay line ranges, production-specialty access and role-aware dashboard.
- The former required-tool and compatibility-tool requests are not used in v4.9.2; the new prompt-only model chain and local recovery replace them.

## Included v4.9.0 changes

- Script selected-text size now changes by exactly **1 px on every press**, from 8–72 px, with the live value between − and ＋. Safe size markup persists in Postgres alongside Bold, Underline and writing direction.
- Enlarges the **Visual** and **Script** Bible tabs.
- Moves Aspect Ratio and custom width/height into **Bible → Visual → Project**, beside Project Name, Storyboard Style and Project Details.
- Removes **Upload Final** from character/location cards. **Source Image** remains the optional identity/location guide; Generate produces the final lockable Bible reference.
- Expands AI Script analysis with evidence-only INT/EXT, story/shoot time, Day for Night/Night for Day, script day/unit, cast/background, props, set dressing, wardrobe, makeup/hair, vehicles, animals, stunts, SFX, VFX, sound/music, special equipment, location/permit requirements, safety/security, production notes and risk flags.
- Adds a quick Production Chart Summary under Script analysis and a complete **Collaboration → Production Dashboard**.
- Adds Assistant Director, Production Manager and department views with schedule/time matrices, INT/EXT totals, scene complexity, cast occurrences, resource lists and a scene-by-scene breakdown table.
- Adds a Production Specialty selector when inviting collaborators and on each existing member. The specialty is stored in the existing `project_members.permissions` JSON and controls the member’s default dashboard view.
- Retains the v4.8 Lighting access repair and all earlier image, crop, folder, admin and mobile behavior.

## Existing installation: deployment

v5.10.0 does not add database fields. If the v5.0 and v5.1 migrations already succeeded, do not run another SQL query. Existing hidden Subject fields remain in saved shot data for backward compatibility and are not deleted.

1. If `Storyboard v4.8 - Lighting Access Repair` has not already succeeded, run the packaged v4.8 query once using the saved-query instructions from the prior release. Otherwise leave SQL Editor unchanged.
2. Run `supabase-v5.0-virtual-locations.sql` once if it has not already been run.
3. Run `supabase-v5.1-spatial-bible-lighting.sql` once and save it as **Spatial Bible & Lighting Studio v5.1**.
4. Deploy the repository-root files. Do not upload `node_modules`.
5. Use this Cloudflare build/deploy command:

   ```bash
   npx wrangler deploy
   ```

6. No Supabase Edge Function redeploy is required.
7. Reload the app. Page source must show `filmboard-styles-v510.css`, `filmboard-config-v510.js`, `filmboard-i18n-v510.js`, `filmboard-app-v510.js` and build `v5.10.0-ui-theme-lighting`. The timeline itself shows a `KF 5.10` badge.
8. Open Lighting Diagram, add a camera keyframe at 0 seconds, move the playhead to a later time, enter Explore, change the camera pose and add another keyframe. The time must stay unchanged, both numbered and time-labelled markers must remain visible, and Play must animate between them.

## Fresh Supabase installation

Run and save the packaged queries in this order:

1. `supabase-v4.0-ai.sql`
2. `supabase-v4.1-admin.sql`
3. `supabase-v4.1.1-admin-fix.sql`
4. `supabase-v4.1.3-admin-users-fix.sql`
5. `supabase-v4.1.7-ai-usage-status.sql`
6. `supabase-v4.3-account-score.sql`
7. `supabase-v4.4-image-tools-project-rls-login.sql`
8. `supabase-v4.5-bible-script-breakdown.sql`
9. `supabase-v4.6-project-folders-rich-script.sql`
10. `supabase-v4.7-lighting-image-restore.sql`
11. `supabase-v4.8-lighting-access-repair.sql`
12. `supabase-v5.0-virtual-locations.sql`
13. `supabase-v5.1-spatial-bible-lighting.sql`

Only for the first superadmin, replace the placeholder with the real Storyboard username and run:

```sql
select public.storyboard_grant_first_superadmin('YOUR_APP_USERNAME');
```

For a fresh installation, deploy `supabase/functions/username-login/index.ts` from **Supabase → Edge Functions → username-login**, with **Verify JWT OFF**, before deploying the app.

## Virtual Location workflow

1. At the filming location, use **Scaniverse** on iPhone or Android, choose Mesh rather than Gaussian Splat, and export one self-contained `.glb` file (maximum 250 MB). RealityScan Mobile is also listed as an alternative.
2. Open the project, choose **Lighting Diagram → Setup → Virtual Location**, and select **Import Scan**. **Scan with iPhone** remains disabled until the native FilmBoard scanner is released.
3. Attach the scan to the current diagram, align its scale, rotation, floor and horizontal position, then save the diagram.
4. Open **Camera View → Explore**. On desktop use W/A/S/D to move, Q/E to rotate and R/F to change height; on mobile use the touch arrows and **Phone Look**.
5. Exploration does not move the shot camera. Select **Place Shot Camera Here** only when the explored viewpoint should become the diagram's active camera.
6. In **Bible Connection**, choose the matching Bible location, select **Link Scan**, then frame the useful view and select **Capture Camera View for AI**.

## Shared camera and character timeline workflow

1. Set Duration to the shot length; the same value is written to the linked shot.
2. Move the shared playhead to the first time, pose the camera and choose **Add Keyframe** in the Camera lane.
3. Choose a character in the Character lane, move it in the top or elevation view and add a character keyframe at that same shared time.
4. Move the playhead, reposition either track and add more keyframes. For example, the camera can descend from overhead while the character crosses the set during the same seven seconds.
5. Select **Play** to preview both interpolated paths. Numbered camera and character points appear in the top and side views.
6. Select **Export Video** in Camera View to download a WebM or MP4 preview of the complete shot motion, depending on browser support.

See [CAMERA-SPECS.md](CAMERA-SPECS.md) for the sensor areas and official manufacturer references used by the camera profiles.

## 3D face workflow

1. Create or open a character under **Bible → Visual → Characters**.
2. Under **3D Face Scan**, import one self-contained GLB or USDZ face scan (maximum 250 MB).
3. The app stores the private model, renders a compact AI view, and unlocks any stale generated reference for review.
4. In Lighting Diagram, select a subject and choose that Bible character under **Bible Character / 3D Face**. Use Face Scale, Turn and Height for alignment.
5. Generate and lock the updated Bible character reference. The Worker uses the rendered scan view as identity geometry guidance.

The browser displays the stored scan rather than the user's current camera feed. Direct RoomPlan capture and physical 6DoF tracking are exposed through the documented native iOS bridge; Safari uses sensor-based look plus virtual movement and imports the file exported by the scanning app.

## Script workflow

1. Open **Bible**, then select the **Script** tab.
2. Choose LTR for English or RTL for Persian, then choose one of the listed text formats or paste the screenplay into the editor. Select text and use **B**, **U**, **−**, the displayed pixel size and **＋**. Each −/＋ press changes exactly 1 px.
3. Save, then select **Analyze with AI**.
4. Review the detected scenes, cast, locations, INT/EXT, story/shoot times, conversions, department elements and line ranges.
5. Select **Apply Breakdown to Project**. Existing locked Bible references remain untouched. New entries are unlocked; optionally add a Source Image, then Generate, review and Lock.
6. Select any exact text range. Choose a Scene and Shot and press **Link to Shot**, or press **Create Shot from Selection**.
7. Use the line-by-line Script Reference Map to find linked or unlinked screenplay lines.
8. Open **Collaboration → Production Dashboard**. Select Assistant Director, Production Manager or a department view. Assign each collaborator’s Production Specialty under Members & Access.

Plain Script text, safe Bold/Underline/font-size markup, writing direction, AI analysis and shot-link offsets are stored in Postgres. The uploaded source file itself is not stored as a second binary object; supported files are converted to editable text in the browser and that text is saved.

## Scene time semantics

- **Story Time** is what the finished film must look like.
- **Shooting Time** is the planned real production time.
- **Day for Night** tells image generation to preserve a convincing night result while accounting for daytime capture, including darkened/covered windows and suppressed daylight.
- **Night for Day** does the inverse and motivates a convincing daytime result from night capture.

## What is sent to FLUX for a shot

The browser sends project/scene/shot IDs and the current shot snapshot. The Worker validates the Supabase token, re-reads the project, Scene Settings and approved Bible records under RLS, and constructs the final prompt. It sends:

- exact output width/height derived from Project Aspect Ratio;
- Project Name and Storyboard Style;
- Scene title, description, location, Story Time, Shooting Time and conversion strategy;
- shot number, duration and one-line summary;
- subject, action, performance/emotion, movement and costume;
- Shot Size with strict crop and screen-occupancy rules;
- Camera Angle, Lens perspective and Focus / Depth of Field;
- camera movement, composition and start-frame → end-frame intent;
- time, shot-location detail, lighting, props and notes;
- dialogue, voice-over, SFX, music and transitions as non-printed context;
- one locked location plus up to three locked character references.

FLUX receives `prompt`, exact `width`, exact `height`, `guidance=5.5` and `input_image_0...n`. For CU/MCU/ECU/OTS/Insert with a character, character references come first and the wide location plate last; for wider shots, the location remains first. The model is still probabilistic, so no text-to-image model can guarantee camera grammar on every attempt, but the prompt now makes framing the first composition priority and rejects full-body results for close framing.

## Image and storage behavior

- Postgres stores media paths and metadata, not image binaries.
- Private images live in the Supabase Storage `storyboards` bucket.
- A shot keeps its current image path. After the first Crop it also keeps one original path until the user restores it or replaces/removes/generates a new shot image. Storyboard Sheet always uses the current image.
- Generated/manual shot images are optimized to at most 1024 px before storage.
- Bible source and generated final references are optimized to at most 496 px.
- Crop is opened only from the enlarged image viewer, uses the Project Aspect Ratio and preserves the pre-crop original. Repeated crops replace only the prior cropped object. Restore Original switches back atomically, then removes the cropped object.
- Source Image guides character/location generation; the generated reference is the lockable final Bible image.
- Signed URLs are refreshed; immutable storage caching keeps repeat loading fast.

## Validation

```bash
npm install
npm run check
npx wrangler deploy --dry-run
```

Automated checks cover HTML identity, Admin access, repaired Lighting RLS/persistence, reversible shot crops, exact Script range links, 1 px Script font sizing, production schema normalization, role-aware dashboards, specialty persistence, folder navigation, mobile project controls, strict framing prompts, reference ordering, JWT guards and authenticated multipart generation.

## Current limits

- Bible and AI features require a signed-in cloud project and the relevant project permission.
- Browser-based Virtual Location supports phone rotation plus virtual walking. Native RoomPlan capture is intentionally disabled until the FilmBoard mobile scanner ships; import GLB from Scaniverse or RealityScan Mobile in the meantime.
- AI image models consume rendered 2D views of 3D scans, not raw GLB/USDZ geometry. The original 3D assets remain available to Camera View while the captured/rendered spatial image guides Bible generation.
- Virtual Location walkthrough currently has no collision mesh, so the user can move through scanned walls when navigating manually.
- Script analysis is evidence-based but still requires user review before applying.
- One location is required for shot generation; up to three recurring character references are supported.
- Reference guidance improves continuity but cannot guarantee pixel-identical characters or sets in every pose and viewpoint.
- Cancel stops the browser request; an inference already accepted upstream may still count toward the daily allowance.
