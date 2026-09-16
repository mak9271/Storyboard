# Storyboard Shot Builder v4.3.2 — Contextual Generation Dialog

Base: **only** `storyboard-v3.9.1-github(1).zip`, as requested. All v3.9.1 editor, collaboration, scene-delete and Lighting Studio behavior is preserved.

v4.1.2 excluded `node_modules` and other repository-only files from Static Assets so Cloudflare does not attempt to upload the 148 MiB `workerd` binary.

v4.1.3 fixes Admin Center RPC return types, lists accounts from `auth.users` even when a profile is incomplete, keeps Admin Center open across tab focus/session events and page reloads, and places each shot's required location plus optional characters beside its primary settings.

v4.1.4 fixes a UI bug that immediately erased Visual Bible generation progress and errors. Each character/location card now keeps its own generating, success or exact error message beside the clicked button, uses a visible animated state, validates that the server actually returned an image, and stops a stalled request after three minutes.

v4.1.5 aligns the Worker request with Cloudflare's FLUX.2 Klein binding contract: multipart is sent as a `ReadableStream` with its generated boundary, the unsupported `output_format` field is removed, reference images are named `input_image_0` through `input_image_3`, and stored Visual Bible references are resized below the model's 512×512 input limit.

v4.1.6 fixes Visual Bible previews disappearing after another reference is generated or an item is locked. Realtime project reloads now preserve an unchanged reference's signed preview URL, rebuild any missing signed URLs while the Visual Bible is open, and rerender the open Visual Bible with the refreshed records. Stored image paths are not removed by Generate or Lock.

v4.1.7 shows each signed-in user's daily generated/used count and effective remaining allowance in the project sidebar, below the shot generator, and inside AI Visual Bible. The remaining number respects both the personal allowance and the shared app pool. Admins see their own audited generation count plus **Unlimited** remaining because their support generations bypass both pools. Counts refresh after every generation and whenever the tab becomes active.

v4.1.8 completes the Supabase Forgot Password flow. The app now recognizes the `PASSWORD_RECOVERY` auth event, opens a dedicated new-password screen, validates password confirmation, updates the authenticated recovery user through Supabase, removes auth tokens from the address bar, signs out the temporary recovery session, and returns the user to Sign In. Expired or already-used links show a clear error instead of an empty app URL.

v4.2.0 adds a persistent Persian/English language switch, a complete RTL Persian interface, localized runtime notices and dialogs, and Calibri typography in both languages. Canonical database values remain English so existing projects, Workers AI prompts and exports stay compatible. The mobile editor is now a viewport-contained app: Scenes, Shot and Sheet are separate full-height screens, the editor actions live in a compact top-bar menu, bottom navigation switches screens, scrolling stays inside the active screen, and dialogs open full-screen instead of as floating browser windows. The obsolete admin quota-bypass banner sentence was removed.

v4.2.1 fixes shot-image generation on phones. The Generate tap now synchronously captures the visible shot form before the mobile keyboard finishes closing, the button refreshes immediately as shot requirements change, and an incomplete shot produces an adjacent visible explanation instead of a silent disabled tap. Mobile Safari also gets a safe fallback when `createImageBitmap` or WebP canvas encoding is unavailable; the returned PNG/JPEG MIME type and filename are stored correctly. The Generate button uses mobile tap handling and shows an immediate busy state.

v4.3.0 adds a cancellable full-app generation lock, so project settings and shot data cannot change while an AI request is in flight. The Worker now applies every populated shot field—including lens, depth of field, camera height, movement, lighting, performance, props and editorial context—and strictly requests one native full-bleed image in the selected project aspect ratio, with no embedded frames, collage or letterboxing. Account settings now support editable display name, email and username, a database-enforced two-month username cooldown, Persian/English choice and Auto/Mobile/Desktop layout preference. A persistent creator score awards one point for each owned-project shot created and one point for the first AI image on that shot; deletions do not remove points, shared projects do not score, and the account screen shows totals, rank, level progress and today's top creator.

