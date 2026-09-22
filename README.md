# Storyboard Shot Builder v4.4.0

This build continues only from the user-approved `storyboard-v3.9.1-github(1).zip` lineage. It preserves the editor, collaboration, Admin Center, Lighting Studio, AI Visual Bible, bilingual UI, mobile app layout, account profile and creator score added along that line.

## v4.4.0 changes

- Fixes `new row violates row-level security policy for table "projects"` with explicit owner policies for projects, scenes and shots.
- Adds a separate optional Source Image to every Visual Bible character and location. Source and finished reference files are independent; generating, locking or cropping one does not erase the other.
- Uses the Source Image as the primary FLUX image input when generating a character/location reference.
- Adds full-size click/tap preview for shot images, Visual Bible source/final images and Storyboard Sheet images.
- Adds an aspect-preserving crop editor for generated and manually uploaded shot images and for Visual Bible source/final images.
- Makes mobile Primary Settings open the requested native selector on the first tap.
- Requires signup/recovery passwords with at least eight characters, one lowercase letter, one uppercase letter and one symbol, with a specific warning for the missing rule.
- Reduces the signup username hint to `3–30 characters`.
- Removes Camera Height from shot data, the shot form and the FLUX prompt. Lighting Studio keeps its own physical 3D camera-height control because it is part of lighting-plan geometry, not the shot-generation field.
- Promotes Manage Visual Bible to a large mobile-friendly project button and groups Storyboard Style with that area.
- Enlarges mobile headings and the Scenes / Prev / Shot / Next / Sheet navigation.
- Shows only the scene number above the large shot number.
- Adds shot Copy and Paste beside the scene-level shot ＋ and − controls, while shot movement remains only in the scene list.
- Fixes Duplicate Shot by using integer database positions instead of fractional values such as `10.5`.
- Strengthens the FLUX prompt with early and repeated, explicit rules for shot size, camera angle, lens perspective, depth of field and a single full-bleed canvas.
- Makes username sign-in retry one transient Edge Function failure and returns useful messages for temporary availability and rate-limit errors.

## Important deployment order for an existing installation

Do not delete earlier saved SQL queries. Run the new database patch before uploading the v4.4 web files.

