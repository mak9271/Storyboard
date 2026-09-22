# Storyboard Shot Builder v4.9.0

This build continues only from the user-approved `storyboard-v3.9.1-github(1).zip` lineage. It includes every accepted change through v4.8 and adds the role-aware screenplay production breakdown requested for collaboration.

## v4.9.0 changes

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

**No new SQL query is required for v4.9.0. Do not create or run a v4.9 SQL query.** Production specialties reuse the existing JSON permissions column, and production charts are stored inside the existing Script analysis JSON.

1. If `Storyboard v4.8 - Lighting Access Repair` has not already succeeded, run the packaged v4.8 query once using the saved-query instructions from the prior release. Otherwise leave SQL Editor unchanged.
2. Deploy the repository-root files. Do not upload `node_modules`.
3. Use this Cloudflare build/deploy command:

   ```bash
   npx wrangler deploy
   ```

4. No Supabase Edge Function redeploy is required.
5. Hard-refresh the app. Page source should show `styles.css?v=490`, `config.js?v=490`, `i18n.js?v=490`, `app.js?v=490` and build `v4.9.0-production-breakdown-dashboard`.
6. Open Bible → Script and re-run **Analyze with AI** for existing scripts; older saved analyses remain readable but do not contain the new production fields.
7. Test repeated font-size presses, Bible Aspect Ratio, character/location Source Image generation and Collaboration → Production Dashboard.

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

Only for the first superadmin, replace the placeholder with the real Storyboard username and run:

```sql
select public.storyboard_grant_first_superadmin('YOUR_APP_USERNAME');
```

For a fresh installation, deploy `supabase/functions/username-login/index.ts` from **Supabase → Edge Functions → username-login**, with **Verify JWT OFF**, before deploying the app.

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
- Script analysis is evidence-based but still requires user review before applying.
- One location is required for shot generation; up to three recurring character references are supported.
- Reference guidance improves continuity but cannot guarantee pixel-identical characters or sets in every pose and viewpoint.
- Cancel stops the browser request; an inference already accepted upstream may still count toward the daily allowance.