v4.3.1 separates shot-reference selection from generation readiness. Every Visual Bible location and character can now be assigned to a shot even before its reference is ready; an amber status explains whether it needs a reference, a lock, or a style refresh. Generate remains securely blocked until the chosen location and characters have locked references matching the current project style. The generation overlay keeps the rest of the app inert while explicitly keeping Cancel Generation interactive.

v4.3.2 promotes the generation lock to a true top-layer dialog, so it appears above AI Visual Bible as well as the shot editor. Character and location generation now identify the reference type and item name in their progress message. The floating page-language button is removed; language remains available in Account. On mobile, the three-dot editor button gains a clear active color while its four-action menu is open.

## Multi-admin support

- Any number of active `support_admin` and `superadmin` accounts can work concurrently.
- Admin status is resolved in Supabase from the signed-in user's immutable UUID, never from editable frontend state, email or username.
- Admin Center searches users by username, then uses their UUID to list owned and shared projects.
- Admin Center is a dedicated full page, lists all users automatically, and can filter by username or display name.
- Customer projects never appear in an admin's normal Projects dashboard. An admin receives temporary access only to the one project explicitly opened in Support Mode, and that access expires after eight hours or when Support Mode is closed.
- Opening a project shows a persistent **ADMIN SUPPORT MODE** banner and grants full project, scene, shot, media, Visual Bible, lighting, chat and member-management access.
- Admins can create collaboration links and permanently delete a project after confirmation.
- App-level user and shared AI quotas are bypassed for admins, so support generations do not consume customer allowance. Cloudflare account limits and billing still apply.
- Every support open/close, admin-team change, AI reservation and row mutation is written to `storyboard_admin_audit_log` and recent activity appears in Admin Center.
- `support_admin` can support all users. `superadmin` can additionally add, reactivate, change or remove other admins. The final active superadmin cannot be removed.
- No Supabase secret/service-role key is added to the browser, Worker or repository.

## What is implemented

- **Generate Storyboard** on every shot.
- A generation lock freezes the rest of the app and exposes one **Cancel Generation** action until the request finishes or is canceled.
- Strict one-image, full-canvas output at the project's exact orientation and aspect ratio; no contact sheet, inset image, collage, letterbox or pillarbox.
- Every populated shot field is sent as controlled visual/narrative context, including lens and depth of field.
- Project-level **AI Visual Bible** for recurring characters and locations.
- Generate a first reference with AI or upload an existing reference.
- Explicit review + **Lock** step before a reference can be used by shots.
- A lock records the current project Storyboard Style; changing that style invalidates old locks until the references are reviewed/regenerated and locked again.
- Each shot selects exactly one locked project location and up to three locked recurring characters.
- The server builds the prompt from the project style, scene, shot fields and locked references. It does not accept an arbitrary final prompt from the browser.
- Cloudflare Workers AI model: `@cf/black-forest-labs/flux-2-klein-4b`.
- Supabase JWT validation and existing RLS permissions; no service-role key is used.
- Atomic quota: 20 attempts per user per UTC day and 70 attempts across the app per UTC day. Edit the two constants inside `reserve_ai_generation` if usage testing supports a different limit.
- Visible daily AI usage: generated/used and remaining counters appear in all generation areas and reset at 00:00 UTC.
- Final shot images are resized to at most 1024 px; Visual Bible references are resized to at most 496 px for FLUX compatibility. They are stored as WebP when the browser supports WebP canvas encoding, with a matching PNG/JPEG fallback on mobile browsers. Only the selected shot/reference image remains; a replaced image is deleted after the new one is safely linked.
- Storyboard Sheet automatically uses the stored shot image and lazy-loads sheet frames.
- Project duplication copies/remaps Visual Bible references and shot links. Project deletion removes shot and Visual Bible media.
- Editable account profile with email-confirmation support and a two-month username cooldown enforced in Supabase.
- Account language and Auto/Mobile/Desktop layout preference.
- Durable creator points, all-user rank, daily leader and motivational level progress. Deleted shots retain their historical points; shared-project work is excluded.

