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
