# Storyboard Shot Builder v4.6.0

This build continues only from the user-approved `storyboard-v3.9.1-github(1).zip` lineage. It includes every accepted change through v4.5 and adds account folders, unified image crop and bilingual rich Script editing.

## v4.6.0 changes

- Keeps the desktop Bible, Storyboard Style and AI usage controls inside the sidebar width.
- Restores the Storyboard Generate button as a full-width horizontal control.
- Removes every separate Crop button and the separate Crop modal. Crop is available only inside the enlarged image viewer and is applied there.
- Uses the Project Aspect Ratio for every crop output while the normal viewer still follows the source image's natural ratio.
- Adds Script writing direction controls for English LTR and Persian RTL plus persistent selected-text Bold formatting.
- Removes the arrow beside the sidebar Bible button.
- Replaces the desktop header and mobile three-dot menu with Storyboard Sheet, Chat & Collaborate, Bible and Project Settings; a divider separates Projects, Account and Log Out.
- Keeps All Projects and All Folders side by side on phone screens.
- Adds real per-account folders, including create, rename and delete, plus moving any accessible project between a folder and General. A shared project's folder is private to the organizing user.

## Existing installation: required deployment order

Do not delete earlier saved SQL queries. v4.6 is an additive migration.

1. Open the correct project at [Supabase Dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor** and click **New query**.
3. Name it exactly:

   `Storyboard v4.6 - Project Folders & Rich Script`

4. Keep **Save query: YES**.
5. Paste the complete contents of `supabase-v4.6-project-folders-rich-script.sql` and press **Run** once.
6. Wait for **Success. No rows returned**. The query is safe to run again and does not delete existing project data or media.
7. Deploy the repository-root files. Do not upload `node_modules`.
8. Use this Cloudflare build/deploy command:

   ```bash
   npx wrangler deploy
   ```

9. No `username-login` Edge Function redeploy is required for v4.6; that function is unchanged.
10. Hard-refresh the app. Page source should show `styles.css?v=460`, `config.js?v=460`, `i18n.js?v=460`, `app.js?v=460` and build `v4.6.0-folders-inline-crop-rich-script`.
11. Sign out and back in. Test Projects → New Folder, then open a project and test the image viewer Crop and Bible → Script direction/Bold controls.

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

Only for the first superadmin, replace the placeholder with the real Storyboard username and run:

```sql
select public.storyboard_grant_first_superadmin('YOUR_APP_USERNAME');
```

For a fresh installation, deploy `supabase/functions/username-login/index.ts` from **Supabase → Edge Functions → username-login**, with **Verify JWT OFF**, before deploying the app.

## Script workflow

1. Open **Bible → Script**.
2. Choose LTR for English or RTL for Persian, then choose one of the listed text formats or paste the screenplay into the editor. Select text and press **Bold** when needed.
3. Save, then select **Analyze with AI**.
4. Review the detected scene count, characters, locations, story/shoot times and line ranges.
5. Select **Apply Breakdown to Project**. Existing locked Bible references remain untouched. New entries are unlocked and ready for Generate/Upload, review and Lock.
6. Select any exact text range. Choose a Scene and Shot and press **Link to Shot**, or press **Create Shot from Selection**.
7. Use the line-by-line Script Reference Map to find linked or unlinked screenplay lines.

Plain Script text, safe Bold markup, writing direction, AI analysis and shot-link offsets are stored in Postgres. The uploaded source file itself is not stored as a second binary object; supported files are converted to editable text in the browser and that text is saved.

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
- A shot keeps only its current image path; Storyboard Sheet uses that same image.
- Generated/manual shot images are optimized to at most 1024 px before storage.
- Bible source and final references are optimized to at most 496 px.
- Crop is opened only from the enlarged image viewer, uses the Project Aspect Ratio, uploads the new object and updates the row before removing the previous object.
- Source Image and Upload Final are independent.
- Signed URLs are refreshed; immutable storage caching keeps repeat loading fast.

## Validation

```bash
npm install
npm run check
npx wrangler deploy --dry-run
```

Automated checks cover HTML identity, Admin access, Bible media persistence, exact Script range links, rich Script direction/Bold controls, per-user folder RLS, mobile project filters, the unified aspect-locked crop viewer, strict framing prompts, reference ordering, JWT guards and authenticated multipart generation.

## Current limits

- Bible and AI features require a signed-in cloud project and the relevant project permission.
- Script analysis is evidence-based but still requires user review before applying.
- One location is required for shot generation; up to three recurring character references are supported.
- Reference guidance improves continuity but cannot guarantee pixel-identical characters or sets in every pose and viewpoint.
- Cancel stops the browser request; an inference already accepted upstream may still count toward the daily allowance.