## Data flow

1. The signed-in browser sends the current shot IDs and whitelisted shot data to `/api/ai/generate` with its Supabase access token.
2. `worker.js` verifies that token with Supabase, re-reads the project/scene/locked Visual Bible records through the same user's RLS access, and atomically reserves quota.
3. The Worker calls Cloudflare Workers AI with location first, followed by the selected character references.
4. The Worker returns image bytes to the browser. The browser optimizes them to WebP (or a compatible mobile fallback) and uploads them to the existing private `storyboards` bucket.
5. Only `shots.image_path` plus small generation metadata is stored in Postgres. The Storyboard Sheet reads the same signed image URL.
6. After a generated image and its prompt hash are safely saved, Supabase records the shot's one-time AI creator point when the signed-in user owns the project.

## Deployment order — IMPORTANT

**Updating from v4.3.1 to v4.3.2:** no SQL is required. Replace the GitHub files, wait for Cloudflare deployment, and hard-refresh. The page should load `i18n.js?v=432`, `app.js?v=432` and `styles.css?v=432`.

**Updating from v4.3.0 to v4.3.1:** no SQL is required. Replace the GitHub files, wait for Cloudflare deployment, and hard-refresh.

**Updating from v4.2.1 to v4.3.2:** run the new `supabase-v4.3-account-score.sql` query once, replace the GitHub files, wait for Cloudflare deployment, and hard-refresh. Do not delete any earlier query.

**Updating from v4.1.7 or newer:** keep all existing SQL queries, then run only `supabase-v4.3-account-score.sql` before deploying v4.3.2.

**Updating from v4.1.3, v4.1.4, v4.1.5 or v4.1.6:** first run `supabase-v4.1.7-ai-usage-status.sql`, then run `supabase-v4.3-account-score.sql`, replace the GitHub files, wait for Cloudflare deployment, and hard-refresh.

1. In Supabase, open your Storyboard project, then open **SQL Editor** and click **New query**.
2. Name the new query exactly **Storyboard v4.3 - Account & Creator Score** and keep **Save query enabled**.
3. Paste the complete contents of `supabase-v4.3-account-score.sql`, click **Run**, and wait for **Success. No rows returned**. It is safe to run again and does not delete profile or score data.
4. **Existing v4.1.1/v4.1.2 installation:** first run `supabase-v4.1.3-admin-users-fix.sql`, then `supabase-v4.1.7-ai-usage-status.sql`, and finally `supabase-v4.3-account-score.sql`.
5. **Fresh installation:** run `supabase-v4.0-ai.sql`, then `supabase-v4.1-admin.sql`, then `supabase-v4.1.3-admin-users-fix.sql`, then `supabase-v4.1.7-ai-usage-status.sql`, and finally `supabase-v4.3-account-score.sql` in that order.
6. Only on a fresh installation, replace the placeholder with your actual Storyboard username and run this one-time bootstrap command:

   ```sql
   select public.storyboard_grant_first_superadmin('YOUR_APP_USERNAME');
   ```

7. Sign out and back in. **Admin Center** will appear on your Projects dashboard. It opens as a separate page with all users, search, project support access, the admin team and the audit log.
8. **GitHub:** replace the repository root with the files in this package. Keep `worker.js`, `wrangler.toml` and `.assetsignore` in the root.
9. **Cloudflare build/deploy command:** use `npx wrangler deploy` (do not keep the old assets-only command). `wrangler.toml` binds both static assets and Workers AI.
10. If the Cloudflare Worker service is not named `storyboard`, change only the `name` field in `wrangler.toml` before deploying.
11. Open a cloud project, create one location and any recurring characters in **AI Visual Bible**, generate/upload each reference, review it, and press **Lock**.
12. In a shot, choose the locked location, choose the relevant locked characters, complete the shot description, and press **Generate Storyboard**.

