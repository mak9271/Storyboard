# Storyboard Shot Builder v4.1.3 — Admin Users Fix + Persistent Admin Center + Per-shot AI References

Base: **only** `storyboard-v3.9.1-github(1).zip`, as requested. All v3.9.1 editor, collaboration, scene-delete and Lighting Studio behavior is preserved.

v4.1.2 excluded `node_modules` and other repository-only files from Static Assets so Cloudflare does not attempt to upload the 148 MiB `workerd` binary.

v4.1.3 fixes Admin Center RPC return types, lists accounts from `auth.users` even when a profile is incomplete, keeps Admin Center open across tab focus/session events and page reloads, and places each shot's required location plus optional characters beside its primary settings.

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
- Project-level **AI Visual Bible** for recurring characters and locations.
- Generate a first reference with AI or upload an existing reference.
- Explicit review + **Lock** step before a reference can be used by shots.
- A lock records the current project Storyboard Style; changing that style invalidates old locks until the references are reviewed/regenerated and locked again.
- Each shot selects exactly one locked project location and up to three locked recurring characters.
- The server builds the prompt from the project style, scene, shot fields and locked references. It does not accept an arbitrary final prompt from the browser.
- Cloudflare Workers AI model: `@cf/black-forest-labs/flux-2-klein-4b`.
- Supabase JWT validation and existing RLS permissions; no service-role key is used.
- Atomic quota: 20 attempts per user per UTC day and 70 attempts across the app per UTC day. Edit the two constants inside `reserve_ai_generation` if usage testing supports a different limit.
- AI and uploaded images are resized to at most 1024 px and stored as WebP. Only the selected shot image remains; a replaced image is deleted after the new one is safely linked.
- Storyboard Sheet automatically uses the stored shot image and lazy-loads sheet frames.
- Project duplication copies/remaps Visual Bible references and shot links. Project deletion removes shot and Visual Bible media.

## Data flow

1. The signed-in browser sends the current shot IDs and whitelisted shot data to `/api/ai/generate` with its Supabase access token.
2. `worker.js` verifies that token with Supabase, re-reads the project/scene/locked Visual Bible records through the same user's RLS access, and atomically reserves quota.
3. The Worker calls Cloudflare Workers AI with location first, followed by the selected character references.
4. The Worker returns image bytes to the browser. The browser converts them to WebP and uploads them to the existing private `storyboards` bucket.
5. Only `shots.image_path` plus small generation metadata is stored in Postgres. The Storyboard Sheet reads the same signed image URL.

## Deployment order — IMPORTANT

1. **Existing v4.1.1/v4.1.2 installation:** run only `supabase-v4.1.3-admin-users-fix.sql` in Supabase SQL Editor. It is safe to run again and does not remove data.
2. **Fresh installation:** run `supabase-v4.0-ai.sql`, then `supabase-v4.1-admin.sql`, then `supabase-v4.1.3-admin-users-fix.sql` in that order.
3. Only on a fresh installation, replace the placeholder with your actual Storyboard username and run this one-time bootstrap command:

   ```sql
   select public.storyboard_grant_first_superadmin('YOUR_APP_USERNAME');
   ```

4. Sign out and back in. **Admin Center** will appear on your Projects dashboard. It opens as a separate page with all users, search, project support access, the admin team and the audit log.
5. **GitHub:** replace the repository root with the files in this package. Keep `worker.js`, `wrangler.toml` and `.assetsignore` in the root.
6. **Cloudflare build/deploy command:** use `npx wrangler deploy` (do not keep the old assets-only command). `wrangler.toml` binds both static assets and Workers AI.
7. If the Cloudflare Worker service is not named `storyboard`, change only the `name` field in `wrangler.toml` before deploying.
8. Open a cloud project, create one location and any recurring characters in **AI Visual Bible**, generate/upload each reference, review it, and press **Lock**.
9. In a shot, choose the locked location, choose the relevant locked characters, complete the shot description, and press **Generate Storyboard**.

No Cloudflare API token, account ID, Supabase password or service-role key belongs in the repository. The Supabase publishable key in `config.js` / `wrangler.toml` is intentionally public and every data operation is still protected by JWT + RLS.

## Validation

```bash
npm install
npm run check
npx wrangler deploy --dry-run
```

The automated checks cover HTML/JavaScript wiring, admin UI/RPC wiring, admin SQL authorization/audit/quota controls, prompt continuity, aspect sizing, UUID validation, authentication guard behavior, locked-reference multipart assembly and Cloudflare deploy configuration.

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
