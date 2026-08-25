# Storyboard Shot Builder v3.5 — Production Management

This build intentionally starts from the pre-Roozaneh-image-import v3.2 codebase and does **not** include the temporary GitHub/Raw-URL image patches.

## Added in v3.5
- Project dashboard search and filters (All, Favorites, Recently Updated, Shared)
- Folder/category, tags, project metadata (Director, Writer, Production, Status, Notes)
- Favorite, rename, delete and full project duplication
- Drag-and-drop ordering for owned projects with Supabase `position` persistence
- Scene collapse/expand, Collapse All/Expand All
- Scene rename, duplicate, move up/down, automatic scene renumbering
- Shot duplicate, copy/paste, move up/down
- Automatic contiguous shot renumbering after reorder/delete
- Existing auth, collaboration, JSON import/export, storyboard sheet, custom aspect ratio and media upload preserved

## Database
This build expects the v3.5 patch already applied to `projects`, `scenes`, and `shots` (`position`, `is_favorite`, `folder`, `tags`, `metadata`, `collapsed`).

# Storyboard Shot Builder v3

## New in v3
1. **Storyboard Sheet is a persistent toggle**
   - Opens above the editor, not below it.
   - Stays ON while you continue editing.
   - Active state uses a blue-heavy cyan gradient.
2. **Custom aspect ratio**
   - Choose Custom and enter Width + Height manually.
3. **Scenes**
   - Shots are now nested inside Scenes.
   - Each Scene has number, title and description.
4. **Account architecture**
   - Email/password signup.
   - Username + email stored as separate identity/profile data.
   - Sign in by either Email OR Username (username uses a Supabase Edge Function).
   - Each user sees their own projects plus projects shared with them.
5. **Site icon**
   - Black square, bold white “S”.
   - favicon + Apple touch icons + web manifest.
6. **Collaboration**
   - Add an existing user by username.
   - Create share/invite links.
   - Viewer / Editor / Custom access.
   - Granular access: project settings, scenes, shot details, media, collaborators.
   - Simple Realtime refresh for collaborative changes.
7. **Creator credit**
   - Small `© 2026 Amin Khorsandi` linked to https://aminkhorsandi.com

## Important: Account/collaboration setup
The UI and backend code are included, but cloud accounts will stay in Offline mode until a free Supabase project is connected.

Use the separate `storyboard-v3-supabase-setup.zip`:
- Run `supabase-schema.sql` in Supabase SQL Editor.
- Deploy the `username-login` Edge Function.
- Put the project's public URL and anon/publishable key into `config.js`.

Never put the Supabase service-role key in `config.js`.


## New in v4
- AI Storyboard panel per shot
- Automatic prompt builder for storyboard sketch generation
- Generate single image or 3 variations
- Choose a variation as the final shot frame
- Ready for Supabase Edge Function `generate-storyboard`
