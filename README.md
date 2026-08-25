# Storyboard Shot Builder v3.5 — Production Management

Clean rebuild from the confirmed v3 connected baseline. AI generation is intentionally not included.

## Project dashboard
- Rename / Delete / Duplicate projects
- Favorite projects
- Persistent drag-and-drop order for owned projects
- Search by project, folder, tags and metadata
- Filters: All, Favorites, Recently Updated, Shared
- Folder / Category and Tags
- Metadata: Director, Writer, Production, Status, Notes

## Scene management
- Collapse / Expand each scene
- Collapse All / Expand All
- Rename and Duplicate
- Move Up / Down
- Automatic scene numbering

## Shot management
- Duplicate
- Internal Copy / Paste
- Move Up / Down
- Delete with automatic contiguous renumbering
- Shot settings are preserved when duplicated/copied
- Storyboard media is copied to a new Storage path when possible

## Preserved v3 features
- Email + username authentication
- Collaboration and permissions
- Storyboard Sheet toggle above the editor
- Custom aspect ratios
- JSON import/export (cloud import creates a new project; images are added manually)
- Supabase Storage manual shot images
- English UI, favicon and creator credit

## Install
1. Run `supabase-v3.5-production-management.sql` once in Supabase SQL Editor.
2. Upload/replace the app files in the root of the GitHub repository.
3. Commit and let Cloudflare deploy.
4. Open the site in a Private/Incognito window for the first test.