For password recovery, Supabase **Authentication → URL Configuration** should use `https://storyboard.mak9271.workers.dev` as the Site URL and include `https://storyboard.mak9271.workers.dev/` in Redirect URLs. After deploying, request a fresh reset email because an older reset link may already be consumed or expired.

No Cloudflare API token, account ID, Supabase password or service-role key belongs in the repository. The Supabase publishable key in `config.js` / `wrangler.toml` is intentionally public and every data operation is still protected by JWT + RLS.

## Validation

```bash
npm install
npm run check
npx wrangler deploy --dry-run
```

The automated checks cover HTML/JavaScript wiring, Persian/English value safety, RTL/mobile full-screen navigation, forced Mobile/Desktop preferences, cancellable generation locking, mobile form capture and image-codec fallback, strict single-frame prompts with complete shot fields, editable accounts, username cooldown enforcement, durable score events and ranking, removal of obsolete quota copy, admin UI/RPC wiring, password recovery, UUID validation, authentication guard behavior, locked-reference multipart assembly and Cloudflare deploy configuration.

## Current v4 limits

- Reference-guided generation materially improves continuity but generative models cannot promise pixel-identical results in every pose.
- A shot supports one required location and up to three recurring character references. Background extras can still be described in shot text, but should not be named as recurring characters.
- AI generation is cloud-only and requires the existing project `media` permission. Offline mode continues to support manual images.
- Run a 15–20 shot pilot with the actual cast/location descriptions before increasing quotas or changing the model.

---

# Storyboard Shot Builder v3.9.1 — Scene Delete Fix

Built directly from the deployed v3.9 GitHub package.

Changes:
- The **− button beside the expand/collapse control** now deletes the currently selected scene instead of collapsing scenes.
- Its tooltip is now **Delete selected scene**.
- The existing **↕ button** remains the expand/collapse-all control.
- Scene deletion always asks for confirmation and names the scene plus the number of shots that will be deleted.
- The existing **Delete Scene** button in Scene Settings uses the same confirmation flow.
- No Supabase SQL changes are required.
- No Edge Function changes are required.

# Storyboard Shot Builder v3.9 — Security & Collaboration Hardening

Base: v3.8.3 Camera Geometry.

## What changed
- Supabase JS is pinned to 2.116.0 instead of the floating `@2` CDN tag.
- CSP added for the Storyboard/Supabase origins used by this app.
- Member add/update/remove now uses secure server RPCs instead of direct table writes.
- Invite creation now uses a secure RPC and new invites expire after 7 days.
- Core Projects / Scenes / Shots RLS is re-asserted.
- Storage remains private and requires the `media` permission for writes.
- Scene and Shot editing now use version checks to detect simultaneous-edit conflicts.
- Realtime Presence shows when another collaborator is editing the same Shot.
- Signed storyboard image URLs now last 1 hour instead of 7 days and refresh automatically every 45 minutes.
- Username login Edge Function includes DB-backed rate limiting and generic invalid-credentials errors.
- Lighting Diagram / Camera View features from v3.8.3 are preserved.

## Deployment order — IMPORTANT
Do these in this order so the current app does not call RPCs before they exist.

1. Supabase SQL Editor:
   Run `supabase-v3.9-security-hardening.sql`.
2. Supabase Edge Functions:
   Replace the existing `username-login` function with:
   `supabase/functions/username-login/index.ts`
   Deploy it with **Verify JWT OFF**.
3. GitHub:
   Upload/replace the web files from `storyboard-v3.9-github.zip` in the ROOT of `mak9271/Storyboard` (`main` branch).
4. Wait for Cloudflare deploy.
5. Test:
   - Email login
   - Username login
   - Open project
   - Save a shot
   - Add/remove a collaborator
   - Create invite link
   - Upload image
   - Open Lighting Diagram
6. Optional audit:
   Run `supabase-v3.9-audit.sql`. It only reads policy/grant metadata.

## Secrets
Never put `SUPABASE_SERVICE_ROLE_KEY` in GitHub or `config.js`.
The Edge Function reads it from Supabase's server-side environment.