1. Open the correct project at [Supabase Dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor** and click **New query**.
3. Set the query name exactly to:

   `Storyboard v4.4 - Image Tools, Project RLS & Login Reliability`

4. Keep **Save query enabled: YES**.
5. Paste all of `supabase-v4.4-image-tools-project-rls-login.sql` and click **Run** once. Wait for `Success. No rows returned`.
6. Open **Edge Functions → username-login → Code**. Replace its code with `supabase/functions/username-login/index.ts`, deploy it, and keep **Verify JWT disabled/OFF** because the function performs the password sign-in before a JWT exists.
7. Replace the repository-root files with this package. Do not upload `node_modules`.
8. In Cloudflare use this build/deploy command:

   ```bash
   npx wrangler deploy
   ```

9. After deployment, hard-refresh the app. Page source should show `styles.css?v=440`, `config.js?v=440`, `i18n.js?v=440`, `app.js?v=440` and build `v4.4.0-image-crop-source-guidance`.
10. Sign out and back in, create a small test project, open Visual Bible, add a source image, generate a reference, crop it, lock it and generate one shot.

The v4.4 SQL is idempotent: it can be run again. It does not delete projects, users, references, scores or login history.

## Fresh Supabase installation

Run the packaged queries in this order, saving each with the descriptive name in its header:

1. `supabase-v4.0-ai.sql`
2. `supabase-v4.1-admin.sql`
3. `supabase-v4.1.1-admin-fix.sql`
4. `supabase-v4.1.3-admin-users-fix.sql`
5. `supabase-v4.1.7-ai-usage-status.sql`
6. `supabase-v4.3-account-score.sql`
7. `supabase-v4.4-image-tools-project-rls-login.sql`

Only for the first superadmin, replace the placeholder with the actual Storyboard username and run:

```sql
select public.storyboard_grant_first_superadmin('YOUR_APP_USERNAME');
```

Then deploy the `username-login` Edge Function with Verify JWT OFF before deploying the app.

## What is sent to FLUX for a shot

The browser sends the current IDs and a whitelisted snapshot of the shot to the Worker. The Worker validates the Supabase access token, re-reads the project, scene and approved Visual Bible records under RLS, and constructs the final prompt. No unrestricted user-authored final prompt is accepted.

The generated request contains:

- exact output width and height derived from Project Aspect Ratio;
- project name and Storyboard Style;
- scene title and scene description;
- shot number, duration and one-line summary;
- main subject, detailed action, performance/emotion, subject movement and costume/appearance;
- Shot Size with explicit crop semantics such as CU = face/head-and-shoulders, never full body;
- Camera Angle with explicit viewpoint semantics such as Low Angle = camera clearly below and looking upward;
- Lens with focal-length perspective behavior;
- Focus / Depth of Field;
- camera movement, composition and start-frame → end-frame intention;
- time of day and shot-specific notes inside the selected location;
- light source, direction, quality, lighting notes, props/set elements and important notes;
- dialogue, voice-over, SFX, music and incoming/outgoing transitions as contextual instructions that must not be printed in the image;
- one locked location reference first, then up to three locked character references.

FLUX receives `prompt`, exact `width`, exact `height`, `guidance=4` and `input_image_0...n`. Cloudflare documents Guidance as the prompt-adherence control. Shot Size, Angle and Lens are still model instructions rather than deterministic camera parameters in the API, so the model remains probabilistic. v4.4 places those constraints at the beginning of the prompt, translates abbreviations into concrete framing rules, uses moderate guidance and repeats a final camera check. This materially improves adherence but cannot guarantee every generation; regenerate or crop an occasional miss.

## Image and storage behavior

- Postgres stores paths and metadata, not the image binary.
- Private image files live in the existing Supabase Storage `storyboards` bucket.
- A shot keeps only its current image path. Storyboard Sheet uses that same image.
- Generated/manual shot images are optimized to at most 1024 px before storage.
- Visual Bible source and final reference images are optimized to at most 496 px for reference-input compatibility.
- Replacement is safe: the new file is uploaded and linked first; the previous file is removed afterward.
- Source Image and Upload Final are separate. Removing Source never removes the finished reference.
- Cropping creates a new optimized file, updates the row and then removes the prior file.
- Signed display URLs expire and are refreshed; cached immutable storage objects keep repeat loading fast.

## AI continuity flow

1. Create a character/location with a stable written description.
2. Optionally add and crop a Source Image.
3. Generate from Source, or upload a finished reference directly.
4. Review/crop the final reference and press Lock.
5. Select one project location and the relevant characters on each shot.
6. Generate the shot. The Worker sends the locked location first and locked characters after it.

Changing Storyboard Style invalidates style continuity until the affected final references are reviewed/regenerated and locked for the new style.

## Password recovery and username login

In Supabase **Authentication → URL Configuration**:

- Site URL: `https://storyboard.mak9271.workers.dev`
- Redirect URL: `https://storyboard.mak9271.workers.dev/`

After changing redirect settings, request a fresh reset email; old recovery links may be expired or already consumed.

The public `username-login` Edge Function uses the Supabase service-role secret only inside Supabase's server environment. It applies an atomic per-IP-plus-username rate limit and never exposes that secret to the browser, Worker repository or response.

## Validation

```bash
npm install
npm run check
npx wrangler deploy --dry-run
```

Automated checks cover HTML IDs, Admin Center security, source/final image persistence, crop/preview wiring, project-creation RLS, username login rate limiting and retry, password policy, mobile first-tap selectors, large mobile navigation, integer shot duplication, camera constraint prompts, aspect dimensions, JWT guards and locked-reference multipart generation.

## Current limits

- AI generation is cloud-only and requires project media permission.
- One location is required for each generated shot; up to three recurring character references are supported.
- Reference guidance improves identity/location consistency but no generative model guarantees pixel-identical people or sets in every pose and viewpoint.
- Cancel stops the browser request; an inference already accepted upstream may still count toward the daily allowance.
- Run a 15–20 shot pilot with real project descriptions before changing quotas or the production model.
