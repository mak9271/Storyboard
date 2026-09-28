# Storyboard Shot Builder v5.1.0 — Lighting Companion & Spatial Bible

This build extends the reusable 3D-location workflow with a live editable lighting companion, manufacturer-aware fixtures and modifiers, realistic mannequins, 3D face scans and Spatial Bible links.

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

v5.1.0 requires the v5.0 Virtual Location migration plus one new additive Spatial Bible migration. Existing shots, diagrams and media are not rewritten.

1. If `Storyboard v4.8 - Lighting Access Repair` has not already succeeded, run the packaged v4.8 query once using the saved-query instructions from the prior release. Otherwise leave SQL Editor unchanged.
2. Run `supabase-v5.0-virtual-locations.sql` once if it has not already been run.
3. Run `supabase-v5.1-spatial-bible-lighting.sql` once and save it as **Spatial Bible & Lighting Studio v5.1**.
4. Deploy the repository-root files. Do not upload `node_modules`.
5. Use this Cloudflare build/deploy command:

   ```bash
   npx wrangler deploy
   ```

6. No Supabase Edge Function redeploy is required.
7. Hard-refresh the app. Page source should show `styles.css?v=510`, `config.js?v=510`, `i18n.js?v=510`, `app.js?v=510` and build `v5.1.0-lighting-spatial-bible`.
8. Open Lighting Diagram → Virtual Location, import one GLB/USDZ file, save the diagram, then open Camera View and test the live diagram companion and Explore Location.

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

1. At the filming location, capture the space with an iPhone LiDAR scanner and export one self-contained `.glb` or `.usdz` file (maximum 250 MB).
2. Open the project, choose **Lighting Diagram → Virtual Location**, and select **Import Scan** or **Scan with iPhone**.
3. Attach the scan to the current diagram, align its scale, rotation, floor and horizontal position, then save the diagram.
4. Open **Camera View → Explore Location**. Drag to look around, use W/A/S/D on desktop or the touch arrows on mobile, and enable **Phone Look** to aim the virtual view by rotating the iPhone.
5. Exploration does not move the shot camera. Select **Place Shot Camera Here** only when the explored viewpoint should become the diagram's active camera.
6. In **Bible Connection**, choose the matching Bible location, select **Link Scan**, then frame the useful view and select **Capture Camera View for AI**.

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
- Browser-based Virtual Location supports phone rotation plus virtual walking. Direct RoomPlan capture and translation from the iPhone's physical movement require the native iOS wrapper.
- AI image models consume rendered 2D views of 3D scans, not raw GLB/USDZ geometry. The original 3D assets remain available to Camera View while the captured/rendered spatial image guides Bible generation.
- Virtual Location walkthrough currently has no collision mesh, so the user can move through scanned walls when navigating manually.
- Script analysis is evidence-based but still requires user review before applying.
- One location is required for shot generation; up to three recurring character references are supported.
- Reference guidance improves continuity but cannot guarantee pixel-identical characters or sets in every pose and viewpoint.
- Cancel stops the browser request; an inference already accepted upstream may still count toward the daily allowance.
