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
